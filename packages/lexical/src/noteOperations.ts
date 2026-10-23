import {$copyNode,$getSelection,$isRangeSelection,$isTextNode,type LexicalNode,type ElementNode,type RangeSelection} from 'lexical';
import {$isLinkNode} from '@lexical/link';
import {NoteNode} from './NoteNode.js';
import {$createSidenoteNode} from './SidenoteNode.js';
import {$createMarginnoteNode} from './MarginnoteNode.js';
export function $getContainingNote(node:LexicalNode|null):NoteNode|null {
  for(let current=node;current;current=current.getParent())if(current instanceof NoteNode)return current;
  return null;
}
/** Split rich inline wrappers without flattening links or dropping images. */
export function $splitNoteAtSelection(newId:string):NoteNode|null {
  const selection=$getSelection();
  if(!$isRangeSelection(selection)||!selection.isCollapsed())return null;
  const node=selection.anchor.getNode();const note=$getContainingNote(node);
  if(!note||!$isTextNode(node))return null;
  const offset=selection.anchor.offset;
  if((offset===0&&node.is(note.getFirstDescendant()))||
    (offset===node.getTextContentSize()&&node.is(note.getLastDescendant())))return null;
  let right:LexicalNode[];
  if(offset===0)right=[node,...node.getNextSiblings()];
  else if(offset===node.getTextContentSize())right=node.getNextSiblings();
  else {const pieces=node.splitText(offset);right=[pieces[1]!,...pieces[1]!.getNextSiblings()];}
  let parent:ElementNode=node.getParentOrThrow();
  while(!parent.is(note)){
    const wrapper=$copyNode(parent);wrapper.append(...right);
    right=[wrapper,...parent.getNextSiblings()];parent=parent.getParentOrThrow();
  }
  const second=(note.getType()==='tufte-sidenote'?$createSidenoteNode(newId):$createMarginnoteNode(newId)).append(...right);
  note.insertAfter(second);second.selectStart();return second;
}
/** Keep the first note's identity; merging different note kinds is explicit no-op. */
export function $mergeNoteWithNext(note:NoteNode):boolean {
  const next=note.getNextSibling();
  if(!(next instanceof NoteNode)||next.getType()!==note.getType())return false;
  const end=note.getLastDescendant();
  const left=note.getLastChild(),right=next.getFirstChild();
  if($isLinkNode(left)&&$isLinkNode(right)&&left.getType()===right.getType()&&
    left.getURL()===right.getURL()&&left.getTarget()===right.getTarget()&&
    left.getRel()===right.getRel()&&left.getTitle()===right.getTitle()){
    left.append(...right.getChildren());right.remove();
  }
  note.append(...next.getChildren());next.remove();
  if(end&&$isTextNode(end))end.selectEnd();else note.selectEnd();
  return true;
}
/** Move the whole note across one sibling without cloning its identity. */
export function $moveNote(note:NoteNode,direction:'previous'|'next'):boolean {
  const sibling=direction==='previous'?note.getPreviousSibling():note.getNextSibling();
  if(!sibling)return false;
  if(direction==='previous')sibling.insertBefore(note);else sibling.insertAfter(note);
  note.selectStart();return true;
}

/** Keep programmatic insertion at a note edge in the note, like native typing. */
export function $insertNotePhrasing(selection:RangeSelection,nodes:LexicalNode[]):void {
  const anchor=selection.anchor.getNode();
  const note=$getContainingNote(anchor),focus=selection.focus.getNode();
  if(note&&nodes.length&&!selection.isCollapsed()&&note.is($getContainingNote(focus))){
    const start=selection.isBackward()?selection.focus:selection.anchor;
    const end=selection.isBackward()?selection.anchor:selection.focus;
    const first=note.getFirstDescendant(),last=note.getLastDescendant();
    if(first&&last&&start.getNode().is(first)&&start.offset===0&&$isTextNode(last)&&end.getNode().is(last)&&end.offset===last.getTextContentSize()){
      // Replacing the whole payload must retain its note identity/container.
      const previous=note.getChildren();note.append(...nodes);for(const child of previous)child.remove();note.selectEnd();return;
    }
  }
  if(selection.isCollapsed()&&$isTextNode(anchor)&&anchor.getParent() instanceof NoteNode){
    const offset=selection.anchor.offset;
    if(offset===0||offset===anchor.getTextContentSize()){
      let previous:LexicalNode=anchor;
      for(const node of nodes){
        if(offset===0)anchor.insertBefore(node);
        else {previous.insertAfter(node);previous=node;}
      }
      const last=nodes.at(-1);if(last&&$isTextNode(last))last.selectEnd();else last?.selectNext();
      return;
    }
  }
  selection.insertNodes(nodes);
}
