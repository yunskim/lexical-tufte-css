import {$addUpdateTag,$getSelection,$isRangeSelection,$isNodeSelection,$isElementNode,$getNodeByKey,$createNodeSelection,$setSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {isIdentifier,isSafeURL,type Diagnostic} from '@lexical-tufte/document';
import {InlineImageNode,$createInlineImageNode} from './InlineImageNode.js';
import {NoteNode} from './NoteNode.js';
import {SidenoteNode,$createSidenoteNode} from './SidenoteNode.js';
import {MarginnoteNode,$createMarginnoteNode} from './MarginnoteNode.js';
import {$getContainingNote} from './noteOperations.js';

/** P2.3.a.1 — selected paragraph note only. Other note placements are rejected. */
export type TufteNoteKind='sidenote'|'marginnote';
export const SET_TUFTE_NOTE_KIND_COMMAND:LexicalCommand<TufteNoteKind>=createCommand('SET_TUFTE_NOTE_KIND');
export const REMOVE_TUFTE_NOTE_COMMAND:LexicalCommand<void>=createCommand('REMOVE_TUFTE_NOTE');
/** Update source or alt text on exactly one selected inline image in a note. */
export type UpdateTufteNoteImage={src?:string;alt?:string};
export const UPDATE_TUFTE_NOTE_IMAGE_COMMAND:LexicalCommand<UpdateTufteNoteImage>=
 createCommand('UPDATE_TUFTE_NOTE_IMAGE');

/** Read-only choices for an explicitly selected note, not all document images. */
export type TufteNoteImageChoice={
 noteId:string;noteKey:string;nodeKey:string;src:string;alt:string;
};
export type SelectTufteNoteImage={noteId:string;noteKey:string;nodeKey:string};
export const SELECT_TUFTE_NOTE_IMAGE_COMMAND:LexicalCommand<SelectTufteNoteImage>=
 createCommand('SELECT_TUFTE_NOTE_IMAGE');

/** Call in editorState.read/editor.update. Never change state to enumerate images. */
export function $listSelectedTufteNoteImages():TufteNoteImageChoice[]{
 const selection=$getSelection();
 let anchor:LexicalNode|null=null;
 if($isRangeSelection(selection)&&selection.isCollapsed())
  anchor=selection.anchor.getNode();
 else if($isNodeSelection(selection)){
  const nodes=selection.getNodes();
  if(nodes.length===1&&nodes[0] instanceof InlineImageNode)anchor=nodes[0];
 }
 const note=$getContainingNote(anchor);
 if(!note)return [];
 const choices:TufteNoteImageChoice[]=[];
 const visit=(node:LexicalNode):void=>{
  if(node instanceof InlineImageNode){
   const image=node.exportJSON();
   choices.push({noteId:note.getNoteId(),noteKey:note.getKey(),nodeKey:node.getKey(),
    src:image.src,alt:image.alt});
  }else if($isElementNode(node))
   for(const child of node.getChildren())visit(child);
 };
 visit(note);
 return choices;
}


export function registerNoteCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([SidenoteNode,MarginnoteNode]))throw Error('Note commands require concrete sidenote/marginnote nodes');
 const reject=(code:string,message:string)=>{
  onDiagnostic?.({code,path:'$.selection',message});return true;
 };
 // Selection-only commands return false if refused, so the chooser does not
 // announce success for stale image keys (unlike handled mutation diagnostics).
 const rejectSelection=(code:string,message:string):false=>{
  onDiagnostic?.({code,path:'$.selection',message});return false;
 };
 const selectedNote=():NoteNode|null=>{
  const selection=$getSelection();
  if(editor.isComposing()||!$isRangeSelection(selection)||!selection.isCollapsed())return null;
  const note=$getContainingNote(selection.anchor.getNode());
  // Conversion must not create figure > sidenote or other invalid nesting.
  return note?.getParent()?.getType()==='paragraph'?note:null;
 };
 // A node selection identifies the image. A caret is sufficient only when
 // exactly one image exists in its note (including nested link/span content).
 const selectedImage=():{image:InlineImageNode;note:NoteNode}|null=>{
  const selection=$getSelection();
  if(editor.isComposing())return null;
  if($isNodeSelection(selection)){
   const nodes=selection.getNodes();
   if(nodes.length!==1||!(nodes[0] instanceof InlineImageNode))return null;
   const note=$getContainingNote(nodes[0]);
   return note?{image:nodes[0],note}:null;
  }
  if(!$isRangeSelection(selection)||!selection.isCollapsed())return null;
  const note=$getContainingNote(selection.anchor.getNode());
  if(!note)return null;
  const images:InlineImageNode[]=[];
  const collect=(node:LexicalNode):void=>{
   if(node instanceof InlineImageNode){images.push(node);return;}
   if($isElementNode(node))for(const child of node.getChildren())collect(child);
  };
  collect(note);
  return images.length===1?{image:images[0]!,note}:null;
 };
 const registrations=[
  editor.registerCommand(SELECT_TUFTE_NOTE_IMAGE_COMMAND,payload=>{
   if(!payload||typeof payload!=='object'||Array.isArray(payload)||
      !isIdentifier(payload.noteId)||typeof payload.noteKey!=='string'||
      typeof payload.nodeKey!=='string'||
      Object.keys(payload).some(key=>!['noteId','noteKey','nodeKey'].includes(key)))
    return rejectSelection('INVALID_NOTE_IMAGE_TARGET','이미지 선택 대상이 올바르지 않습니다.');
   if(editor.isComposing())return rejectSelection('INVALID_NOTE_IMAGE_SELECTION',
    '한글 입력 조합 중에는 이미지를 선택할 수 없습니다.');
   const image=$getNodeByKey(payload.nodeKey);
   const note=image instanceof InlineImageNode?$getContainingNote(image):null;
   if(!(image instanceof InlineImageNode)||!note||
      note.getKey()!==payload.noteKey||note.getNoteId()!==payload.noteId)
    return rejectSelection('INVALID_NOTE_IMAGE_TARGET',
     '이미지가 이동했거나 선택 당시의 노트에 속하지 않습니다.');
   // A keyboard-focused chooser may blur Lexical and leave selection null.
   // But a caret now inside a DIFFERENT note/body must reject the stale choice.
   const current=$getSelection();
   if($isRangeSelection(current)&&
      (!current.isCollapsed()||!$getContainingNote(current.anchor.getNode())?.is(note)))
    return rejectSelection('INVALID_NOTE_IMAGE_TARGET',
     '현재 커서가 선택 당시의 노트를 벗어났습니다.');
   if($isNodeSelection(current)){
    const nodes=current.getNodes();
    if(nodes.length!==1||!$getContainingNote(nodes[0]!)?.is(note))
     return rejectSelection('INVALID_NOTE_IMAGE_TARGET',
      '다른 노드 선택으로 변경되었습니다.');
   }
   const selection=$createNodeSelection();
   selection.add(image.getKey());
   $setSelection(selection);
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(SET_TUFTE_NOTE_KIND_COMMAND,kind=>{
   if(kind!=='sidenote'&&kind!=='marginnote')return reject('INVALID_NOTE_KIND','지원하지 않는 주석 종류입니다.');
   const note=selectedNote();
   if(!note)return reject('INVALID_NOTE_SELECTION','본문 문단의 노트 안에서 한 위치를 선택하세요.');
   if(kind==='sidenote'&&note instanceof SidenoteNode||
      kind==='marginnote'&&note instanceof MarginnoteNode)return true;
   const replacement=kind==='sidenote'
    ?$createSidenoteNode(note.getNoteId()):$createMarginnoteNode(note.getNoteId());
   $addUpdateTag(HISTORY_PUSH_TAG);
   // Move the actual nodes, preserving rich formatting, links and images.
   note.insertAfter(replacement);
   replacement.append(...note.getChildren());
   note.remove();
   replacement.selectEnd();
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(REMOVE_TUFTE_NOTE_COMMAND,()=>{
   const note=selectedNote();
   if(!note)return reject('INVALID_NOTE_SELECTION','삭제할 본문 문단 노트 안에서 한 위치를 선택하세요.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   note.selectNext();
   note.remove();
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,payload=>{
   if(!payload||typeof payload!=='object'||Array.isArray(payload)||
      Object.keys(payload).some(key=>key!=='src'&&key!=='alt')||
      !Object.hasOwn(payload,'src')&&!Object.hasOwn(payload,'alt')||
      Object.hasOwn(payload,'src')&&!isSafeURL(payload.src,'image')||
      Object.hasOwn(payload,'alt')&&typeof payload.alt!=='string')
    return reject('INVALID_NOTE_IMAGE_PAYLOAD','이미지 URL 또는 대체 텍스트가 올바르지 않습니다.');
   const target=selectedImage();
   if(!target)return reject('INVALID_NOTE_IMAGE_SELECTION',
    '노트 안의 이미지 하나를 선택하거나, 이미지가 하나인 노트에 커서를 두세요.');
   const {image,note}=target,old=image.exportJSON();
   const src=payload.src??old.src,alt=payload.alt??old.alt;
   if(old.assetId&&src!==old.src)
    return reject('MANAGED_NOTE_IMAGE_SOURCE',
     '관리 자산 URL 변경은 자산 참조 갱신에서 수행해야 합니다.');
   if(src!==old.src&&(old.width!==undefined||old.height!==undefined))
    return reject('SIZED_NOTE_IMAGE_SOURCE',
     '크기가 고정된 이미지 URL은 크기 재검증 후 변경해야 합니다.');
   if(src===old.src&&alt===old.alt)return true;
   $addUpdateTag(HISTORY_PUSH_TAG);
   const replacement=$createInlineImageNode(src,alt,old.assetId,old.width,old.height);
   image.replace(replacement);
   note.selectEnd();
   return true;
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(dispose=>dispose());
}
