import {$applyNodeReplacement,ElementNode,type EditorConfig,type NodeKey,type SerializedElementNode} from 'lexical';

/** Semantic quotation wrappers. Structural constraints live in the document validator. */
abstract class QuotationElementNode extends ElementNode {
  abstract readonly htmlTag:'div'|'footer'|'cite';
  createDOM(_config:EditorConfig):HTMLElement{
    const element=document.createElement(this.htmlTag);
    if(this.getType()==='tufte-epigraph')element.className='epigraph';
    return element;
  }
  updateDOM():false{return false;}
}
export class EpigraphNode extends QuotationElementNode {
  readonly htmlTag='div' as const;
  static getType():string{return 'tufte-epigraph';}
  static clone(node:EpigraphNode):EpigraphNode{return new EpigraphNode(node.__key);}
  constructor(key?:NodeKey){super(key);}
  exportJSON():SerializedElementNode{return {...super.exportJSON(),type:'tufte-epigraph',version:1};}
  static importJSON(value:SerializedElementNode):EpigraphNode{
    if(value.version!==1)throw Error('Unsupported epigraph version');
    return $createEpigraphNode().updateFromJSON(value);
  }
}
export class AttributionNode extends QuotationElementNode {
  readonly htmlTag='footer' as const;
  static getType():string{return 'tufte-attribution';}
  static clone(node:AttributionNode):AttributionNode{return new AttributionNode(node.__key);}
  constructor(key?:NodeKey){super(key);}
  exportJSON():SerializedElementNode{return {...super.exportJSON(),type:'tufte-attribution',version:1};}
  static importJSON(value:SerializedElementNode):AttributionNode{
    if(value.version!==1)throw Error('Unsupported attribution version');
    return $createAttributionNode().updateFromJSON(value);
  }
}
export class CiteNode extends QuotationElementNode {
  readonly htmlTag='cite' as const;
  static getType():string{return 'tufte-cite';}
  static clone(node:CiteNode):CiteNode{return new CiteNode(node.__key);}
  constructor(key?:NodeKey){super(key);}
  isInline():true{return true;}
  exportJSON():SerializedElementNode{return {...super.exportJSON(),type:'tufte-cite',version:1};}
  static importJSON(value:SerializedElementNode):CiteNode{
    if(value.version!==1)throw Error('Unsupported cite version');
    return $createCiteNode().updateFromJSON(value);
  }
}
export function $createEpigraphNode():EpigraphNode{return $applyNodeReplacement(new EpigraphNode());}
export function $createAttributionNode():AttributionNode{return $applyNodeReplacement(new AttributionNode());}
export function $createCiteNode():CiteNode{return $applyNodeReplacement(new CiteNode());}
