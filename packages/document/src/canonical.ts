import type {Result,TufteDocument} from './types.js';
import {validateDocument,parseDocument} from './validate.js';

/** Stable serialization, not a Lexical state rewrite or schema migration. */
export function canonicalizeDocument(input:unknown):Result<string>{
 const checked=validateDocument(input);
 if(!checked.ok)return {ok:false,diagnostics:checked.diagnostics};
 // Sorting keys does not alter arrays, values, or node structure.
 const stable=(value:unknown):unknown=>{
  if(Array.isArray(value))return value.map(stable);
  if(value!==null&&typeof value==='object'){
   const result:Record<string,unknown>={};
   for(const key of Object.keys(value).sort())result[key]=stable((value as Record<string,unknown>)[key]);
   return result;
  }
  return value;
 };
 return {ok:true,value:JSON.stringify(stable(checked.document)),diagnostics:[]};
}
export function parseCanonicalDocument(source:string):Result<TufteDocument>{
 const result=parseDocument(source);
 return result.ok?{ok:true,value:result.document,diagnostics:[]}:{ok:false,diagnostics:result.diagnostics};
}
