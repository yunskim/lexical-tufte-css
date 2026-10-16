import type {Diagnostic} from './types.js';
import {isRecord} from './schema.js';
import {validateDocument} from './validate.js';

export type StoredFormat =
 | {schemaVersion:1;formatVersion:'legacy-v1'}
 | {schemaVersion:2;formatVersion:1};

export type FormatInspection =
 | {ok:true;format:StoredFormat;diagnostics:[]}
 | {ok:false;diagnostics:Diagnostic[]};

const reject=(code:string,path:string,message:string):FormatInspection=>({
 ok:false,diagnostics:[{code,path,message}],
});

/**
 * Identify a stored format without rewriting it or claiming runtime compatibility.
 * A valid v1 document is a legacy candidate, not a proven migratable document.
 */
export function inspectStoredDocument(input:unknown):FormatInspection{
 if(!isRecord(input))return reject('INVALID_DOCUMENT','$','Expected a plain document object');
 if(input.schemaVersion===1){
  const checked=validateDocument(input);
  return checked.ok
   ?{ok:true,format:{schemaVersion:1,formatVersion:'legacy-v1'},diagnostics:[]}
   :{ok:false,diagnostics:checked.diagnostics};
 }
 if(input.schemaVersion!==2)return reject('UNSUPPORTED_DOCUMENT_VERSION','$.schemaVersion','Unsupported document schema version');
 const editorFormat=input.editorFormat;
 if(!isRecord(editorFormat)||editorFormat.engine!=='lexical'||editorFormat.formatVersion!==1
  ||Object.keys(editorFormat).some(key=>key!=='engine'&&key!=='formatVersion')){
  return reject('UNSUPPORTED_EDITOR_FORMAT','$.editorFormat','Unsupported editor format descriptor');
 }
 // v2 is only identified here. A v2 validator and migration are not yet implemented.
 return {ok:true,format:{schemaVersion:2,formatVersion:1},diagnostics:[]};
}
