import {$addUpdateTag,$getSelection,$isRangeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor} from 'lexical';
import {type Diagnostic} from '@lexical-tufte/document';
import {NoteNode} from './NoteNode.js';
import {SidenoteNode,$createSidenoteNode} from './SidenoteNode.js';
import {MarginnoteNode,$createMarginnoteNode} from './MarginnoteNode.js';
import {$getContainingNote} from './noteOperations.js';

/** P2.3.a.1 — selected paragraph note only. Other note placements are rejected. */
export type TufteNoteKind='sidenote'|'marginnote';
export const SET_TUFTE_NOTE_KIND_COMMAND:LexicalCommand<TufteNoteKind>=createCommand('SET_TUFTE_NOTE_KIND');
export const REMOVE_TUFTE_NOTE_COMMAND:LexicalCommand<void>=createCommand('REMOVE_TUFTE_NOTE');

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
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(dispose=>dispose());
}
