import {
 $addUpdateTag,$createTextNode,$getSelection,$isRangeSelection,
 createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,
 type LexicalCommand,type LexicalEditor,type LexicalNode
} from 'lexical';
import {NODE_SCHEMA,isIdentifier} from '@lexical-tufte/document';
import {canonicalBlockType} from './blockSerialization.js';
import {$collectNoteIds} from './clipboardNotes.js';
import {NoteNode} from './NoteNode.js';
import {SidenoteNode,$createSidenoteNode} from './SidenoteNode.js';
import {MarginnoteNode,$createMarginnoteNode} from './MarginnoteNode.js';
import {$getContainingNote,$splitNoteAtSelection,$mergeNoteWithNext,$moveNote} from './noteOperations.js';

export type TufteNoteKind='sidenote'|'marginnote';
export type TufteNoteMoveDirection='previous'|'next';

export const INSERT_TUFTE_NOTE_COMMAND:LexicalCommand<TufteNoteKind>=createCommand('INSERT_TUFTE_NOTE');
export const SPLIT_TUFTE_NOTE_COMMAND:LexicalCommand<void>=createCommand('SPLIT_TUFTE_NOTE');
export const MERGE_TUFTE_NOTE_COMMAND:LexicalCommand<void>=createCommand('MERGE_TUFTE_NOTE');
export const MOVE_TUFTE_NOTE_COMMAND:LexicalCommand<TufteNoteMoveDirection>=createCommand('MOVE_TUFTE_NOTE');

/**
 * Host-neutral structural note commands. Register once per Lexical editor,
 * not once per toolbar. All commands are consumed with a notice on rejection;
 * rejected selections never mutate canonical state or history.
 *
 * The ID factory can be injected by deterministic tests. Runtime callers use
 * crypto.randomUUID(), with collision and schema checks before any mutation.
 */
export function registerNoteStructureCommands(
 editor:LexicalEditor,
 onNotice?:(message:string)=>void,
 createId:()=>string=()=>crypto.randomUUID()
):()=>void{
 if(!editor.hasNodes([SidenoteNode,MarginnoteNode]))
  throw Error('Note commands require TUFTE_NODES');

 const report=(message:string)=>{onNotice?.(message);return true;};
 const allocate=():string|null=>{
  const used=$collectNoteIds();
  for(let attempts=0;attempts<100;attempts++){
   let id:string;
   try{id=createId();}catch{return null;}
   if(isIdentifier(id)&&!used.has(id))return id;
  }
  return null;
 };
 const selectedNote=(collapsed:boolean):NoteNode|null=>{
  const selection=$getSelection();
  if(!$isRangeSelection(selection)||(collapsed&&!selection.isCollapsed())||editor.isComposing())return null;
  const anchor=$getContainingNote(selection.anchor.getNode());
  const focus=$getContainingNote(selection.focus.getNode());
  return anchor instanceof NoteNode&&focus?.is(anchor)===true?anchor:null;
 };
 const registrations=[
  editor.registerCommand(INSERT_TUFTE_NOTE_COMMAND,kind=>{
   if(!editor.isEditable())return report('읽기 전용 문서는 변경할 수 없습니다.');
   if(kind!=='sidenote'&&kind!=='marginnote')
    return report('지원하지 않는 노트 종류입니다.');
   const selection=$getSelection();
   if(!$isRangeSelection(selection)||!selection.isCollapsed()||editor.isComposing())
    return report('본문의 삽입 위치 한 곳을 선택하세요.');
   const anchor=selection.anchor.getNode();
   if($getContainingNote(anchor)||$getContainingNote(selection.focus.getNode()))
    return report('노트 안에 노트를 넣을 수 없습니다.');
   // The note must become an allowed direct child of a paragraph or listitem,
   // never of a link, heading, caption or other unsupported inline container.
   let current:LexicalNode|null=anchor;
   while(current&&canonicalBlockType(current.getType())!=='paragraph'&&
    canonicalBlockType(current.getType())!=='listitem')current=current.getParent();
   const target=kind==='sidenote'?'tufte-sidenote':'tufte-marginnote';
   if(!current||!NODE_SCHEMA[canonicalBlockType(current.getType())]?.children?.includes(target)||
    (anchor!==current&&!anchor.getParent()?.is(current)))
    return report('이 위치에는 노트를 삽입할 수 없습니다.');
   const id=allocate();
   if(!id)return report('고유한 노트 ID를 생성하지 못했습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const note=(kind==='sidenote'?$createSidenoteNode(id):$createMarginnoteNode(id))
    .append($createTextNode('새 노트'));
   selection.insertNodes([note]);
   note.selectStart();
   return report('새 노트를 삽입했습니다. Escape로 본문에 돌아갑니다.');
  },COMMAND_PRIORITY_EDITOR),

  editor.registerCommand(SPLIT_TUFTE_NOTE_COMMAND,()=>{
   if(!editor.isEditable())return report('읽기 전용 문서는 변경할 수 없습니다.');
   if(!selectedNote(true))return report('먼저 노트 안으로 이동하세요.');
   const id=allocate();
   if(!id)return report('고유한 노트 ID를 생성하지 못했습니다.');
   const second=$splitNoteAtSelection(id);
   if(!second)return report('이 위치에서 노트 구조를 변경할 수 없습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   return report('노트 구조를 변경했습니다.');
  },COMMAND_PRIORITY_EDITOR),

  editor.registerCommand(MERGE_TUFTE_NOTE_COMMAND,()=>{
   if(!editor.isEditable())return report('읽기 전용 문서는 변경할 수 없습니다.');
   const note=selectedNote(false);
   if(!note)return report('먼저 노트 안으로 이동하세요.');
   if(!$mergeNoteWithNext(note))return report('이 위치에서 노트 구조를 변경할 수 없습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   return report('노트 구조를 변경했습니다.');
  },COMMAND_PRIORITY_EDITOR),

  editor.registerCommand(MOVE_TUFTE_NOTE_COMMAND,direction=>{
   if(!editor.isEditable())return report('읽기 전용 문서는 변경할 수 없습니다.');
   if(direction!=='previous'&&direction!=='next')
    return report('지원하지 않는 노트 이동 방향입니다.');
   const note=selectedNote(false);
   if(!note)return report('먼저 노트 안으로 이동하세요.');
   if(!$moveNote(note,direction))return report('이 위치에서 노트 구조를 변경할 수 없습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   return report('노트 구조를 변경했습니다.');
  },COMMAND_PRIORITY_EDITOR)
 ];
 return()=>registrations.forEach(unregister=>unregister());
}
