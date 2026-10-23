import {LinkNode,type LinkAttributes} from '@lexical/link';
import {$applyNodeReplacement,type NodeKey} from 'lexical';
import type {HostReference} from '@lexical-tufte/document';

/** Internal links are not URLs: their target is resolved by the host. */
export type SerializedHostLink={
 type:'host-link';version:1;reference:HostReference;children:unknown[];
 direction?:null|'ltr'|'rtl';format?:string;indent?:number;textFormat?:number;textStyle?:string;
};

function validateReference(reference:HostReference):void{
 if(!reference||typeof reference!=='object'||Array.isArray(reference)||
   Object.keys(reference).some(k=>!['namespace','kind','id'].includes(k))||
   typeof reference.namespace!=='string'||!reference.namespace.trim()||reference.namespace.length>128||
   typeof reference.id!=='string'||!reference.id.trim()||reference.id.length>256||
   !['document','note','task','asset'].includes(reference.kind))
  throw Error('Invalid host reference');
}

/** LinkNode-compatible editor behavior with a separate, URL-free serialized node. */
export class HostLinkNode extends LinkNode {
 __reference:HostReference;
 static getType():string{return 'host-link';}
 static clone(node:HostLinkNode):HostLinkNode{
  return new HostLinkNode(node.__reference,node.__key);
 }
 constructor(reference:HostReference,key?:NodeKey){
  super('#',{} as LinkAttributes,key);
  this.__reference={...reference};
 }
 getReference():HostReference{return {...this.getLatest().__reference};}
 createDOM(config:Parameters<LinkNode['createDOM']>[0]):HTMLElement{
  const span=document.createElement('span');
  span.dataset.hostReference=this.__reference.id;
  span.className='tufte-host-link';
  return span;
 }
 exportJSON():ReturnType<LinkNode['exportJSON']>{
  const base=super.exportJSON();
  const {url,...rest}=base;
  return {...rest,type:'host-link',reference:{...this.getLatest().__reference}} as ReturnType<LinkNode['exportJSON']>;
 }
 static importJSON(serialized:ReturnType<LinkNode['exportJSON']>):HostLinkNode{
  const value=serialized as typeof serialized&{reference:HostReference};
  validateReference(value.reference);
  return $createHostLinkNode(value.reference);
 }
}
export function $createHostLinkNode(reference:HostReference):HostLinkNode{
 validateReference(reference);
 return $applyNodeReplacement(new HostLinkNode(reference));
}
