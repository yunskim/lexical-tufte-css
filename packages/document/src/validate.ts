import type {AssetRef,Diagnostic,TufteDocument,ValidationResult} from './types.js';
import {DOCUMENT_LIMITS as L,NODE_SCHEMA,isIdentifier,isRecord,isSafeURL,isEmbedURL} from './schema.js';
const base=['type','version','children','direction','format','indent','textFormat','textStyle'];
const integer=(x:unknown,min:number,max:number)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max;
const enumeration=(x:unknown,values:readonly unknown[])=>values.includes(x);
const nonempty=(x:unknown,max:number)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const plain=(x:unknown):x is Record<string,unknown>=>isRecord(x)&&Object.values(Object.getOwnPropertyDescriptors(x)).every(d=>'value'in d)&&Object.getOwnPropertySymbols(x).length===0;
export function validateDocument(input:unknown):ValidationResult{
 const diagnostics:Diagnostic[]=[];
 const add=(code:string,path:string,message:string)=>{if(diagnostics.length<L.diagnostics)diagnostics.push({code,path,message});};
 const unknownFields=(obj:Record<string,unknown>,keys:readonly string[],path:string)=>{for(const key of Object.keys(obj))if(!keys.includes(key))add('UNKNOWN_FIELD',`${path}.${key}`,'Unrecognized field');};
 if(!plain(input))return {ok:false,diagnostics:[{code:'INVALID_DOCUMENT',path:'$',message:'Expected plain document object without accessors'}]};
 unknownFields(input,['schemaVersion','id','locale','title','subtitle','lexicalState','assets'],'$');
 if(input.schemaVersion!==1)add('UNSUPPORTED_VERSION','$.schemaVersion','Only schemaVersion 1 is supported');
 if(!isIdentifier(input.id))add('INVALID_ID','$.id','Invalid document identifier');
 let locale=false;if(typeof input.locale==='string'&&input.locale.length<=64)try{locale=Intl.getCanonicalLocales(input.locale).length===1;}catch{}
 if(!locale)add('INVALID_LOCALE','$.locale','Expected BCP 47 locale');
 if(!nonempty(input.title,1000))add('INVALID_TITLE','$.title','Expected title up to 1000 characters');
 if(input.subtitle!==undefined&&(typeof input.subtitle!=='string'||input.subtitle.length>2000))add('INVALID_SUBTITLE','$.subtitle','Invalid subtitle');
 const assets=new Map<string,AssetRef>();
 if(!Array.isArray(input.assets)||input.assets.length>L.assets)add('INVALID_ASSETS','$.assets','Expected at most 1000 assets');
 else for(const [i,a] of input.assets.entries()){
  const p=`$.assets[${i}]`;
  if(!plain(a)){add('INVALID_ASSET',p,'Expected plain asset object');continue;}
  unknownFields(a,['id','src','mimeType','alt','width','height','byteLength','sha256'],p);
  if(!isIdentifier(a.id)||assets.has(String(a.id)))add('INVALID_ASSET_ID',p+'.id','Invalid or duplicate asset id');
  if(!isSafeURL(a.src,'image'))add('UNSAFE_URL',p+'.src','Unsupported asset URL');
  if(typeof a.mimeType!=='string'||!/^image\/[a-zA-Z0-9.+-]+$/.test(a.mimeType))add('INVALID_MIME',p+'.mimeType','Expected image MIME metadata');
  if(a.alt!==undefined&&typeof a.alt!=='string')add('INVALID_ALT',p+'.alt','Expected alt string');
  for(const key of ['width','height','byteLength'])if(a[key]!==undefined&&!integer(a[key],1,Number.MAX_SAFE_INTEGER))add('INVALID_ASSET_PROPERTY',p+'.'+key,'Expected positive safe integer');
  if(a.sha256!==undefined&&(typeof a.sha256!=='string'||! /^[0-9a-f]{64}$/.test(a.sha256)))add('INVALID_CHECKSUM',p+'.sha256','Expected lowercase SHA-256 hex');
  if(isIdentifier(a.id))assets.set(a.id,a as AssetRef);
 }
 const seen=new WeakSet<object>(),notes=new Set<string>();let count=0,textLength=0,exhausted=false;
 function visit(raw:unknown,path:string,parent:string|undefined,depth:number,inNote:boolean,inLink:boolean){
  if(exhausted)return;
  if(depth>L.depth||++count>L.nodes){add('LIMIT_EXCEEDED',path,'Depth/node budget exceeded');exhausted=true;return;}
  if(!plain(raw)){add('INVALID_NODE',path,'Expected plain node object');return;}
  if(seen.has(raw)){add('CYCLIC_OR_SHARED_NODE',path,'Node object is cyclic or reused');return;}seen.add(raw);
  if(typeof raw.type!=='string'||!Object.hasOwn(NODE_SCHEMA,raw.type)){add('UNKNOWN_NODE',path+'.type','Unknown node type');return;}
  const type=raw.type,spec=NODE_SCHEMA[type]!,element=!!spec.children;
  if(raw.version!==1)add('UNSUPPORTED_NODE_VERSION',path+'.version','Node version must be 1');
  if(parent===undefined?type!=='root':!NODE_SCHEMA[parent]?.children?.includes(type))add('INVALID_CHILD',path,`${type} is not allowed under ${parent??'document'}`);
  unknownFields(raw,element?[...base,...spec.fields]:['type','version',...spec.fields],path);
  if(element){
   if(raw.direction!==undefined&&!enumeration(raw.direction,[null,'ltr','rtl']))add('INVALID_DIRECTION',path+'.direction','Invalid direction');
   if(raw.format!==undefined&&!enumeration(raw.format,['','left','center','right','justify','start','end']))add('INVALID_FORMAT',path+'.format','Invalid alignment');
   if(raw.indent!==undefined&&!integer(raw.indent,0,20))add('INVALID_INDENT',path+'.indent','Expected indent 0..20');
   if(raw.textStyle!==undefined&&raw.textStyle!=='')add('UNSUPPORTED_STYLE',path+'.textStyle','Arbitrary CSS is not allowed');
   if(raw.textFormat!==undefined&&!integer(raw.textFormat,0,255))add('INVALID_FORMAT',path+'.textFormat','Unsupported cached text format');
   if(!Array.isArray(raw.children)){add('INVALID_CHILDREN',path+'.children','Expected children array');return;}
   if(!['paragraph','heading','link','tufte-caption','tufte-attribution','tufte-cite','tufte-section-footer','tufte-code','listitem'].includes(type)&&raw.children.length===0)add('EMPTY_NODE',path,'Node cannot be empty');
   if(type==='tufte-table-layout'&&(raw.children.length!==1||!plain(raw.children[0])||raw.children[0].type!=='table'))add('INVALID_TABLE_LAYOUT',path,'Expected exactly one table');
   if(type==='tufte-figure'){
    const types=raw.children.map(n=>plain(n)?n.type:null);
    const images=types.filter(t=>t==='tufte-inline-image'||t==='tufte-imagequilt');
    const captions=types.filter(t=>t==='tufte-caption');
    if(images.length!==1||captions.length>1||types.indexOf('tufte-caption')!==-1&&types.indexOf('tufte-caption')<types.findIndex(t=>t==='tufte-inline-image'||t==='tufte-imagequilt'))
     add('INVALID_FIGURE',path,'Expected exactly one image, at most one caption after it, and optional margin notes');
    for(const child of raw.children)if(plain(child)&&child.type==='tufte-sidenote')add('INVALID_FIGURE_NOTE',path,'Direct figure notes must be margin notes');
   }
   if(type==='tufte-definition-list'){
    let hasTerm=false,hasDefinition=false;
    for(const child of raw.children){const t=plain(child)?child.type:null;if(t==='tufte-term'){if(hasDefinition){hasTerm=false;hasDefinition=false;}hasTerm=true;}else if(t==='tufte-definition'){if(!hasTerm)add('INVALID_DEFINITION_LIST',path,'Definition needs preceding term');hasDefinition=true;}}
    if(!hasDefinition)add('INVALID_DEFINITION_LIST',path,'Final term group needs a definition');
   }
   if(type==='quote'){
    const attributions=raw.children.map((n,i)=>plain(n)&&n.type==='tufte-attribution'?i:-1).filter(i=>i>=0);
    if(attributions.length>1||(attributions.length===1&&attributions[0]!==raw.children.length-1)||!raw.children.some(n=>plain(n)&&n.type!=='tufte-attribution'))add('INVALID_QUOTE',path,'Quote needs content then optional attribution');
   }
   for(const [i,n]of raw.children.entries()){if(exhausted)break;visit(n,`${path}.children[${i}]`,type,depth+1,inNote||['tufte-sidenote','tufte-marginnote'].includes(type),inLink||type==='link');}
  }
  if(['text','tab','code-highlight'].includes(type)){
   if(typeof raw.text!=='string')add('INVALID_TEXT',path+'.text','Expected text');else textLength+=raw.text.length;
   if(textLength>L.textCharacters){add('LIMIT_EXCEEDED',path,'Text budget exceeded');exhausted=true;}
   if(!integer(raw.format,0,255)||((Number(raw.format)&96)===96))add('INVALID_FORMAT',path+'.format','Invalid text flags or conflicting sub/sup');
   if(raw.style!==undefined&&raw.style!=='')add('UNSUPPORTED_STYLE',path+'.style','Arbitrary CSS is not allowed');
   if(raw.mode!==undefined&&raw.mode!=='normal')add('UNSUPPORTED_PROPERTY',path+'.mode','Only normal text supported');
   if(raw.detail!==undefined&&!enumeration(raw.detail,[0,2]))add('INVALID_DETAIL',path+'.detail','Invalid text detail');
   if(type==='tab'&&raw.text!=='\t')add('INVALID_TAB',path+'.text','Tab node must contain one tab');
   if(type==='code-highlight'&&raw.highlightType!==null&&(typeof raw.highlightType!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(raw.highlightType)))add('INVALID_HIGHLIGHT',path+'.highlightType','Invalid highlight token');
  }
  if(type==='heading'&&!enumeration(raw.tag,['h2','h3']))add('INVALID_HEADING',path+'.tag','Only h2/h3 supported');
  if(type==='heading'&&raw.id!==undefined&&!isIdentifier(raw.id))add('INVALID_HEADING_ID',path+'.id','Heading ID must be a safe identifier');
  if(type==='list'&&(!enumeration(raw.listType,['bullet','number'])||raw.tag!==(raw.listType==='bullet'?'ul':'ol')||!integer(raw.start,1,Number.MAX_SAFE_INTEGER)))add('INVALID_LIST',path,'Invalid list kind/tag/start');
  if(type==='listitem'&&raw.checked!==undefined)add('UNSUPPORTED_PROPERTY',path+'.checked','Checklist semantics are outside this schema');
  if(type==='listitem'&&!integer(raw.value,1,Number.MAX_SAFE_INTEGER))add('INVALID_LIST_VALUE',path+'.value','Invalid list value');
  if(type==='tufte-span'&&!enumeration(raw.kind,['sans','newthought','numeral','danger']))add('INVALID_SPAN_KIND',path+'.kind','Unsupported Tufte inline class');
  if(type==='link'){
   if(inLink)add('NESTED_LINK',path,'Links cannot be nested through inline wrappers');
   if(!isSafeURL(raw.url,'link'))add('UNSAFE_URL',path+'.url','Unsupported link URL');
   if(raw.target!==undefined&&!enumeration(raw.target,[null,'_blank','_self']))add('INVALID_TARGET',path+'.target','Invalid link target');
   for(const key of ['rel','title'])if(raw[key]!==undefined&&raw[key]!==null&&typeof raw[key]!=='string')add('INVALID_LINK',path+'.'+key,'Expected string or null');
  }
  if(type==='tufte-inline-image'||type==='tufte-imagequilt'){
   if(!isSafeURL(raw.src,'image'))add('UNSAFE_URL',path+'.src','Unsupported image URL');
   if(typeof raw.alt!=='string')add('INVALID_ALT',path+'.alt','Image alt string required');
   for(const key of ['width','height'])if(raw[key]!==undefined&&!integer(raw[key],1,Number.MAX_SAFE_INTEGER))add('INVALID_IMAGE_SIZE',path+'.'+key,'Expected positive integer');
   if(type==='tufte-imagequilt'&&(raw.width===undefined||raw.height===undefined))add('INVALID_IMAGE_SIZE',path,'ImageQuilt requires intrinsic dimensions');
   if(raw.assetId!==undefined){
    const a=typeof raw.assetId==='string'?assets.get(raw.assetId):undefined;
    if(!a)add('MISSING_ASSET',path+'.assetId','Asset reference does not exist');
    else if(raw.src!==a.src||(['width','height'] as const).some(k=>raw[k]!==undefined&&a[k]!==undefined&&raw[k]!==a[k]))add('ASSET_MISMATCH',path,'Image URL/dimensions conflict with asset metadata');
   }
  }
  if(['tufte-sidenote','tufte-marginnote'].includes(type)){
   if(inNote)add('NESTED_NOTE',path,'Nested notes are not supported');
   if(!isIdentifier(raw.noteId)||notes.has(String(raw.noteId)))add('INVALID_NOTE_ID',path+'.noteId','Invalid or duplicate note id');notes.add(String(raw.noteId));
  }
  if(['tufte-figure','tufte-code','tufte-embed'].includes(type)&&!enumeration(raw.width,['body','fullwidth']))add('INVALID_WIDTH',path+'.width','Invalid width');
  if(type==='tufte-table-layout'&&!enumeration(raw.layout,['body','fullwidth','scroll']))add('INVALID_LAYOUT',path+'.layout','Invalid table layout');
  if(type==='table'){
   if(raw.colWidths!==undefined&&(!Array.isArray(raw.colWidths)||raw.colWidths.length===0||raw.colWidths.some(w=>!integer(w,1,Number.MAX_SAFE_INTEGER))))add('INVALID_COLUMN_WIDTHS',path+'.colWidths','Expected positive column widths');
   if(raw.rowStriping!==undefined&&typeof raw.rowStriping!=='boolean')add('INVALID_TABLE_PROPERTY',path+'.rowStriping','Expected boolean');
   for(const key of ['frozenColumnCount','frozenRowCount'])if(raw[key]!==undefined&&!integer(raw[key],0,10000))add('INVALID_TABLE_PROPERTY',path+'.'+key,'Expected nonnegative integer');
   // Spanned cells remain outside v1; ensure a rectangular grid without guessing repairs.
   if(Array.isArray(raw.children)){const sizes=raw.children.filter(plain).map(r=>Array.isArray(r.children)?r.children.length:0);if(new Set(sizes).size>1)add('RAGGED_TABLE',path,'Rows must have equal cell counts');if(Array.isArray(raw.colWidths)&&sizes[0]!==raw.colWidths.length)add('COLUMN_COUNT_MISMATCH',path+'.colWidths','Column widths must match table grid');}
  }
  for(const key of type==='tablerow'?['height']:type==='tablecell'?['width']:[])if(raw[key]!==undefined&&!integer(raw[key],1,Number.MAX_SAFE_INTEGER))add('INVALID_TABLE_SIZE',path+'.'+key,'Expected positive integer');
  if(type==='tablecell'){
   if(!integer(raw.headerState,0,3))add('INVALID_HEADER_STATE',path+'.headerState','Expected header state 0..3');
   for(const key of ['colSpan','rowSpan'])if(raw[key]!==undefined&&raw[key]!==1)add('UNSUPPORTED_PROPERTY',path+'.'+key,'Spanned cells are deferred');
   if(raw.backgroundColor!==undefined&&raw.backgroundColor!==null)add('UNSUPPORTED_STYLE',path+'.backgroundColor','Arbitrary colors are deferred');
   if(raw.verticalAlign!==undefined&&!enumeration(raw.verticalAlign,['top','middle','bottom']))add('INVALID_VERTICAL_ALIGN',path+'.verticalAlign','Invalid vertical alignment');
  }
  if(type==='tufte-code'&&raw.language!==undefined&&raw.language!==null&&(typeof raw.language!=='string'||!/^[a-zA-Z0-9_+-]{1,64}$/.test(raw.language)))add('INVALID_LANGUAGE',path+'.language','Invalid code language');
  if(type==='tufte-embed'){
   if(!isEmbedURL(raw.src,raw.provider))add('UNSAFE_EMBED',path+'.src','Unsupported provider URL');
   if(!nonempty(raw.title,1000))add('INVALID_EMBED_TITLE',path+'.title','Embed needs accessible title');
   if(!enumeration(raw.wrapper,['figure','div'])||typeof raw.aspectRatio!=='number'||!Number.isFinite(raw.aspectRatio)||raw.aspectRatio<0.1||raw.aspectRatio>10)add('INVALID_EMBED_LAYOUT',path,'Invalid wrapper/aspect ratio');
  }
 }
 if(!plain(input.lexicalState)||Object.keys(input.lexicalState).some(k=>k!=='root'))add('INVALID_STATE','$.lexicalState','Expected plain state containing only root');
 else visit(input.lexicalState.root,'$.lexicalState.root',undefined,0,false,false);
 return diagnostics.length?{ok:false,diagnostics}:{ok:true,document:input as TufteDocument,diagnostics};
}
export function parseDocument(source:string):ValidationResult{
 if(typeof source!=='string'||source.length>L.jsonCharacters)return {ok:false,diagnostics:[{code:'INVALID_JSON',path:'$',message:'JSON input exceeds allowed size or is not a string'}]};
 let input:unknown;try{input=JSON.parse(source);}catch{return {ok:false,diagnostics:[{code:'INVALID_JSON',path:'$',message:'Invalid JSON document'}]};}
 return validateDocument(input);
}
