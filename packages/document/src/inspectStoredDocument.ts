import type {Diagnostic} from './types.js';
import {isRecord} from './schema.js';
import {validateDocument} from './validate.js';
import {validateDocumentV2} from './validateV2.js';

export type StoredFormat =
 | {schemaVersion:1;formatVersion:'legacy-v1'}
 | {schemaVersion:2;formatVersion:1};
export type FormatInspection =
 | {ok:true;format:StoredFormat;diagnostics:[]}
 | {ok:false;diagnostics:Diagnostic[]};
const reject=(code:string,path:string,message:string):FormatInspection=>({
 ok:false,diagnostics:[{code,path,message}],
});

/** Identify a validated envelope; this does not certify Lexical compatibility. */
export function inspectStoredDocument(input:unknown):FormatInspection{
 if(!isRecord(input)||Object.getOwnPropertySymbols(input).length!==0||
  Object.values(Object.getOwnPropertyDescriptors(input)).some(descriptor=>!('value' in descriptor)))
  return reject('INVALID_DOCUMENT','$','Expected a plain data document without accessors');
 if(input.schemaVersion===1){
  const checked=validateDocument(input);
  return checked.ok
   ?{ok:true,format:{schemaVersion:1,formatVersion:'legacy-v1'},diagnostics:[]}
   :{ok:false,diagnostics:checked.diagnostics};
 }
 if(input.schemaVersion!==2)return reject('UNSUPPORTED_DOCUMENT_VERSION','$.schemaVersion','Unsupported document schema version');
 const checked=validateDocumentV2(input);
 return checked.ok
  ?{ok:true,format:{schemaVersion:2,formatVersion:1},diagnostics:[]}
  :{ok:false,diagnostics:checked.diagnostics};
}
