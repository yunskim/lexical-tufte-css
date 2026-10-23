import {$getSelection,$isRangeSelection,$isTextNode,$setSelection,type LexicalEditor,type RangeSelection} from 'lexical';
import {mountReferencePicker,type ReferenceProvider} from '@lexical-tufte/editor-ports';
import {INSERT_HOST_LINK_COMMAND,registerHostLinkCommands} from './hostLinkCommands.js';
import {HostLinkNode} from './HostLinkNode.js';

/** Compare document payload only; selection and editor-state identity are not document edits. */
export function hasDocumentChanged(current:unknown,previous:unknown):boolean{
 return JSON.stringify(current)!==JSON.stringify(previous);
}

export type HostLinkPickerOptions={
 editor:LexicalEditor;
 container:HTMLElement;
 provider:ReferenceProvider;
 onError?:(error:unknown)=>void;
};

/** Mount a picker for the current selection. Preserve the exact Lexical range across focus changes. */
export function mountHostLinkPicker({editor,container,provider,onError}:HostLinkPickerOptions):()=>void{
 if(!editor.hasNodes([HostLinkNode]))throw Error('HostLinkNode must be registered');
 const unregister=registerHostLinkCommands(editor);
 let saved:RangeSelection|null=null;
 let selectedText:string|null=null;
 let selectionGeneration=0;
 let disposed=false;
 const capture=()=>{
  editor.getEditorState().read(()=>{
   const selection=$getSelection();
   if(!$isRangeSelection(selection)||selection.isCollapsed()||selection.anchor.type!=='text'||
      selection.focus.type!=='text'||selection.anchor.key!==selection.focus.key)return;
   const node=selection.anchor.getNode();
   if($isTextNode(node)&&node.isSimpleText()){
    saved=selection.clone();
    selectionGeneration++;
    selectedText=node.getTextContent().slice(Math.min(selection.anchor.offset,selection.focus.offset),Math.max(selection.anchor.offset,selection.focus.offset));
   }
  });
 };
 capture();
 const unregisterUpdate=editor.registerUpdateListener(({editorState,prevEditorState})=>{
  if(disposed||!saved)return;
  // Selection-only changes caused by focusing the picker must not invalidate the snapshot.
  // Actual document edits invalidate it, even when the selected text happens to match.
  if(hasDocumentChanged(editorState.toJSON().root,prevEditorState.toJSON().root)){
   saved=null;selectedText=null;selectionGeneration++;
  }
 });
 const detach=mountReferencePicker({
  container,provider,onError,
  onSelect:reference=>{
   if(disposed||!saved||selectedText===null)return;
   const selected=saved.clone();
   const expectedText=selectedText;
   const generation=selectionGeneration;
   editor.update(()=>{
    if(disposed||generation!==selectionGeneration)return;
    const anchor=selected.anchor.getNode();
    const focus=selected.focus.getNode();
    if(!anchor.isAttached()||!focus.isAttached()||!$isTextNode(anchor)||!anchor.isSimpleText()||
       anchor.getKey()!==focus.getKey()||selected.isCollapsed())return;
    const start=Math.min(selected.anchor.offset,selected.focus.offset);
    const end=Math.max(selected.anchor.offset,selected.focus.offset);
    if(start<0||end>anchor.getTextContentSize()||anchor.getTextContent().slice(start,end)!==expectedText)return;
    $setSelection(selected);
    editor.dispatchCommand(INSERT_HOST_LINK_COMMAND,reference);
   });
  }
 });
 return ()=>{disposed=true;saved=null;selectedText=null;detach();unregisterUpdate();unregister();};
}
