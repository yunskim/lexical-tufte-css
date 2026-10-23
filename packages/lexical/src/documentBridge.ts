import {documentToEditorJSON,editorJSONToDocument,migrateStoredDocument,validateDocumentV2,type TufteDocumentV2,type Diagnostic,type TufteDocument} from '@lexical-tufte/document';
import {CLEAR_HISTORY_COMMAND,HISTORY_MERGE_TAG,type EditorState,type LexicalEditor} from 'lexical';

type Failure={ok:false;diagnostics:Diagnostic[]};
type Success<T>={ok:true;value:T;diagnostics:Diagnostic[]};
const failure=(code:string,message:string):Failure=>({ok:false,diagnostics:[{code,path:'$.lexicalState',message}]});

/** Install a prevalidated state outside an editor update; register HistoryPlugin first.
 * Clear old stacks and commit the new document as the next edit's undo baseline.
 * Parsing/validation must finish before calling this document-boundary operation.
 */
export function replaceEditorDocumentState(editor:LexicalEditor,state:EditorState):void{
 editor.setEditorState(state);
 editor.dispatchCommand(CLEAR_HISTORY_COMMAND,undefined);
 // Recommit after clear so HistoryPlugin retains this document as its baseline.
 editor.setEditorState(state,{tag:HISTORY_MERGE_TAG});
}
/**
 * Strict bridge to a configured Lexical editor. The editor must register every
 * node in the supplied document; unsupported nodes fail rather than downgrade.
 * Success replaces the document and clears undo/redo through CLEAR_HISTORY_COMMAND.
 * Register HistoryPlugin (or registerHistory) before loading; rejected loads retain history.
 */
export function loadDocumentIntoEditor(editor:LexicalEditor,input:unknown):Failure|Success<TufteDocument>{
 const checked=documentToEditorJSON(input);
 if(!checked.ok)return checked;
 try{
  const state=editor.parseEditorState(JSON.stringify(checked.state));
  // Lexical may normalize, discard or rewrite fields while importing.
  // Reject that conversion rather than claiming a lossless document roundtrip.
  const parsed=state.toJSON();
  if(JSON.stringify(sortJSON(parsed))!==JSON.stringify(sortJSON(checked.state))){
   return failure('LEXICAL_IMPORT_LOSSY','Lexical import changed the serialized document state');
  }
  // Never expose the caller-owned mutable envelope as a successful snapshot.
  const snapshot=structuredClone(input as TufteDocument);
  replaceEditorDocumentState(editor,state);
  return {ok:true,value:snapshot,diagnostics:[]};
 }catch(error){
  return failure('LEXICAL_IMPORT_FAILED',error instanceof Error?error.message:String(error));
 }
}
/**
 * Opt-in v2 import: validate and migrate the envelope before invoking the
 * existing fail-closed Lexical parser. The original stored document is never
 * changed, and the editor is only installed after loss detection succeeds.
 * Successful document replacement dispatches CLEAR_HISTORY_COMMAND. The host
 * must register HistoryPlugin for the command to clear its history state.
 */
export function loadMigratedDocumentIntoEditor(editor:LexicalEditor,input:unknown):Failure|Success<TufteDocumentV2>{
 const migrated=migrateStoredDocument(input);
 if(!migrated.ok)return migrated;
 // Project only the fields understood by the legacy strict bridge.
 const {id,locale,title,titleId,subtitle,lexicalState,assets}=migrated.document;
 const legacy:TufteDocument={schemaVersion:1,id,locale,title,lexicalState,assets};
 if(titleId!==undefined)legacy.titleId=titleId;
 if(subtitle!==undefined)legacy.subtitle=subtitle;
 const imported=loadDocumentIntoEditor(editor,legacy);
 if(!imported.ok)return imported;
 // The strict loader applies the shared document replacement/history policy.
 return {ok:true,value:structuredClone(migrated.document),diagnostics:[]};
}
/** Export is checked against the document schema; no unknown Lexical keys are removed. */
export function exportEditorToDocument(editor:LexicalEditor,base:unknown):Failure|Success<TufteDocument>{
 try{
  const state=editor.getEditorState().toJSON();
  const checked=editorJSONToDocument(base,state);
  return checked.ok?{ok:true,value:checked.document,diagnostics:[]}:{ok:false,diagnostics:checked.diagnostics};
 }catch(error){
  return failure('LEXICAL_EXPORT_FAILED',error instanceof Error?error.message:String(error));
 }
}

/**
 * Export a v2 document without losing its editorFormat descriptor.
 * The legacy export validates the current Lexical state against the v1
 * content schema; the v2 validator checks the complete result afterwards.
 */
export function exportEditorToDocumentV2(editor:LexicalEditor,base:unknown):Failure|Success<TufteDocumentV2>{
 const checked=validateDocumentV2(base);
 if(!checked.ok)return checked;
 const {id,locale,title,titleId,subtitle,assets}=checked.document;
 const legacy:TufteDocument={
  schemaVersion:1,id,locale,title,assets:structuredClone(assets),
  lexicalState:structuredClone(checked.document.lexicalState),
  ...(titleId===undefined?{}:{titleId}),
  ...(subtitle===undefined?{}:{subtitle}),
 };
 const exported=exportEditorToDocument(editor,legacy);
 if(!exported.ok)return exported;
 const candidate={...exported.value,schemaVersion:2,editorFormat:{engine:'lexical',formatVersion:1}};
 const validated=validateDocumentV2(candidate);
 return validated.ok
  ?{ok:true,value:validated.document,diagnostics:[]}
  :{ok:false,diagnostics:validated.diagnostics};
}

/** Canonical key ordering for loss detection; array order remains significant. */
function sortJSON(value:unknown):unknown{
 if(Array.isArray(value))return value.map(sortJSON);
 if(value!==null&&typeof value==='object'){
  const source=value as Record<string,unknown>;
  return Object.fromEntries(Object.keys(source).sort().map(key=>[key,sortJSON(source[key])]));
 }
 return value;
}
