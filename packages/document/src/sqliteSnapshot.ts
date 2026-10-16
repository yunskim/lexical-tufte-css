import type {Result} from './types.js';
import {validatePostRecordV2,type PostRecordV2} from './metadata.js';

export interface SqliteReadStatement{
 bind(...values:(string|number)[]):SqliteReadStatement;
 first<T=unknown>():Promise<T|null>;
}
export interface SqliteReadDatabase{prepare(sql:string):SqliteReadStatement;}

/**
 * Read revision and payload from the same SQLite row and same SELECT.
 * Never fetch the two values separately: they could span different commits.
 */
export async function readSqlitePostSnapshotV2(
 db:SqliteReadDatabase,id:string,
):Promise<Result<PostRecordV2>>{
 if(typeof id!=='string'||id.length===0)
  return {ok:false,diagnostics:[{code:'INVALID_POST_ID',path:'$.id',message:'Expected nonempty post id'}]};
 const row=await db.prepare(
  'SELECT id, slug, revision, payload FROM posts_v2 WHERE id = ?'
 ).bind(id).first<unknown>();
 if(row===null)return {ok:false,diagnostics:[{code:'POST_NOT_FOUND',path:'$.id',message:'Post not found'}]};
 if(typeof row!=='object'||Array.isArray(row)||
  row===null)return {ok:false,diagnostics:[{code:'INVALID_STORAGE_ROW',path:'$',message:'Invalid storage row'}]};
 const value=row as Record<string,unknown>;
 if(value.id!==id||typeof value.slug!=='string'||
  !Number.isSafeInteger(value.revision)||typeof value.payload!=='string')
  return {ok:false,diagnostics:[{code:'INVALID_STORAGE_ROW',path:'$',message:'Invalid row identity or fields'}]};
 let parsed:unknown;
 try{parsed=JSON.parse(value.payload);}catch{
  return {ok:false,diagnostics:[{code:'INVALID_STORAGE_JSON',path:'$.payload',message:'Invalid stored JSON'}]};
 }
 const checked=validatePostRecordV2(parsed);
 if(!checked.ok)return {ok:false,diagnostics:checked.diagnostics.map(d=>({...d,path:'$.payload'+d.path.slice(1)}))};
 if(checked.value.document.id!==value.id||checked.value.metadata.slug!==value.slug||
  checked.value.metadata.revision!==value.revision)
  return {ok:false,diagnostics:[{code:'STORAGE_ROW_MISMATCH',path:'$',message:'Payload does not match row keys'}]};
 return checked;
}
