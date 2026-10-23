import {$applyNodeReplacement,type EditorConfig,type NodeKey} from 'lexical';
import {HeadingNode,type SerializedHeadingNode} from '@lexical/rich-text';

/** Heading IDs survive Lexical JSON roundtrips and are emitted by the publisher. */
export type SerializedTufteHeadingNode=SerializedHeadingNode&{id?:string};
const safeId=(id:string)=>/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id);
export class TufteHeadingNode extends HeadingNode{
 __id?:string;
 static getType():string{return 'tufte-heading';}
 static clone(node:TufteHeadingNode):TufteHeadingNode{
  const copy=new TufteHeadingNode(node.getTag(),node.__key);
  copy.__id=node.__id;
  return copy;
 }
 constructor(tag:'h1'|'h2'|'h3'|'h4'|'h5'|'h6'='h2',key?:NodeKey){super(tag,key);}
 getId():string|undefined{return this.getLatest().__id;}
 setId(id?:string):this{
  if(id!==undefined&&!safeId(id))throw Error('Invalid heading ID');
  this.getWritable().__id=id;
  return this;
 }
 createDOM(config:EditorConfig):HTMLElement{
  const dom=super.createDOM(config);
  if(this.__id)dom.id=this.__id;
  return dom;
 }
 updateDOM(previous:this,dom:HTMLElement,config:EditorConfig):boolean{
  if(previous.__id!==this.__id){
   if(this.__id)dom.id=this.__id;
   else dom.removeAttribute('id');
  }
  return super.updateDOM(previous,dom,config);
 }
 exportJSON():SerializedTufteHeadingNode{
  return {...super.exportJSON(),...(this.getId()?{id:this.getId()}: {})};
 }
 static importJSON(value:SerializedTufteHeadingNode):TufteHeadingNode{
  if(value.version!==1||!['h2','h3'].includes(value.tag))throw Error('Unsupported Tufte heading');
  const node=$createTufteHeadingNode(value.tag as 'h2'|'h3');
  node.updateFromJSON(value);
  node.setId(value.id);
  return node;
 }
}
export function $createTufteHeadingNode(tag:'h2'|'h3'='h2'):TufteHeadingNode{
 return $applyNodeReplacement(new TufteHeadingNode(tag));
}
