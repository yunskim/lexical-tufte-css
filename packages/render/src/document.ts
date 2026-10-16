export type JsonNode={type:string;version:number;children?:JsonNode[];[key:string]:unknown};
export type AssetRef={id:string;src:string;mimeType:string;alt?:string};
export type TufteDocument={schemaVersion:1;id:string;locale:string;title:string;subtitle?:string;lexicalState:{root:JsonNode};assets:AssetRef[]};
export type Diagnostic={code:string;path:string;message:string};
export type ValidationResult={ok:true;document:TufteDocument;diagnostics:Diagnostic[]}|{ok:false;diagnostics:Diagnostic[]};
export const RENDER_PROFILE='p1-v1' as const;
export function isSafeURL(value:unknown,kind:'image'|'link'):value is string{
 if(typeof value!=='string'||!value||/[\u0000-\u0020\u007f\\]/.test(value)||value.startsWith('//'))return false;
 if(value.startsWith('/')||value.startsWith('./')||value.startsWith('../')||(kind==='link'&&value.startsWith('#')))return true;
 try{const u=new URL(value);return (kind==='image'?['http:','https:']:['http:','https:','mailto:','tel:','sms:']).includes(u.protocol);}catch{return false;}
}
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const base=['type','version','children','direction','format','indent','textFormat','textStyle'];
const fields:Record<string,string[]>={
 root:[], 'tufte-section':[], paragraph:[], 'tufte-caption':[],
 text:['detail','format','mode','style','text'],linebreak:[],
 link:['url','rel','target','title'], 'tufte-note':['noteId','kind'],
 'tufte-inline-image':['src','alt'], 'tufte-figure':['width'], 'tufte-table-layout':['layout'],
 table:['colWidths','rowStriping','frozenColumnCount','frozenRowCount'],tablerow:['height'],
 tablecell:['colSpan','rowSpan','headerState','backgroundColor','verticalAlign','width'],
};
const phrasing=['text','linebreak','link','tufte-inline-image'];
const children:Record<string,string[]>={
 root:['tufte-section'], 'tufte-section':['paragraph','tufte-figure','tufte-table-layout'],
 paragraph:[...phrasing,'tufte-note'],link:['text','linebreak','tufte-inline-image'],
 'tufte-note':phrasing,'tufte-caption':phrasing,'tufte-figure':['tufte-inline-image','tufte-caption'],
 'tufte-table-layout':['table'],table:['tablerow'],tablerow:['tablecell'],tablecell:['paragraph'],
};
const identifier=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
export function validateDocument(input:unknown):ValidationResult{
 const diagnostics:Diagnostic[]=[];
 const add=(code:string,path:string,message:string)=>{if(diagnostics.length<100)diagnostics.push({code,path,message});};
 if(!object(input))return {ok:false,diagnostics:[{code:'INVALID_DOCUMENT',path:'$',message:'Expected document object'}]};
 for(const key of Object.keys(input))if(!['schemaVersion','id','locale','title','subtitle','lexicalState','assets'].includes(key))add('UNKNOWN_FIELD',`$.${key}`,'Unrecognized envelope field');
 if(input.schemaVersion!==1)add('UNSUPPORTED_VERSION','$.schemaVersion','Only schemaVersion 1 is supported');
 if(!identifier(input.id))add('INVALID_ID','$.id','Invalid document identifier');
 if(typeof input.locale!=='string'||!input.locale||input.locale.length>64)add('INVALID_LOCALE','$.locale','Expected locale');
 if(typeof input.title!=='string'||!input.title.trim()||input.title.length>1000)add('INVALID_TITLE','$.title','Expected nonempty title up to 1000 characters');
 if(input.subtitle!==undefined&&(typeof input.subtitle!=='string'||input.subtitle.length>2000))add('INVALID_SUBTITLE','$.subtitle','Invalid subtitle');
 if(!Array.isArray(input.assets))add('INVALID_ASSETS','$.assets','Expected asset list');
 else{
  const ids=new Set<string>();
  for(const [i,a] of input.assets.entries()){
   const path=`$.assets[${i}]`;
   if(!object(a)){add('INVALID_ASSET',path,'Expected asset object');continue;}
   if(!identifier(a.id)||ids.has(String(a.id)))add('INVALID_ASSET_ID',path+'.id','Invalid or duplicate asset id');ids.add(String(a.id));
   if(!isSafeURL(a.src,'image'))add('UNSAFE_URL',path+'.src','Unsupported asset URL');
   if(typeof a.mimeType!=='string'||!/^image\/[a-zA-Z0-9.+-]+$/.test(a.mimeType))add('INVALID_MIME',path+'.mimeType','Expected image MIME metadata');
   if(a.alt!==undefined&&typeof a.alt!=='string')add('INVALID_ALT',path+'.alt','Expected alt text');
   for(const key of Object.keys(a))if(!['id','src','mimeType','alt'].includes(key))add('UNKNOWN_FIELD',path+'.'+key,'Unrecognized asset metadata');
  }
 }
 const seen=new WeakSet<object>(),notes=new Set<string>();let count=0,textLength=0;
 function visit(raw:unknown,path:string,parent:string|undefined,depth:number,inNote:boolean){
  if(depth>64||++count>10000){add('LIMIT_EXCEEDED',path,'Document depth/node limit exceeded');return;}
  if(!object(raw)){add('INVALID_NODE',path,'Expected node object');return;}
  if(seen.has(raw)){add('CYCLIC_OR_SHARED_NODE',path,'Node object is cyclic or reused');return;}seen.add(raw);
  if(typeof raw.type!=='string'||!Object.hasOwn(fields,raw.type)){add('UNKNOWN_NODE',path+'.type','Node is not supported by p1-v1');return;}
  const type=raw.type;
  if(raw.version!==1)add('UNSUPPORTED_NODE_VERSION',path+'.version','Node version must be 1');
  if(parent===undefined?type!=='root':!children[parent]?.includes(type))add('INVALID_CHILD',path,`${type} is not allowed under ${parent??'document'}`);
  const element=Object.hasOwn(children,type);
  const allowed=new Set(element?[...base,...fields[type]!]:['type','version',...fields[type]!]);
  for(const key of Object.keys(raw))if(!allowed.has(key))add('UNKNOWN_FIELD',path+'.'+key,'Unsupported node field');
  if(element){
   if(raw.direction!==undefined&&raw.direction!==null&&!['ltr','rtl'].includes(String(raw.direction)))add('UNSUPPORTED_DIRECTION',path+'.direction','Invalid direction');
   if(raw.format!==undefined&&!['','left','center','right','justify','start','end'].includes(String(raw.format)))add('UNSUPPORTED_FORMAT',path+'.format','Unsupported element alignment');
   if(raw.indent!==undefined&&raw.indent!==0)add('UNSUPPORTED_PROPERTY',path+'.indent','Indent rendering is deferred');
   if(raw.textStyle!==undefined&&raw.textStyle!=='')add('UNSUPPORTED_STYLE',path+'.textStyle','Arbitrary CSS is not supported');
   if(raw.textFormat!==undefined&&(!Number.isInteger(raw.textFormat)||Number(raw.textFormat)<0||Number(raw.textFormat)>255))add('UNSUPPORTED_FORMAT',path+'.textFormat','Unsupported cached text format');
   if(!Array.isArray(raw.children)){add('INVALID_CHILDREN',path+'.children','Expected children array');return;}
   if(['root','tufte-section','tufte-note','table','tablerow','tablecell'].includes(type)&&raw.children.length===0)add('EMPTY_NODE',path,'This node cannot be empty');
   if(type==='tufte-table-layout'&&(raw.children.length!==1||!object(raw.children[0])||raw.children[0].type!=='table'))add('INVALID_TABLE_LAYOUT',path,'Expected exactly one table');
   if(type==='tufte-figure'){
    const types=raw.children.map(n=>object(n)?n.type:undefined);
    if(types[0]!=='tufte-inline-image'||types.filter(x=>x==='tufte-inline-image').length!==1||types.filter(x=>x==='tufte-caption').length>1||types.length>2)add('INVALID_FIGURE',path,'Expected image followed by at most one caption');
   }
   for(const [i,n] of raw.children.entries())visit(n,`${path}.children[${i}]`,type,depth+1,inNote||type==='tufte-note');
  }
  if(type==='tufte-table-layout'&&raw.layout!=='scroll'&&((raw.format!==undefined&&raw.format!=='')||(raw.direction!==undefined&&raw.direction!==null)))add('UNSUPPORTED_PROPERTY',path,'Unwrapped table layout attributes must be defaults');
  if(type==='text'){
   if(typeof raw.text!=='string')add('INVALID_TEXT',path+'.text','Expected text');else textLength+=raw.text.length;
   if(!Number.isInteger(raw.format)||Number(raw.format)<0||Number(raw.format)>255)add('UNSUPPORTED_FORMAT',path+'.format','Unsupported text format flags');
   if(raw.style!==undefined&&raw.style!=='')add('UNSUPPORTED_STYLE',path+'.style','Arbitrary CSS is not supported');
   if(raw.mode!==undefined&&raw.mode!=='normal')add('UNSUPPORTED_PROPERTY',path+'.mode','Only normal text is supported');
   if(raw.detail!==undefined&&raw.detail!==0&&raw.detail!==2)add('UNSUPPORTED_PROPERTY',path+'.detail','Unsupported text detail');
  }
  if(type==='link'){
   if(!isSafeURL(raw.url,'link'))add('UNSAFE_URL',path+'.url','Unsupported link URL');
   if(raw.target!==undefined&&raw.target!==null&&!['_blank','_self'].includes(String(raw.target)))add('UNSUPPORTED_TARGET',path+'.target','Unsupported link target');
   for(const key of ['rel','title'])if(raw[key]!==undefined&&raw[key]!==null&&typeof raw[key]!=='string')add('INVALID_LINK',path+'.'+key,'Expected string or null');
  }
  if(type==='tufte-inline-image'){
   if(!isSafeURL(raw.src,'image'))add('UNSAFE_URL',path+'.src','Unsupported image URL');
   if(typeof raw.alt!=='string')add('INVALID_ALT',path+'.alt','Image alt text is required');
  }
  if(type==='tufte-note'){
   if(inNote)add('NESTED_NOTE',path,'Nested notes are not supported');
   if(!identifier(raw.noteId)||notes.has(String(raw.noteId)))add('INVALID_NOTE_ID',path+'.noteId','Invalid or duplicate note id');notes.add(String(raw.noteId));
   if(!['sidenote','marginnote'].includes(String(raw.kind)))add('INVALID_NOTE_KIND',path+'.kind','Unsupported note kind');
  }
  if(type==='tufte-figure'&&!['body','fullwidth'].includes(String(raw.width)))add('INVALID_WIDTH',path+'.width','Unsupported figure width');
  if(type==='tufte-table-layout'&&!['body','fullwidth','scroll'].includes(String(raw.layout)))add('INVALID_LAYOUT',path+'.layout','Unsupported table layout');
  const defaults:Record<string,unknown> = type==='table'?{rowStriping:false,frozenColumnCount:0,frozenRowCount:0}:type==='tablecell'?{colSpan:1,rowSpan:1,backgroundColor:null}:{};
  for(const [key,value]of Object.entries(defaults))if(raw[key]!==undefined&&raw[key]!==value)add('UNSUPPORTED_PROPERTY',path+'.'+key,'Nondefault table property is deferred');
  for(const key of type==='table'?['colWidths']:type==='tablerow'?['height']:type==='tablecell'?['width','verticalAlign']:[])if(raw[key]!==undefined)add('UNSUPPORTED_PROPERTY',path+'.'+key,'Explicit table sizing/alignment is deferred');
  if(type==='tablecell'&&(!Number.isInteger(raw.headerState)||Number(raw.headerState)<0||Number(raw.headerState)>3))add('INVALID_HEADER_STATE',path+'.headerState','Expected header state 0..3');
 }
 if(!object(input.lexicalState)||Object.keys(input.lexicalState).some(k=>k!=='root'))add('INVALID_STATE','$.lexicalState','Expected state containing only root');
 else visit(input.lexicalState.root,'$.lexicalState.root',undefined,0,false);
 if(textLength>2_000_000)add('LIMIT_EXCEEDED','$.lexicalState','Text budget exceeded');
 return diagnostics.length?{ok:false,diagnostics}:{ok:true,document:input as TufteDocument,diagnostics};
}

/** JSON is the only canonical import format in this prototype. */
export function parseDocument(source:string):ValidationResult{
 if(typeof source!=='string'||source.length>5000000)return {ok:false,diagnostics:[{code:'INVALID_JSON',path:'$',message:'Expected JSON string of at most 5000000 characters'}]};
 let input:unknown;try{input=JSON.parse(source);}catch{return {ok:false,diagnostics:[{code:'INVALID_JSON',path:'$',message:'Invalid JSON document'}]};}
 return validateDocument(input);
}
