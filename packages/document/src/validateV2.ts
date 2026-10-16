import type {Diagnostic,TufteDocument} from './types.js';
import {isRecord} from './schema.js';
import {validateDocument} from './validate.js';

export type TufteDocumentV2=Omit<TufteDocument,'schemaVersion'>&{
 schemaVersion:2;
 editorFormat:{engine:'lexical';formatVersion:1};
};
export type V2ValidationResult=
 | {ok:true;document:TufteDocumentV2;diagnostics:[]}
 | {ok:false;diagnostics:Diagnostic[]};

const fail=(code:string,path:string,message:string):V2ValidationResult=>({
 ok:false,diagnostics:[{code,path,message}],
});
const dataOnly=(value:Record<string,unknown>)=>
 Object.getOwnPropertySymbols(value).length===0&&
 Object.values(Object.getOwnPropertyDescriptors(value)).every(d=>'value'in d);

/** Validate the v2 envelope without weakening the strict v1 content contract. */
export function validateDocumentV2(input:unknown):V2ValidationResult{
 if(!isRecord(input)||!dataOnly(input))return fail('INVALID_DOCUMENT','$','Expected plain data document');
 if(input.schemaVersion!==2)return fail('UNSUPPORTED_DOCUMENT_VERSION','$.schemaVersion','Expected schemaVersion 2');
 const format=input.editorFormat;
 if(!isRecord(format)||!dataOnly(format))return fail('INVALID_EDITOR_FORMAT','$.editorFormat','Expected plain editor format descriptor');
 if(Object.keys(format).some(key=>key!=='engine'&&key!=='formatVersion'))
  return fail('UNKNOWN_FIELD','$.editorFormat','Unknown editor format field');
 if(format.engine!=='lexical'||format.formatVersion!==1)
  return fail('UNSUPPORTED_EDITOR_FORMAT','$.editorFormat','Unsupported editor format');
 const {editorFormat:unused,...legacy}=input;
 const checked=validateDocument({...legacy,schemaVersion:1});
 if(!checked.ok)return {ok:false,diagnostics:checked.diagnostics};
 return {ok:true,document:{
  ...structuredClone(checked.document),schemaVersion:2,
  editorFormat:{engine:'lexical',formatVersion:1},
 },diagnostics:[]};
}
