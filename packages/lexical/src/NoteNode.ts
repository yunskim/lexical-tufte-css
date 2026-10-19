import {isIdentifier} from '@lexical-tufte/document';
import {ElementNode,isHTMLElement,type EditorConfig,type LexicalEditor,type NodeKey,type SerializedElementNode,type DOMExportOutput} from 'lexical';
import {TufteSpanNode} from './TufteSpanNode.js';

export type SerializedNoteNode = SerializedElementNode & {
 type:'tufte-sidenote'|'tufte-marginnote';version:1;noteId:string;
};

/** Shared implementation only. Concrete sidenote/marginnote nodes define their identity. */
export abstract class NoteNode extends ElementNode {
 __noteId:string;
 constructor(noteId:string,key?:NodeKey){super(key);this.__noteId=noteId;}
 getNoteId():string{return this.getLatest().__noteId;}
 setNoteId(id:string):this{
  if(!isIdentifier(id))throw Error('Invalid note ID');
  this.getWritable().__noteId=id;return this;
 }
 extractWithChild():true{return true;}
 isInline():true{return true;}
 canBeEmpty():false{return false;}
 createDOM(_config:EditorConfig):HTMLElement{
  const span=document.createElement('span');
  span.className='tufte-note-editor';
  span.dataset.noteId=this.__noteId;
  span.dataset.kind=this.getType()==='tufte-sidenote'?'sidenote':'marginnote';
  return span;
 }
 updateDOM(previous:NoteNode,dom:HTMLElement):false{
  if(previous.__noteId!==this.__noteId)dom.dataset.noteId=this.__noteId;
  return false;
 }
 exportJSON():SerializedNoteNode{
  const type=this.getType();
  if(type!=='tufte-sidenote'&&type!=='tufte-marginnote')throw Error('Unknown note node type');
  return {...super.exportJSON(),type,version:1,noteId:this.getNoteId()};
 }
 exportDOM(_editor:LexicalEditor):DOMExportOutput{
  const element=document.createElement('span');
  const id=`prototype-${this.getNoteId()}`;
  const kind=this.getType()==='tufte-sidenote'?'sidenote':'marginnote';
  const previous=this.getPreviousSibling();
  const pairedNewthought=kind==='sidenote'
   &&this.getParent()?.getType()==='paragraph'
   &&previous instanceof TufteSpanNode
   &&previous.getKind()==='newthought';
  return {element,after:(generated)=>{
   if(!isHTMLElement(generated))return generated;
   const payload=document.createElement('span');payload.className=kind;
   while(generated.firstChild)payload.append(generated.firstChild);
   const label=document.createElement('label');label.htmlFor=id;
   label.className=kind==='sidenote'?'margin-toggle sidenote-number':'margin-toggle';
   label.textContent=kind==='marginnote'?'⊕':'';
   const input=document.createElement('input');input.id=id;input.type='checkbox';input.className='margin-toggle';
   const fragment=document.createDocumentFragment();
   // Keep the Lexical tree as newthought/sidenote siblings. Only exported HTML
   // pairs their DOM: upstream puts the label inside the preceding newthought
   // while checkbox and note payload remain following paragraph siblings.
   const preceding=generated.previousElementSibling;
   if(pairedNewthought&&isHTMLElement(preceding)&&preceding.classList.contains('newthought'))
    preceding.append(label);
   else fragment.append(label);
   fragment.append(input,payload);
   return fragment;
  }};
 }
}
