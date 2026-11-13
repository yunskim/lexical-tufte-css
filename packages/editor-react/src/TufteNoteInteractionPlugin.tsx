import {useEffect,useRef} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {isImeKeyboardEvent} from './imeKeyboard.js';
import {
 $getRoot,$getNearestNodeFromDOMNode,$createNodeSelection,
 $getSelection,$isRangeSelection,$isNodeSelection,$isElementNode,$isTextNode,
 $createTextNode,$createLineBreakNode,$isParagraphNode,$setSelection,
 CLICK_COMMAND,KEY_ESCAPE_COMMAND,KEY_ARROW_DOWN_COMMAND,KEY_ENTER_COMMAND,
 SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,COPY_COMMAND,CUT_COMMAND,
 PASTE_COMMAND,KEY_BACKSPACE_COMMAND,KEY_DELETE_COMMAND,
 COMMAND_PRIORITY_HIGH,createCommand,type LexicalNode
} from 'lexical';
import {
 NoteNode,InlineImageNode,$insertNotePhrasing,$reidentifyPastedNotes,registerNoteStructureCommands,
 registerNoteCompositionGuard,registerNoteEdgeTypingGuard
} from '@lexical-tufte/lexical';

/** Public commands let a host toolbar use the same note navigation as the keyboard. */
export const ENTER_TUFTE_NOTE_COMMAND=createCommand<void>('ENTER_TUFTE_NOTE_COMMAND');
export const LEAVE_TUFTE_NOTE_COMMAND=createCommand<void>('LEAVE_TUFTE_NOTE_COMMAND');

function containingNote(node:LexicalNode|null):NoteNode|null{
 for(let current=node;current;current=current.getParent()){
  if(current instanceof NoteNode)return current;
 }
 return null;
}

export interface TufteNoteInteractionPluginProps {
 /** Host-owned nonpersistent status message, not part of the document JSON. */
 onNotice?:(message:string)=>void;
}

/**
 * This is mounted regardless of readonly. Host-dispatched structural commands
 * must be handled with an explicit readonly rejection rather than silently
 * falling through when keyboard/clipboard interactions are disabled.
 */
export function TufteNoteStructurePlugin({onNotice}:TufteNoteInteractionPluginProps){
 const [editor]=useLexicalComposerContext();
 const noticeRef=useRef(onNotice);
 noticeRef.current=onNotice;
 useEffect(()=>registerNoteStructureCommands(editor,message=>noticeRef.current?.(message)),[editor]);
 return null;
}

/**
 * Note navigation, image selection, clipboard re-identification and IME guards.
 * LexicalComposer owns the state. Registration/unregistration is scoped to one
 * editor instance, with the latest host callback read via ref.
 */
export function TufteNoteInteractionPlugin({onNotice}:TufteNoteInteractionPluginProps){
 const [editor]=useLexicalComposerContext();
 const noticeRef=useRef(onNotice);
 noticeRef.current=onNotice;
 const setStatus=(message:string)=>noticeRef.current?.(message);
  function enterNote():boolean {
    if(editor.isComposing())return false;
    const selection=$getSelection();
    if(!$isRangeSelection(selection)||!selection.isCollapsed())return false;
    const anchor=selection.anchor.getNode();
    const inside=containingNote(anchor);
    if(inside)return false;
    const all:LexicalNode[]=[];
    function visit(n:LexicalNode){all.push(n);if($isElementNode(n))n.getChildren().forEach(visit);}
    visit($getRoot());
    const index=all.indexOf(anchor);
    const next=all.slice(index+1).find(n=>n instanceof NoteNode);
    if(!(next instanceof NoteNode))return false;
    next.selectStart();
    setStatus('노트 안입니다. Escape로 본문에 돌아갑니다.');return true;
  }
  function leaveNote():boolean {
    if(editor.isComposing())return false;
    const selection=$getSelection();
    if(!$isRangeSelection(selection))return false;
    const note=containingNote(selection.anchor.getNode());if(!note)return false;
    let next=note.getNextSibling();
    if(!next){next=$createTextNode(' ');note.insertAfter(next);}
    if($isTextNode(next))next.select(0,0);
    else if($isElementNode(next))next.selectStart();
    else next.selectPrevious();
    setStatus('본문으로 돌아왔습니다.');return true;
  }
  useEffect(()=>{
    const selectNoteImage=editor.registerCommand(CLICK_COMMAND,event=>{
      if(editor.isComposing()||!(event.target instanceof HTMLImageElement))return false;
      const node=$getNearestNodeFromDOMNode(event.target);
      if(!(node instanceof InlineImageNode)||!containingNote(node))return false;
      const selection=$createNodeSelection();selection.add(node.getKey());$setSelection(selection);
      event.preventDefault();editor.focus();return true;
    },COMMAND_PRIORITY_HIGH);
    const escape=editor.registerCommand(KEY_ESCAPE_COMMAND,event=>{
      if(isImeKeyboardEvent(event)||editor.isComposing()||!leaveNote())return false;
      event?.preventDefault();return true;
    },COMMAND_PRIORITY_HIGH);
    const down=editor.registerCommand(KEY_ARROW_DOWN_COMMAND,event=>{
      if(isImeKeyboardEvent(event)||editor.isComposing()||!event.altKey||!enterNote())return false;
      event.preventDefault();return true;
    },COMMAND_PRIORITY_HIGH);
    const enterCommand=editor.registerCommand(
      ENTER_TUFTE_NOTE_COMMAND,()=>enterNote(),COMMAND_PRIORITY_HIGH
    );
    const leaveCommand=editor.registerCommand(
      LEAVE_TUFTE_NOTE_COMMAND,()=>leaveNote(),COMMAND_PRIORITY_HIGH
    );
    const cutIds=new Set<string>();
    const copying=editor.registerCommand(COPY_COMMAND,()=>{cutIds.clear();return false;},COMMAND_PRIORITY_HIGH);
    const cutting=editor.registerCommand(CUT_COMMAND,()=>{
      cutIds.clear();const s=$getSelection();
      if($isRangeSelection(s)||$isNodeSelection(s)){
        const visitCut=(node:LexicalNode):void=>{
          if(node instanceof NoteNode)cutIds.add(node.getNoteId());
          if($isElementNode(node))for(const child of node.getChildren())visitCut(child);
        };
        for(const node of s.getNodes()){
          const parentNote=containingNote(node);
          if(parentNote)cutIds.add(parentNote.getNoteId());
          visitCut(node);
        }
      }
      return false;
    },COMMAND_PRIORITY_HIGH);
    const pasting=editor.registerCommand(SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,({nodes,selection})=>{
      const notes:NoteNode[]=[];
      function scan(n:LexicalNode){if(n instanceof NoteNode)notes.push(n);if($isElementNode(n))n.getChildren().forEach(scan);}
      nodes.forEach(scan);
      if($isRangeSelection(selection)&&containingNote(selection.anchor.getNode())&&notes.length){
        setStatus('노트 안에는 다른 노트를 붙여넣을 수 없습니다.');return true;
      }
      $reidentifyPastedNotes(nodes,cutIds,()=>crypto.randomUUID());
      cutIds.clear();
      if($isRangeSelection(selection)&&containingNote(selection.anchor.getNode())){
        const phrasing:LexicalNode[]=[];
        for(const [index,node] of nodes.entries()){
          if($isParagraphNode(node)){
            if(index>0)phrasing.push($createLineBreakNode());phrasing.push(...node.getChildren());
          }else if(!$isElementNode(node)||node.isInline())phrasing.push(node);
          else {setStatus('노트에는 본문 블록을 붙여넣을 수 없습니다.');return true;}
        }
        $insertNotePhrasing(selection,phrasing);return true;
      }
      return false;
    },COMMAND_PRIORITY_HIGH);
    const plainPaste=editor.registerCommand(PASTE_COMMAND,event=>{
      const s=$getSelection();
      if(!$isRangeSelection(s)||!containingNote(s.anchor.getNode())||!(event instanceof ClipboardEvent))return false;
      const data=event.clipboardData;if(!data||data.getData('application/x-lexical-editor')||data.getData('text/html'))return false;
      const text=data.getData('text/plain');if(!text)return false;
      const nodes:LexicalNode[]=[];
      text.replace(/\r\n?/g,'\n').split('\n').forEach((line,index)=>{
        if(index)nodes.push($createLineBreakNode());if(line)nodes.push($createTextNode(line));
      });
      event.preventDefault();$insertNotePhrasing(s,nodes);return true;
    },COMMAND_PRIORITY_HIGH);
    function exitAtEdge(event:KeyboardEvent|null,backward:boolean){
      if(editor.isComposing()||isImeKeyboardEvent(event))return false;
      const s=$getSelection();if(!$isRangeSelection(s)||!s.isCollapsed())return false;
      const node=s.anchor.getNode(),note=containingNote(node);
      if(!note||!$isTextNode(node))return false;
      const atEdge=backward?node.is(note.getFirstDescendant())&&s.anchor.offset===0:
        node.is(note.getLastDescendant())&&s.anchor.offset===node.getTextContentSize();
      if(!atEdge)return false;
      event?.preventDefault();
      if(backward)note.selectPrevious();else leaveNote();
      return true;
    }
    const backspace=editor.registerCommand(KEY_BACKSPACE_COMMAND,event=>exitAtEdge(event,true),COMMAND_PRIORITY_HIGH);
    const forwardDelete=editor.registerCommand(KEY_DELETE_COMMAND,event=>exitAtEdge(event,false),COMMAND_PRIORITY_HIGH);
    const composing=registerNoteCompositionGuard(editor);
    const enter=editor.registerCommand(KEY_ENTER_COMMAND,event=>{
      const s=$getSelection();if(!$isRangeSelection(s)||!containingNote(s.anchor.getNode()))return false;
      if(editor.isComposing()||isImeKeyboardEvent(event))return false;
      event?.preventDefault();s.insertLineBreak();return true;
    },COMMAND_PRIORITY_HIGH);
    const typing=registerNoteEdgeTypingGuard(editor);
    return()=>{selectNoteImage();escape();down();enterCommand();leaveCommand();typing();copying();cutting();pasting();plainPaste();backspace();forwardDelete();composing();enter();};
  },[editor]);

 return null;
}
