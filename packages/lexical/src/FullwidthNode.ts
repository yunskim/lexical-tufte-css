import {$applyNodeReplacement,ElementNode,type EditorConfig,type NodeKey,type SerializedElementNode} from 'lexical';

/** Structural full-width block wrapper; CSS handles the responsive presentation. */
export class FullwidthNode extends ElementNode {
 static getType():string{return 'tufte-fullwidth';}
 static clone(node:FullwidthNode):FullwidthNode{return new FullwidthNode(node.__key);}
 constructor(key?:NodeKey){super(key);}
 createDOM(_config:EditorConfig):HTMLElement{
  const element=document.createElement('div');
  element.className='fullwidth';
  return element;
 }
 updateDOM():false{return false;}
 exportJSON():SerializedElementNode{return {...super.exportJSON(),type:'tufte-fullwidth',version:1};}
 static importJSON(value:SerializedElementNode):FullwidthNode{
  if(value.version!==1)throw Error('Unsupported fullwidth version');
  return $createFullwidthNode().updateFromJSON(value);
 }
}
export function $createFullwidthNode():FullwidthNode{
 return $applyNodeReplacement(new FullwidthNode());
}
