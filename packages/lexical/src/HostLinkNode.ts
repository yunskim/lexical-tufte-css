import {$applyNodeReplacement,ElementNode,type EditorConfig,type NodeKey,type SerializedElementNode} from 'lexical';
import type {HostReference} from '@lexical-tufte/document';

/** A host reference is not a URL and must not inherit LinkNode URL behavior. */
export type SerializedHostLink=SerializedElementNode&{type:'host-link';version:1;reference:HostReference};

function validateReference(reference:HostReference):void{
 if(!reference||typeof reference!=='object'||Array.isArray(reference)||
   Object.keys(reference).some(k=>!['namespace','kind','id'].includes(k))||
   typeof reference.namespace!=='string'||!reference.namespace.trim()||reference.namespace.length>128||
   typeof reference.id!=='string'||!reference.id.trim()||reference.id.length>256||
   !['document','note','task','asset'].includes(reference.kind))
  throw Error('Invalid host reference');
}

/** Inline, non-navigable reference element with an independent JSON contract. */
export class HostLinkNode extends ElementNode{
 __reference:HostReference;
 static getType():string{return 'host-link';}
 static clone(node:HostLinkNode):HostLinkNode{return new HostLinkNode(node.__reference,node.__key);}
 constructor(reference:HostReference,key?:NodeKey){super(key);validateReference(reference);this.__reference={...reference};}
 isInline():true{return true;}
 getReference():HostReference{return {...this.getLatest().__reference};}
 createDOM(_config:EditorConfig):HTMLElement{
  const span=document.createElement('span');
  const reference=this.getReference();
  span.dataset.hostReference=reference.id;
  span.dataset.hostNamespace=reference.namespace;
  span.dataset.hostKind=reference.kind;
  span.className='tufte-host-link';
  return span;
 }
 updateDOM(_previous:HostLinkNode,dom:HTMLElement):false{
  const reference=this.getReference();
  dom.dataset.hostReference=reference.id;
  dom.dataset.hostNamespace=reference.namespace;
  dom.dataset.hostKind=reference.kind;
  return false;
 }
 exportJSON():SerializedHostLink{
  return {...super.exportJSON(),type:'host-link',version:1,reference:this.getReference()};
 }
 static importJSON(value:SerializedHostLink):HostLinkNode{
  if(value.type!=='host-link'||value.version!==1||
    ['url','target','rel','title'].some(key=>Object.hasOwn(value,key)))
   throw Error('Invalid host link serialization');
  validateReference(value.reference);
  return $createHostLinkNode(value.reference).updateFromJSON(value);
 }
}
export function $createHostLinkNode(reference:HostReference):HostLinkNode{
 validateReference(reference);
 return $applyNodeReplacement(new HostLinkNode(reference));
}
