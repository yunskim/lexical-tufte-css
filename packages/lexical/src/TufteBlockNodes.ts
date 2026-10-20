import {
 $applyNodeReplacement,ParagraphNode,isHTMLElement,
 type DOMExportOutput,type EditorConfig,type LexicalEditor,type NodeKey,
 type SerializedParagraphNode,type SerializedPartial
} from 'lexical';
import {QuoteNode,type SerializedQuoteNode} from '@lexical/rich-text';
import {isSafeURL} from '@lexical-tufte/document';

/** A class on the paragraph itself, not a nested span (upstream p.sans). */
export type SerializedTufteParagraph=SerializedParagraphNode&{tufteClass?:'sans'};
export class TufteParagraphNode extends ParagraphNode {
 __tufteClass?:'sans';
 static getType():string{return 'paragraph';}
 static clone(node:TufteParagraphNode):TufteParagraphNode{
  const copy=new TufteParagraphNode(node.__key);
  copy.__tufteClass=node.__tufteClass;
  return copy;
 }
 constructor(key?:NodeKey){super(key);}
 getTufteClass():'sans'|undefined{return this.getLatest().__tufteClass;}
 setTufteClass(value?:'sans'):this{
  if(value!==undefined&&value!=='sans')throw Error('Invalid paragraph Tufte class');
  this.getWritable().__tufteClass=value;return this;
 }
 createDOM(config:EditorConfig):HTMLElement{
  const dom=super.createDOM(config);
  if(this.getTufteClass()==='sans')dom.classList.add('sans');
  return dom;
 }
 updateDOM(previous:this,dom:HTMLElement,config:EditorConfig):boolean{
  if(previous.__tufteClass!==this.__tufteClass)
   dom.classList.toggle('sans',this.__tufteClass==='sans');
  return super.updateDOM(previous,dom,config);
 }
 exportDOM(editor:LexicalEditor):DOMExportOutput{
  const result=super.exportDOM(editor);
  if(isHTMLElement(result.element)&&this.getTufteClass()==='sans')
   result.element.classList.add('sans');
  return result;
 }
 exportJSON(compact?:false):SerializedTufteParagraph;
 exportJSON(compact:boolean):SerializedPartial<SerializedTufteParagraph>;
 exportJSON(compact=false):SerializedPartial<SerializedTufteParagraph>{
  return {...super.exportJSON(compact),...(this.getTufteClass()?{tufteClass:'sans' as const}:{})};
 }
 static importJSON(value:SerializedTufteParagraph):TufteParagraphNode{
  if(value.version!==1||(value.tufteClass!==undefined&&value.tufteClass!=='sans'))
   throw Error('Invalid Tufte paragraph');
  return $createTufteParagraphNode().updateFromJSON(value).setTufteClass(value.tufteClass);
 }
}
export function $createTufteParagraphNode(tufteClass?:'sans'):TufteParagraphNode{
 return $applyNodeReplacement(new TufteParagraphNode()).setTufteClass(tufteClass);
}

/** Preserves an original blockquote[cite] URL on the existing quote wire type. */
export type SerializedTufteQuote=SerializedQuoteNode&{cite?:string};
export class TufteQuoteNode extends QuoteNode {
 __cite?:string;
 static getType():string{return 'quote';}
 static clone(node:TufteQuoteNode):TufteQuoteNode{
  const copy=new TufteQuoteNode(node.__key);
  copy.__cite=node.__cite;
  return copy;
 }
 constructor(key?:NodeKey){super(key);}
 getCite():string|undefined{return this.getLatest().__cite;}
 setCite(cite?:string):this{
  if(cite!==undefined&&!isSafeURL(cite,'link'))
   throw Error('Invalid blockquote citation URL');
  this.getWritable().__cite=cite;return this;
 }
 createDOM(config:EditorConfig):HTMLElement{
  const dom=super.createDOM(config);
  if(this.getCite())dom.setAttribute('cite',this.getCite()!);
  return dom;
 }
 updateDOM(previous:this,dom:HTMLElement,config:EditorConfig):boolean{
  if(previous.__cite!==this.__cite){
   if(this.__cite)dom.setAttribute('cite',this.__cite);
   else dom.removeAttribute('cite');
  }
  return super.updateDOM(previous,dom,config);
 }
 exportDOM(editor:LexicalEditor):DOMExportOutput{
  const result=super.exportDOM(editor);
  if(isHTMLElement(result.element)&&this.getCite())
   result.element.setAttribute('cite',this.getCite()!);
  return result;
 }
 exportJSON(compact?:false):SerializedTufteQuote;
 exportJSON(compact:boolean):SerializedPartial<SerializedTufteQuote>;
 exportJSON(compact=false):SerializedPartial<SerializedTufteQuote>{
  return {...super.exportJSON(compact),...(this.getCite()?{cite:this.getCite()}:{})};
 }
 static importJSON(value:SerializedTufteQuote):TufteQuoteNode{
  if(value.version!==1||(value.cite!==undefined&&!isSafeURL(value.cite,'link')))
   throw Error('Invalid Tufte quotation citation');
  return $createTufteQuoteNode().updateFromJSON(value).setCite(value.cite);
 }
}
export function $createTufteQuoteNode(cite?:string):TufteQuoteNode{
 return $applyNodeReplacement(new TufteQuoteNode()).setCite(cite);
}
