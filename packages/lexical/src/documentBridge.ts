import {documentToEditorJSON,editorJSONToDocument,type Diagnostic,type TufteDocument} from '@lexical-tufte/document';
import type {LexicalEditor} from 'lexical';

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
  editor.setEditorState(state);
  return {ok:true,value:input as TufteDocument,diagnostics:[]};
 }catch(error){
  return failure('LEXICAL_IMPORT_FAILED',error instanceof Error?error.message:String(error));
 }
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
