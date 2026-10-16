import {documentToEditorJSON,editorJSONToDocument,migrateStoredDocument,type TufteDocumentV2,type Diagnostic,type TufteDocument} from '@lexical-tufte/document';
import {CLEAR_HISTORY_COMMAND,type LexicalEditor} from 'lexical';

type Failure={ok:false;diagnostics:Diagnostic[]};
type Success<T>={ok:true;value:T;diagnostics:Diagnostic[]};
const failure=(code:string,message:string):Failure=>({ok:false,diagnostics:[{code,path:'$.lexicalState',message}]});

/**
 * Strict bridge to a configured Lexical editor. The editor must register every
 * node in the supplied document; unsupported nodes fail rather than downgrade.
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
  editor.setEditorState(state);
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
 const envelope={...migrated.document} as Record<string,unknown>;
 delete envelope.editorFormat;
 // Existing strict Lexical bridge intentionally accepts only the v1 envelope.
 const legacy=envelope as unknown as TufteDocument;
 legacy.schemaVersion=1;
 const imported=loadDocumentIntoEditor(editor,legacy);
 if(!imported.ok)return imported;
 // HistoryPlugin listens for this command. Never clear history for rejected loads.
 editor.dispatchCommand(CLEAR_HISTORY_COMMAND,undefined);
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

/** Canonical key ordering for loss detection; array order remains significant. */
function sortJSON(value:unknown):unknown{
 if(Array.isArray(value))return value.map(sortJSON);
 if(value!==null&&typeof value==='object'){
  const source=value as Record<string,unknown>;
  return Object.fromEntries(Object.keys(source).sort().map(key=>[key,sortJSON(source[key])]));
 }
 return value;
}
