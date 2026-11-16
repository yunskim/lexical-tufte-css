import {useEffect,useRef} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {COMMAND_PRIORITY_HIGH,type LexicalCommand} from 'lexical';
import type {Diagnostic} from '@lexical-tufte/document';
import {
 registerSectionCommands,registerInlineCommands,registerDefinitionCommands,
 registerQuotationCommands,registerFigureCommands,registerListCommands,
 registerListKeyboardCommands,
 WRAP_TUFTE_ROOT_COMMAND,INSERT_TUFTE_SECTION_COMMAND,SPLIT_TUFTE_SECTION_COMMAND,
 MERGE_TUFTE_SECTION_COMMAND,SET_TUFTE_BLOCK_COMMAND,
 SET_TUFTE_SPAN_KIND_COMMAND,WRAP_TUFTE_SPAN_COMMAND,UNWRAP_TUFTE_SPAN_COMMAND,
 INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,
 REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,MOVE_TUFTE_DEFINITION_PAIR_COMMAND,
 REMOVE_TUFTE_DEFINITION_LIST_COMMAND,
 INSERT_TUFTE_QUOTATION_COMMAND,INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,
 APPEND_TUFTE_SECTION_CITE_COMMAND,APPEND_TUFTE_ATTRIBUTION_COMMAND,
 APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,
 SET_TUFTE_QUOTE_CITE_COMMAND,REMOVE_TUFTE_QUOTATION_COMMAND,
 INSERT_TUFTE_FIGURE_COMMAND,SET_TUFTE_FIGURE_WIDTH_COMMAND,
 INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,
 UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,
 INSERT_TUFTE_LIST_COMMAND,APPEND_TUFTE_LIST_ITEM_COMMAND,
 SET_TUFTE_LIST_KIND_COMMAND,CHANGE_TUFTE_LIST_INDENT_COMMAND,
 UNWRAP_TUFTE_LIST_COMMAND
} from '@lexical-tufte/lexical';

/** All canonical document-editing commands, including host-dispatched actions. */
const EDIT_COMMANDS=[
 WRAP_TUFTE_ROOT_COMMAND,INSERT_TUFTE_SECTION_COMMAND,SPLIT_TUFTE_SECTION_COMMAND,
 MERGE_TUFTE_SECTION_COMMAND,SET_TUFTE_BLOCK_COMMAND,
 SET_TUFTE_SPAN_KIND_COMMAND,WRAP_TUFTE_SPAN_COMMAND,UNWRAP_TUFTE_SPAN_COMMAND,
 INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,
 REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,MOVE_TUFTE_DEFINITION_PAIR_COMMAND,
 REMOVE_TUFTE_DEFINITION_LIST_COMMAND,
 INSERT_TUFTE_QUOTATION_COMMAND,INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,
 APPEND_TUFTE_SECTION_CITE_COMMAND,APPEND_TUFTE_ATTRIBUTION_COMMAND,
 APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,
 SET_TUFTE_QUOTE_CITE_COMMAND,REMOVE_TUFTE_QUOTATION_COMMAND,
 INSERT_TUFTE_FIGURE_COMMAND,SET_TUFTE_FIGURE_WIDTH_COMMAND,
 INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,
 UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,
 INSERT_TUFTE_LIST_COMMAND,APPEND_TUFTE_LIST_ITEM_COMMAND,
 SET_TUFTE_LIST_KIND_COMMAND,CHANGE_TUFTE_LIST_INDENT_COMMAND,
 UNWRAP_TUFTE_LIST_COMMAND
] as const;

export interface TufteDocumentCommandsPluginProps {
 readonly?:boolean;
 /** Diagnostic messages are host-owned UI state, never persisted in Lexical JSON. */
 onNotice?:(message:string)=>void;
}

/**
 * One registration boundary for the structural commands shared by the legacy
 * example and the controlled TufteEditor. Every listener is editor-scoped.
 * Host-dispatched commands must not bypass readonly just because the toolbar
 * is hidden; high-priority guards consume them before mutating handlers.
 */
export function TufteDocumentCommandsPlugin({
 readonly=false,onNotice
}:TufteDocumentCommandsPluginProps){
 const [editor]=useLexicalComposerContext();
 const current=useRef({readonly,onNotice});
 current.current={readonly,onNotice};

 useEffect(()=>{
  const unregister:Array<()=>void>=[];
  const diagnostic=(item:Diagnostic)=>current.current.onNotice?.(item.message);
  try{
   for(const command of EDIT_COMMANDS){
    unregister.push(editor.registerCommand(command as LexicalCommand<unknown>,()=>{
     if(!current.current.readonly&&editor.isEditable())return false;
     current.current.onNotice?.('읽기 전용 문서는 변경할 수 없습니다.');
     return true;
    },COMMAND_PRIORITY_HIGH));
   }
   unregister.push(registerSectionCommands(editor,diagnostic));
   unregister.push(registerInlineCommands(editor,diagnostic));
   unregister.push(registerDefinitionCommands(editor,diagnostic));
   unregister.push(registerQuotationCommands(editor,diagnostic));
   unregister.push(registerFigureCommands(editor,diagnostic));
   unregister.push(registerListCommands(editor,diagnostic));
  }catch(error){
   for(const dispose of unregister.reverse())dispose();
   throw error;
  }
  return()=>{for(const dispose of unregister.reverse())dispose();};
 },[editor]);

 // Key interception is relevant only in editable mode; unlike the commands
 // above it must not consume Tab/Enter in a readonly document.
 useEffect(()=>{
  if(readonly)return;
  return registerListKeyboardCommands(editor);
 },[editor,readonly]);
 return null;
}
