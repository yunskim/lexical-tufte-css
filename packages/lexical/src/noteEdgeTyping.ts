import {$createTextNode,$getSelection,$isRangeSelection,$isTextNode,type LexicalEditor} from 'lexical';
import {NoteNode} from './NoteNode.js';

/** Intercept native edge typing only; let Lexical own IME composition. */
export function $insertNoteEdgeText(text:string):boolean{
 const selection=$getSelection();
 if(!$isRangeSelection(selection)||!selection.isCollapsed())return false;
 const node=selection.anchor.getNode();
 if(!$isTextNode(node)||!(node.getParent() instanceof NoteNode))return false;
 const offset=selection.anchor.offset;
 if(offset!==0&&offset!==node.getTextContentSize())return false;
 if(node.getFormat()===selection.format&&node.getStyle()===selection.style){
  node.spliceText(offset,0,text,true);
 }else{
  const inserted=$createTextNode(text).setFormat(selection.format).setStyle(selection.style);
  if(offset===0)node.insertBefore(inserted);else node.insertAfter(inserted);
  inserted.selectEnd();
 }
 return true;
}
export function registerNoteEdgeTypingGuard(editor:LexicalEditor):()=>void{
 const onBeforeInput=(event:InputEvent):void=>{
  if(event.inputType!=='insertText'||event.isComposing||event.data===null)return;
  // Preserve the synchronous cancelability of beforeinput while Lexical updates.
  let handled=false;
  editor.update(()=>{handled=$insertNoteEdgeText(event.data!);},{discrete:true});
  if(handled){
   event.preventDefault();
   event.stopImmediatePropagation();
  }
 };
 return editor.registerRootListener((root,previous)=>{
  previous?.removeEventListener('beforeinput',onBeforeInput as EventListener,true);
  root?.addEventListener('beforeinput',onBeforeInput as EventListener,true);
 });
}
