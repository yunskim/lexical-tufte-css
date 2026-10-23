/** Versioned node registry: schemas do not imply editor/render capability. */
const phrasing=['text','linebreak','link','host-link','tufte-inline-image','tufte-span','tufte-sidenote','tufte-marginnote'];
const inline=phrasing.filter(t=>t!=='tufte-sidenote'&&t!=='tufte-marginnote');
const blocks=['paragraph','heading','list','tufte-definition-list','horizontalrule','quote','tufte-epigraph','tufte-figure','tufte-table-layout','tufte-code','tufte-embed','tufte-fullwidth','tufte-section-footer'];
export const NODE_SCHEMA:Readonly<Record<string,{readonly fields:readonly string[];readonly children?:readonly string[]}>>=Object.freeze({
 root:{fields:[],children:['tufte-section']},'tufte-section':{fields:[],children:blocks},
 paragraph:{fields:['tufteClass'],children:phrasing},heading:{fields:['tag','id'],children:inline},
 list:{fields:['listType','tag','start'],children:['listitem']},listitem:{fields:['value','checked'],children:[...phrasing,'list']},
 'tufte-definition-list':{fields:[],children:['tufte-term','tufte-definition']},
 'tufte-term':{fields:[],children:inline},'tufte-definition':{fields:[],children:['paragraph','list']},
 horizontalrule:{fields:[]},quote:{fields:['cite'],children:[...phrasing,'paragraph','tufte-attribution']},
 'tufte-epigraph':{fields:[],children:['quote']},'tufte-attribution':{fields:[],children:[...inline,'tufte-cite']},
 'tufte-cite':{fields:[],children:inline},'tufte-section-footer':{fields:[],children:[...inline,'tufte-cite']},
 'tufte-span':{fields:['kind'],children:inline},link:{fields:['url','target','rel','title'],children:['text','linebreak','tufte-inline-image','tufte-span']},
 'host-link':{fields:['reference'],children:['text','linebreak','tufte-inline-image','tufte-span']},
 'tufte-sidenote':{fields:['noteId'],children:inline},'tufte-marginnote':{fields:['noteId'],children:inline},
 'tufte-inline-image':{fields:['src','alt','assetId','hostAsset','width','height']},'tufte-imagequilt':{fields:['src','alt','assetId','hostAsset','width','height']},
 'tufte-figure':{fields:['width'],children:['tufte-inline-image','tufte-imagequilt','tufte-caption','tufte-marginnote']},
 'tufte-caption':{fields:[],children:inline},'tufte-fullwidth':{fields:[],children:blocks.filter(t=>t!=='tufte-fullwidth'&&t!=='tufte-section-footer')},
 'tufte-table-layout':{fields:['layout'],children:['table']},
 table:{fields:['colWidths','rowStriping','frozenColumnCount','frozenRowCount'],children:['tablerow']},
 tablerow:{fields:['height'],children:['tablecell']},
 tablecell:{fields:['colSpan','rowSpan','headerState','backgroundColor','verticalAlign','width'],children:['paragraph']},
 'tufte-code':{fields:['width','language'],children:['text','tab','linebreak','code-highlight']},
 text:{fields:['text','format','detail','mode','style']},tab:{fields:['text','format','detail','mode','style']},
 'code-highlight':{fields:['text','format','detail','mode','style','highlightType']},linebreak:{fields:[]},
 'tufte-embed':{fields:['provider','src','title','wrapper','width','aspectRatio','layout']},
});
for(const spec of Object.values(NODE_SCHEMA)){Object.freeze(spec.fields);if(spec.children)Object.freeze(spec.children);Object.freeze(spec);}
export const DOCUMENT_SCHEMA_VERSION=1 as const;
export const DOCUMENT_LIMITS=Object.freeze({jsonCharacters:5_000_000,nodes:10_000,depth:64,textCharacters:2_000_000,assets:1000,diagnostics:100});
export const isIdentifier=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
export const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
export function isSafeURL(value:unknown,kind:'image'|'link'):value is string{
 if(typeof value!=='string'||!value||value.length>4096||/[\u0000-\u0020\u007f\\]/.test(value)||value.startsWith('//'))return false;
 if(value.startsWith('/')||value.startsWith('./')||value.startsWith('../')||(kind==='link'&&value.startsWith('#')))return true;
 // Allow simple path-relative image URLs used by the pinned Tufte sample.
 // Never treat a scheme, authority, query or traversal as an ordinary path.
 if(kind==='image'&&/^[A-Za-z0-9][A-Za-z0-9._~/-]*$/.test(value)&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..'))return true;
 try{const u=new URL(value);return (kind==='image'?['http:','https:']:['http:','https:','mailto:','tel:','sms:']).includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}
}
export function isEmbedURL(value:unknown,provider:unknown):value is string{
 if(!isSafeURL(value,'image'))return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.port&&!u.search&&!u.hash&&(provider==='youtube'?u.hostname==='www.youtube-nocookie.com'&&/^\/embed\/[A-Za-z0-9_-]{11}$/.test(u.pathname):provider==='vimeo'&&u.hostname==='player.vimeo.com'&&/^\/video\/[0-9]+$/.test(u.pathname));}catch{return false;}
}
