/** Small, DOM-independent HTML render tree. Attribute values are escaped at serialization. */
export type RenderChild=RenderElement|string;
export type RenderElement={readonly tag:string;readonly attrs:Readonly<Record<string,string>>;readonly children:readonly RenderChild[];readonly void?:boolean};
const TAGS=new Set(['article','section','h1','p','span','strong','em','code','s','u','sub','sup','mark','br','a','img','label','input','figure','figcaption','div','table','thead','tbody','tr','th','td']);
const ATTRS=new Set(['id','class','lang','dir','href','target','title','rel','src','alt','for','type','scope','data-tufte-note']);
export function element(tag:string,attrs:Record<string,string>={},children:RenderChild[]=[],isVoid=false):RenderElement{
 if(!TAGS.has(tag))throw new Error('Unsupported HTML tag');
 for(const key of Object.keys(attrs))if(!ATTRS.has(key))throw new Error('Unsupported HTML attribute');
 if(isVoid&&children.length)throw new Error('Void HTML element cannot have children');
 return {tag,attrs,children,void:isVoid};
}
export function escapeHTML(value:string):string{return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function serializeHTML(node:RenderChild):string{
 if(typeof node==='string')return escapeHTML(node);
 const attrs=Object.entries(node.attrs).map(([key,value])=>` ${key}="${escapeHTML(value)}"`).join('');
 if(node.void)return `<${node.tag}${attrs}>`;
 return `<${node.tag}${attrs}>${node.children.map(serializeHTML).join('')}</${node.tag}>`;
}
