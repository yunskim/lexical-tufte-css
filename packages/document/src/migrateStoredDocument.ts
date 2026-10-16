import type {Diagnostic} from './types.js';
import {inspectStoredDocument} from './inspectStoredDocument.js';
import {validateDocument} from './validate.js';
import {validateDocumentV2,type TufteDocumentV2} from './validateV2.js';

export type MigrationResult=
 | {ok:true;document:TufteDocumentV2;from:{schemaVersion:1;formatVersion:'legacy-v1'}|{schemaVersion:2;formatVersion:1};to:{schemaVersion:2;formatVersion:1};diagnostics:[]}
 | {ok:false;diagnostics:Diagnostic[]};

/**
 * Explicit envelope-only migration. This does not certify Lexical runtime
 * compatibility: the editor bridge must still reject lossy parse/export.
 */
export function migrateStoredDocument(input:unknown):MigrationResult{
 const inspected=inspectStoredDocument(input);
 if(!inspected.ok)return inspected;
 if(inspected.format.schemaVersion===2){
  const checked=validateDocumentV2(input);
  if(!checked.ok)return checked;
  return {ok:true,document:checked.document,from:inspected.format,to:{schemaVersion:2,formatVersion:1},diagnostics:[]};
 }
 const checked=validateDocument(input);
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
