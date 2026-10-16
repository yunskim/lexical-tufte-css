import {$applyNodeReplacement,ElementNode,type EditorConfig,type NodeKey,type SerializedElementNode} from 'lexical';

/** Semantic dl/dt/dd elements. Structure is validated by the document boundary. */
abstract class DefinitionElementNode extends ElementNode {
  createDOM(_config:EditorConfig):HTMLElement {
    return document.createElement(this.getType()==='tufte-definition-list'?'dl':this.getType()==='tufte-term'?'dt':'dd');
  }
  updateDOM():false{return false;}
}
export class DefinitionListNode extends DefinitionElementNode {
  static getType():string{return 'tufte-definition-list';}
  static clone(node:DefinitionListNode):DefinitionListNode{return new DefinitionListNode(node.__key);}
  constructor(key?:NodeKey){super(key);}
  exportJSON():SerializedElementNode{return {...super.exportJSON(),type:'tufte-definition-list',version:1};}
  static importJSON(value:SerializedElementNode):DefinitionListNode{
    if(value.version!==1)throw Error('Unsupported definition list version');
    return $createDefinitionListNode().updateFromJSON(value);
  }
}
export class DefinitionTermNode extends DefinitionElementNode {
  static getType():string{return 'tufte-term';}
  static clone(node:DefinitionTermNode):DefinitionTermNode{return new DefinitionTermNode(node.__key);}
  constructor(key?:NodeKey){super(key);}
  exportJSON():SerializedElementNode{return {...super.exportJSON(),type:'tufte-term',version:1};}
  static importJSON(value:SerializedElementNode):DefinitionTermNode{
    if(value.version!==1)throw Error('Unsupported definition term version');
    return $createDefinitionTermNode().updateFromJSON(value);
  }
}
export class DefinitionDescriptionNode extends DefinitionElementNode {
  static getType():string{return 'tufte-definition';}
  static clone(node:DefinitionDescriptionNode):DefinitionDescriptionNode{return new DefinitionDescriptionNode(node.__key);}
  constructor(key?:NodeKey){super(key);}
  exportJSON():SerializedElementNode{return {...super.exportJSON(),type:'tufte-definition',version:1};}
  static importJSON(value:SerializedElementNode):DefinitionDescriptionNode{
    if(value.version!==1)throw Error('Unsupported definition description version');
    return $createDefinitionDescriptionNode().updateFromJSON(value);
  }
}
export function $createDefinitionListNode():DefinitionListNode{return $applyNodeReplacement(new DefinitionListNode());}
export function $createDefinitionTermNode():DefinitionTermNode{return $applyNodeReplacement(new DefinitionTermNode());}
export function $createDefinitionDescriptionNode():DefinitionDescriptionNode{return $applyNodeReplacement(new DefinitionDescriptionNode());}
