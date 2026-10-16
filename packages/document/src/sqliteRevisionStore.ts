import type {Result} from './types.js';
import {validatePostRecordV2,type PostRecordV2} from './metadata.js';

/** Minimal prepared-statement interface shared by SQLite and D1 adapters. */
export interface SqliteStatement{
 bind(...values:(string|number)[]):SqliteStatement;
 run():Promise<{meta:{changes?:number}}>;
}
export interface SqliteDatabase{
 prepare(sql:string):SqliteStatement;
}

/**
 * Schema requirement:
 * See sql/001_posts_v2.sql for the authoritative DDL.
 * CREATE TABLE posts_v2 (
 *   id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE,
 *   revision INTEGER NOT NULL CHECK(revision >= 1),
 *   payload TEXT NOT NULL
 * );
 * Single conditional UPDATE is the atomic CAS operation. No read/write gap.
 */
export class SqlitePostRevisionStoreV2{
 constructor(private readonly db:SqliteDatabase){}
 /** Create a new post; a duplicate id or slug is rejected by SQLite constraints. */
 async insert(initial:PostRecordV2):Promise<Result<PostRecordV2>>{
  const checked=validatePostRecordV2(initial);
  if(!checked.ok)return checked;
  if(checked.value.metadata.revision!==1)return {ok:false,diagnostics:[{code:'INVALID_INITIAL_REVISION',path:'$.metadata.revision',message:'Initial revision must be 1'}]};
  const record=checked.value;
  const outcome=await this.db.prepare('INSERT OR IGNORE INTO posts_v2 (id,slug,revision,payload) VALUES (?,?,?,?)').bind(
   record.document.id,record.metadata.slug,1,JSON.stringify(record),
  ).run();
  if(outcome.meta.changes===1)return {ok:true,value:record,diagnostics:[]};
  if(outcome.meta.changes===0)return {ok:false,diagnostics:[{code:'POST_ALREADY_EXISTS',path:'
 async compareAndSwap(next:PostRecordV2,expectedRevision:number):Promise<Result<PostRecordV2>>{
  const checked=validatePostRecordV2(next);
  if(!checked.ok)return checked;
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)
   return {ok:false,diagnostics:[{code:'INVALID_EXPECTED_REVISION',path:'$.expectedRevision',message:'Expected positive safe integer'}]};
  if(expectedRevision===Number.MAX_SAFE_INTEGER||checked.value.metadata.revision!==expectedRevision+1)
   return {ok:false,diagnostics:[{code:'INVALID_NEXT_REVISION',path:'$.next.metadata.revision',message:'Next revision must increment once'}]};
  const record=checked.value;
  // slug is intentionally immutable; id and slug must match stored row.
  const sql='UPDATE posts_v2 SET revision = ?, payload = ? WHERE id = ? AND slug = ? AND revision = ?';
  const outcome=await this.db.prepare(sql).bind(
   record.metadata.revision,JSON.stringify(record),record.document.id,
   record.metadata.slug,expectedRevision,
  ).run();
  if(outcome.meta.changes===1)return {ok:true,value:record,diagnostics:[]};
  if(outcome.meta.changes===0)return {ok:false,diagnostics:[{
   code:'REVISION_CONFLICT',path:'$.expectedRevision',
   message:'Post missing, identity mismatch or stored revision changed',
  }]};
  return {ok:false,diagnostics:[{
   code:'STORAGE_RESULT_UNKNOWN',path:'$',
   message:'Storage adapter did not report a single-row update',
  }]};
 }
}
,message:'Post id or slug already exists'}]};
  return {ok:false,diagnostics:[{code:'STORAGE_RESULT_UNKNOWN',path:'
 async compareAndSwap(next:PostRecordV2,expectedRevision:number):Promise<Result<PostRecordV2>>{
  const checked=validatePostRecordV2(next);
  if(!checked.ok)return checked;
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)
   return {ok:false,diagnostics:[{code:'INVALID_EXPECTED_REVISION',path:'$.expectedRevision',message:'Expected positive safe integer'}]};
  if(expectedRevision===Number.MAX_SAFE_INTEGER||checked.value.metadata.revision!==expectedRevision+1)
   return {ok:false,diagnostics:[{code:'INVALID_NEXT_REVISION',path:'$.next.metadata.revision',message:'Next revision must increment once'}]};
  const record=checked.value;
  // slug is intentionally immutable; id and slug must match stored row.
  const sql='UPDATE posts_v2 SET revision = ?, payload = ? WHERE id = ? AND slug = ? AND revision = ?';
  const outcome=await this.db.prepare(sql).bind(
   record.metadata.revision,JSON.stringify(record),record.document.id,
   record.metadata.slug,expectedRevision,
  ).run();
  if(outcome.meta.changes===1)return {ok:true,value:record,diagnostics:[]};
  if(outcome.meta.changes===0)return {ok:false,diagnostics:[{
   code:'REVISION_CONFLICT',path:'$.expectedRevision',
   message:'Post missing, identity mismatch or stored revision changed',
  }]};
  return {ok:false,diagnostics:[{
   code:'STORAGE_RESULT_UNKNOWN',path:'$',
   message:'Storage adapter did not report a single-row update',
  }]};
 }
}
,message:'Storage adapter did not report insert count'}]};
 }
 async compareAndSwap(next:PostRecordV2,expectedRevision:number):Promise<Result<PostRecordV2>>{
  const checked=validatePostRecordV2(next);
  if(!checked.ok)return checked;
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)
   return {ok:false,diagnostics:[{code:'INVALID_EXPECTED_REVISION',path:'$.expectedRevision',message:'Expected positive safe integer'}]};
  if(expectedRevision===Number.MAX_SAFE_INTEGER||checked.value.metadata.revision!==expectedRevision+1)
   return {ok:false,diagnostics:[{code:'INVALID_NEXT_REVISION',path:'$.next.metadata.revision',message:'Next revision must increment once'}]};
  const record=checked.value;
  // slug is intentionally immutable; id and slug must match stored row.
  const sql='UPDATE posts_v2 SET revision = ?, payload = ? WHERE id = ? AND slug = ? AND revision = ?';
  const outcome=await this.db.prepare(sql).bind(
   record.metadata.revision,JSON.stringify(record),record.document.id,
   record.metadata.slug,expectedRevision,
  ).run();
  if(outcome.meta.changes===1)return {ok:true,value:record,diagnostics:[]};
  if(outcome.meta.changes===0)return {ok:false,diagnostics:[{
   code:'REVISION_CONFLICT',path:'$.expectedRevision',
   message:'Post missing, identity mismatch or stored revision changed',
  }]};
  return {ok:false,diagnostics:[{
   code:'STORAGE_RESULT_UNKNOWN',path:'$',
   message:'Storage adapter did not report a single-row update',
  }]};
 }
}
