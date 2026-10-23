import type {Diagnostic} from './types.js';
import {inspectStoredDocument} from './inspectStoredDocument.js';
import {isRecord} from './schema.js';
import {validateDocument} from './validate.js';
import {validateDocumentV2,type TufteDocumentV2} from './validateV2.js';

export type MigrationResult=
 | {ok:true;document:TufteDocumentV2;from:{schemaVersion:1;formatVersion:'legacy-v1'}|{schemaVersion:2;formatVersion:1};to:{schemaVersion:2;formatVersion:1};diagnostics:[]}
 | {ok:false;diagnostics:Diagnostic[]};

/**
 * Explicit envelope-only migration. This does not certify Lexical runtime
 * compatibility: the editor bridge must still reject lossy parse/export.
 */
/** Convert only known legacy note wire identities; leave malformed payloads for validation to reject. */
function normalizeLegacyNotes(input:unknown):unknown{
 if(!isRecord(input))return input;
 // Never invoke user-defined accessors during migration.
 if(Object.getOwnPropertySymbols(input).length||
  Object.values(Object.getOwnPropertyDescriptors(input)).some(d=>!('value' in d)))return input;
 let copy:Record<string,unknown>;
 try{copy=structuredClone(input);}catch{return input;}
 const seen=new WeakSet<object>();
 const visit=(node:unknown):void=>{
  if(!isRecord(node)||seen.has(node))return;
  seen.add(node);
  if(node.type==='tufte-note'&&(node.kind==='sidenote'||node.kind==='marginnote')){
   node.type=node.kind==='sidenote'?'tufte-sidenote':'tufte-marginnote';
   delete node.kind;
  }
  if(Array.isArray(node.children))for(const child of node.children)visit(child);
 };
 if(isRecord(copy.lexicalState))visit(copy.lexicalState.root);
 return copy;
}
export function migrateStoredDocument(input:unknown):MigrationResult{
 const normalized=normalizeLegacyNotes(input);
 const inspected=inspectStoredDocument(normalized);
 if(!inspected.ok)return inspected;
 if(inspected.format.schemaVersion===2){
  const checked=validateDocumentV2(normalized);
  if(!checked.ok)return checked;
  return {ok:true,document:checked.document,from:inspected.format,to:{schemaVersion:2,formatVersion:1},diagnostics:[]};
 }
 const checked=validateDocument(normalized);
 if(!checked.ok)return checked;
 const candidate:TufteDocumentV2={
  ...structuredClone(checked.document),
  schemaVersion:2,
  editorFormat:{engine:'lexical',formatVersion:1},
 };
 const validated=validateDocumentV2(candidate);
 if(!validated.ok)return validated;
 return {ok:true,document:validated.document,from:inspected.format,to:{schemaVersion:2,formatVersion:1},diagnostics:[]};
}
