import {isEmbedURL} from '@lexical-tufte/document';
import {$applyNodeReplacement,DecoratorNode,type NodeKey,type SerializedLexicalNode,type DOMExportOutput} from 'lexical';
export type EmbedProvider='youtube'|'vimeo';
export type EmbedWrapper='figure'|'div';
export type SerializedEmbed=SerializedLexicalNode&{type:'tufte-embed';version:1;provider:EmbedProvider;src:string;title:string;wrapper:EmbedWrapper;width:'body'|'fullwidth';aspectRatio:number;layout?:'tufte'};
function validate(provider:unknown,src:unknown,title:unknown,wrapper:unknown,width:unknown,aspectRatio:unknown,layout?:unknown):void{
 if(!['youtube','vimeo'].includes(provider as string)||!isEmbedURL(src,provider)||typeof title!=='string'||!title.trim()||title.length>1000
 ||!['figure','div'].includes(wrapper as string)||!['body','fullwidth'].includes(width as string)
 ||typeof aspectRatio!=='number'||!Number.isFinite(aspectRatio)||aspectRatio<0.1||aspectRatio>10
 ||(layout!==undefined&&(layout!=='tufte'||aspectRatio!==16/9)))throw Error('Invalid embed properties');
}
export class EmbedNode extends DecoratorNode<null>{
 __provider:EmbedProvider;__src:string;__title:string;__wrapper:EmbedWrapper;__width:'body'|'fullwidth';__aspectRatio:number;__layout?:'tufte';
 static getType():string{return 'tufte-embed';}
 static clone(n:EmbedNode):EmbedNode{return new EmbedNode(n.__provider,n.__src,n.__title,n.__wrapper,n.__width,n.__aspectRatio,n.__key,n.__layout);}
 constructor(provider:EmbedProvider,src:string,title:string,wrapper:EmbedWrapper='figure',width:'body'|'fullwidth'='body',aspectRatio=16/9,key?:NodeKey,layout?:'tufte'){
  super(key);this.__provider=provider;this.__src=src;this.__title=title;this.__wrapper=wrapper;this.__width=width;this.__aspectRatio=aspectRatio;this.__layout=layout;
 }
 decorate():null{return null;}
 isInline():false{return false;}
 createDOM():HTMLElement{
  const e=document.createElement('div');e.contentEditable='false';e.dataset.embedProvider=this.__provider;e.dataset.width=this.__width;
  if(!isEmbedURL(this.__src,this.__provider)){
   e.textContent=this.__title;
   return e;
  }
  const frame=this.createFrame(e.ownerDocument);
  frame.style.aspectRatio=String(this.__aspectRatio);
  frame.style.height='auto';
  frame.style.width='100%';
  const link=e.ownerDocument.createElement('a');
  const platform=this.__provider==='youtube'?'YouTube':'Vimeo';
  const videoId=new URL(this.__src).pathname.split('/').pop();
  link.href=this.__provider==='youtube'
   ?`https://www.youtube.com/watch?v=${videoId}`
   :`https://vimeo.com/${videoId}`;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.textContent=`${platform}에서 열기`;
  link.setAttribute('aria-label',`${this.__title} · ${link.textContent}`);
  e.append(frame,link);
  return e;
 }
 updateDOM(previous:EmbedNode):boolean{return previous.__src!==this.__src||previous.__title!==this.__title||previous.__provider!==this.__provider||previous.__width!==this.__width||previous.__aspectRatio!==this.__aspectRatio;}
 private createFrame(doc:Document):HTMLIFrameElement{
  const frame=doc.createElement('iframe');
  frame.src=this.__src;frame.title=this.__title;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');
  frame.setAttribute('allowfullscreen','');
  frame.width='960';frame.height=String(Math.round(960/this.__aspectRatio));
  return frame;
 }
 exportDOM():DOMExportOutput{
  const n=this.getLatest(),outer=document.createElement(n.__wrapper);
  outer.className=(n.__width==='fullwidth'?'fullwidth ':'')+(n.__layout==='tufte'?'iframe-wrapper':'tufte-embed');
  if(n.__layout!=='tufte'){
   outer.dataset.tufteRatio=String(n.__aspectRatio);
   const spacer=document.createElementNS('http://www.w3.org/2000/svg','svg');
   spacer.setAttribute('viewBox',`0 0 960 ${960/n.__aspectRatio}`);spacer.setAttribute('width','960');spacer.setAttribute('height',String(960/n.__aspectRatio));
   spacer.setAttribute('aria-hidden','true');spacer.setAttribute('focusable','false');outer.append(spacer);
  }
  outer.append(n.createFrame(outer.ownerDocument));return {element:outer};
 }
 exportJSON():SerializedEmbed{
  const n=this.getLatest();return {...super.exportJSON(),type:'tufte-embed',version:1,provider:n.__provider,src:n.__src,title:n.__title,wrapper:n.__wrapper,width:n.__width,aspectRatio:n.__aspectRatio,...(n.__layout?{layout:n.__layout}:{})};
 }
 static importJSON(value:SerializedEmbed):EmbedNode{
  if(value.version!==1)throw Error('Unsupported embed version');
  validate(value.provider,value.src,value.title,value.wrapper,value.width,value.aspectRatio,value.layout);
  return $createEmbedNode(value.provider,value.src,value.title,value.wrapper,value.width,value.aspectRatio,value.layout);
 }
}
export function $createEmbedNode(provider:EmbedProvider,src:string,title:string,wrapper:EmbedWrapper='figure',width:'body'|'fullwidth'='body',aspectRatio=16/9,layout?:'tufte'):EmbedNode{
 validate(provider,src,title,wrapper,width,aspectRatio,layout);
 return $applyNodeReplacement(new EmbedNode(provider,src,title,wrapper,width,aspectRatio,undefined,layout));
}
