import {$addUpdateTag,$getSelection,$isRangeSelection,$isNodeSelection,$isElementNode,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {isSafeURL,type Diagnostic} from '@lexical-tufte/document';
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

export function registerNoteCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([SidenoteNode,MarginnoteNode]))throw Error('Note commands require concrete sidenote/marginnote nodes');
 const reject=(code:string,message:string)=>{
  onDiagnostic?.({code,path:'$.selection',message});return true;
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
