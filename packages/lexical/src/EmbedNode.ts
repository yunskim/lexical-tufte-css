import {isEmbedURL} from '@lexical-tufte/document';
import {$applyNodeReplacement,DecoratorNode,type NodeKey,type SerializedLexicalNode,type DOMExportOutput} from 'lexical';
export type EmbedProvider='youtube'|'vimeo';
export type EmbedWrapper='figure'|'div';
export type SerializedEmbed=SerializedLexicalNode&{type:'tufte-embed';version:1;provider:EmbedProvider;src:string;title:string;wrapper:EmbedWrapper;width:'body'|'fullwidth';aspectRatio:number};
function validate(provider:unknown,src:unknown,title:unknown,wrapper:unknown,width:unknown,aspectRatio:unknown):void{
 if(!['youtube','vimeo'].includes(provider as string)||!isEmbedURL(src,provider)||typeof title!=='string'||!title.trim()||title.length>1000
 ||!['figure','div'].includes(wrapper as string)||!['body','fullwidth'].includes(width as string)
 ||typeof aspectRatio!=='number'||!Number.isFinite(aspectRatio)||aspectRatio<0.1||aspectRatio>10)throw Error('Invalid embed properties');
}
export class EmbedNode extends DecoratorNode<null>{
 __provider:EmbedProvider;__src:string;__title:string;__wrapper:EmbedWrapper;__width:'body'|'fullwidth';__aspectRatio:number;
 static getType():string{return 'tufte-embed';}
 static clone(n:EmbedNode):EmbedNode{return new EmbedNode(n.__provider,n.__src,n.__title,n.__wrapper,n.__width,n.__aspectRatio,n.__key);}
 constructor(provider:EmbedProvider,src:string,title:string,wrapper:EmbedWrapper='figure',width:'body'|'fullwidth'='body',aspectRatio=16/9,key?:NodeKey){
  super(key);this.__provider=provider;this.__src=src;this.__title=title;this.__wrapper=wrapper;this.__width=width;this.__aspectRatio=aspectRatio;
 }
 decorate():null{return null;}
 isInline():false{return false;}
 createDOM():HTMLElement{
  const e=document.createElement('div');e.contentEditable='false';e.dataset.embedProvider=this.__provider;
  e.textContent=this.__title;return e;
 }
 updateDOM(previous:EmbedNode):boolean{return previous.__src!==this.__src||previous.__title!==this.__title||previous.__provider!==this.__provider;}
 exportDOM():DOMExportOutput{
  const n=this.getLatest(),outer=document.createElement(n.__wrapper);
  // Keep published Lexical HTML and the pure renderer at the same Tufte
  // .iframe-wrapper > iframe boundary; never insert an SVG spacer.
  outer.className=(n.__width==='fullwidth'?'fullwidth ':'')+'iframe-wrapper';
  const frame=document.createElement('iframe');
  frame.src=n.__src;frame.title=n.__title;frame.loading='lazy';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');
  frame.setAttribute('allowfullscreen','');
  frame.width='960';frame.height=String(Math.round(960/n.__aspectRatio));
  outer.append(frame);return {element:outer};
 }
  exportJSON():SerializedEmbed{
  const n=this.getLatest();return {...super.exportJSON(),type:'tufte-embed',version:1,provider:n.__provider,src:n.__src,title:n.__title,wrapper:n.__wrapper,width:n.__width,aspectRatio:n.__aspectRatio};
 }
 static importJSON(value:SerializedEmbed):EmbedNode{
  if(value.version!==1)throw Error('Unsupported embed version');
  validate(value.provider,value.src,value.title,value.wrapper,value.width,value.aspectRatio);
  return $createEmbedNode(value.provider,value.src,value.title,value.wrapper,value.width,value.aspectRatio);
 }
}
export function $createEmbedNode(provider:EmbedProvider,src:string,title:string,wrapper:EmbedWrapper='figure',width:'body'|'fullwidth'='body',aspectRatio=16/9):EmbedNode{
 validate(provider,src,title,wrapper,width,aspectRatio);
 return $applyNodeReplacement(new EmbedNode(provider,src,title,wrapper,width,aspectRatio));
}
