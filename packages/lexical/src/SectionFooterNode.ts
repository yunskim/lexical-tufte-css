import {$applyNodeReplacement,ElementNode,type EditorConfig,type NodeKey,type SerializedElementNode} from 'lexical';

/** A section-level footer, distinct from a quotation attribution. */
export class SectionFooterNode extends ElementNode {
 static getType():string{return 'tufte-section-footer';}
 static clone(node:SectionFooterNode):SectionFooterNode{return new SectionFooterNode(node.__key);}
 constructor(key?:NodeKey){super(key);}
 createDOM(_config:EditorConfig):HTMLElement{return document.createElement('footer');}
 updateDOM():false{return false;}
 exportJSON():SerializedElementNode{return {...super.exportJSON(),type:'tufte-section-footer',version:1};}
 static importJSON(value:SerializedElementNode):SectionFooterNode{
  if(value.version!==1)throw Error('Unsupported section footer version');
  return $createSectionFooterNode().updateFromJSON(value);
 }
}
export function $createSectionFooterNode():SectionFooterNode{
 return $applyNodeReplacement(new SectionFooterNode());
}
