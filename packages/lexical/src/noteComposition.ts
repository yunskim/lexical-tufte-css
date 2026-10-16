import {$getSelection,$isRangeSelection,$isTextNode,COMPOSITION_START_COMMAND,COMMAND_PRIORITY_HIGH,type LexicalEditor} from 'lexical';
import {NoteNode} from './NoteNode.js';

/** Keep composition anchored inside a note at a text boundary. */
export function $prepareNoteComposition():boolean{
 const selection=$getSelection();
 if(!$isRangeSelection(selection)||!selection.isCollapsed())return false;
 const node=selection.anchor.getNode();
 if(!$isTextNode(node)||!(node.getParent() instanceof NoteNode))return false;
 const offset=selection.anchor.offset;
 if(offset!==0&&offset!==node.getTextContentSize())return false;
 // Lexical removes this zero-width composition marker after composition.
 node.spliceText(offset,0,'\u200b',false);
 const point=offset===0?1:offset;
 node.select(point,point);
 return true;
}
export function registerNoteCompositionGuard(editor:LexicalEditor):()=>void{
 return editor.registerCommand(COMPOSITION_START_COMMAND,()=>{
  $prepareNoteComposition();
  return false;
 },COMMAND_PRIORITY_HIGH);
}
