import {$applyNodeReplacement,ElementNode,type EditorConfig,type NodeKey,type SerializedElementNode,type DOMExportOutput} from 'lexical';

type SerializedSection=SerializedElementNode&{type:'tufte-section';version:1};
export class SectionNode extends ElementNode {
 static getType():string{return 'tufte-section';}
 static clone(n:SectionNode):SectionNode{return new SectionNode(n.__key);}
 constructor(key?:NodeKey){super(key);}
 createDOM(_config:EditorConfig):HTMLElement{const e=document.createElement('section');e.dataset.tufteEditor='section';return e;}
 updateDOM():false{return false;}
 exportDOM():DOMExportOutput{return {element:document.createElement('section')};}
 exportJSON():SerializedSection{return {...super.exportJSON(),type:'tufte-section',version:1};}
 static importJSON(s:SerializedSection):SectionNode{if(s.version!==1)throw Error('Unsupported section version');return $createSectionNode().updateFromJSON(s);}
}
export function $createSectionNode():SectionNode{return $applyNodeReplacement(new SectionNode());}

export type FigureWidth='body'|'fullwidth';
type SerializedFigure=SerializedElementNode&{type:'tufte-figure';version:1;width:FigureWidth};
export class FigureNode extends ElementNode {
 __width:FigureWidth;
 static getType():string{return 'tufte-figure';}
 static clone(n:FigureNode):FigureNode{return new FigureNode(n.__width,n.__key);}
 constructor(width:FigureWidth='body',key?:NodeKey){super(key);this.__width=width;}
 getWidth():FigureWidth{return this.getLatest().__width;}
 setWidth(width:FigureWidth):this{this.getWritable().__width=width;return this;}
 createDOM():HTMLElement{const e=document.createElement('figure');e.dataset.tufteEditor='figure';return e;}
 updateDOM():false{return false;}
 exportDOM():DOMExportOutput{const e=document.createElement('figure');if(this.getWidth()==='fullwidth')e.className='fullwidth';return {element:e};}
 exportJSON():SerializedFigure{return {...super.exportJSON(),type:'tufte-figure',version:1,width:this.getWidth()};}
 static importJSON(s:SerializedFigure):FigureNode{if(s.version!==1||!['body','fullwidth'].includes(s.width))throw Error('Unsupported figure');return $createFigureNode(s.width).updateFromJSON(s);}
}
export function $createFigureNode(width:FigureWidth='body'):FigureNode{return $applyNodeReplacement(new FigureNode(width));}

type SerializedCaption=SerializedElementNode&{type:'tufte-caption';version:1};
export class CaptionNode extends ElementNode {
 static getType():string{return 'tufte-caption';}
 static clone(n:CaptionNode):CaptionNode{return new CaptionNode(n.__key);}
 constructor(key?:NodeKey){super(key);}
 createDOM():HTMLElement{const e=document.createElement('figcaption');e.dataset.tufteEditor='caption';return e;}
 updateDOM():false{return false;}
 exportDOM():DOMExportOutput{return {element:document.createElement('figcaption')};}
 exportJSON():SerializedCaption{return {...super.exportJSON(),type:'tufte-caption',version:1};}
 static importJSON(s:SerializedCaption):CaptionNode{if(s.version!==1)throw Error('Unsupported caption');return $createCaptionNode().updateFromJSON(s);}
}
export function $createCaptionNode():CaptionNode{return $applyNodeReplacement(new CaptionNode());}

export type TableLayout='body'|'fullwidth'|'scroll';
type SerializedTableLayout=SerializedElementNode&{type:'tufte-table-layout';version:1;layout:TableLayout};
/** Editor wrapper; body/fullwidth exports unwrap into section > table. */
export class TableLayoutNode extends ElementNode {
 __layout:TableLayout;
 static getType():string{return 'tufte-table-layout';}
 static clone(n:TableLayoutNode):TableLayoutNode{return new TableLayoutNode(n.__layout,n.__key);}
 constructor(layout:TableLayout='body',key?:NodeKey){super(key);this.__layout=layout;}
 getLayout():TableLayout{return this.getLatest().__layout;}
 createDOM():HTMLElement{const e=document.createElement('div');e.dataset.tufteEditor='table-layout';e.dataset.layout=this.__layout;return e;}
 updateDOM(previous:TableLayoutNode,dom:HTMLElement):false{if(previous.__layout!==this.__layout)dom.dataset.layout=this.__layout;return false;}
 exportJSON():SerializedTableLayout{return {...super.exportJSON(),type:'tufte-table-layout',version:1,layout:this.getLayout()};}
 static importJSON(s:SerializedTableLayout):TableLayoutNode{if(s.version!==1||!['body','fullwidth','scroll'].includes(s.layout))throw Error('Unsupported table layout');return $createTableLayoutNode(s.layout).updateFromJSON(s);}
 exportDOM():DOMExportOutput{
  const layout=this.getLayout();
  return {element:document.createElement('div'),after:generated=>{
   if(!(generated instanceof HTMLElement))throw Error('Table layout export has no element');
   const table=generated.querySelector<HTMLTableElement>(':scope > table');
   if(!table||generated.children.length!==1)throw Error('Table layout requires exactly one table');
   if(layout==='scroll'){generated.className='table-wrapper';return generated;}
   if(layout==='fullwidth')table.classList.add('fullwidth');
   return table;
  }};
 }
}
export function $createTableLayoutNode(layout:TableLayout='body'):TableLayoutNode{return $applyNodeReplacement(new TableLayoutNode(layout));}
