import {isIdentifier,isTimestamp,validatePostRecordV2,type PostRecordV2,type Result} from '@lexical-tufte/document';
import type {PublicationDatabase,PublicationState,PublicationSnapshot,PublishedSnapshot} from './publication.js';
import type {PublicationStore,PublicationCommit,PublicationCommitResult,PublicationRestoreCommit,PublicationUnpublishCommit} from './publicationStore.js';

const fail=(code:string,message:string):Result<never>=>({ok:false,diagnostics:[{code,path:'$.publication',message}]});
const count=(n:number,min=0)=>Number.isSafeInteger(n)&&n>=min;
/** Retryable SQLite lock contention is distinct from an integrity/storage failure. */
const storageFailure=(error:unknown,message:string):Result<never>=>{
 const code=error&&typeof error==='object'&&'code' in error?(error as {code?:unknown}).code:null;
 return code==='SQLITE_BUSY'||code==='SQLITE_LOCKED'
  ?fail('PUBLICATION_STORAGE_BUSY','SQLite publication storage is busy; retry after re-reading state')
  :fail('PUBLICATION_STORAGE_ERROR',message);
};

/**
 * SQLite implementation of the storage-neutral PublicationStore contract.
 * Uses its own synchronous connection; callers must not wrap calls in a host transaction.
 */
export class SqlitePublicationAdapter implements PublicationStore{
 constructor(private readonly db:PublicationDatabase){}
 async readDraft(postId:string):Promise<Result<PostRecordV2>>{
  if(!isIdentifier(postId))return fail('INVALID_POST_ID','Invalid post id');
  try{
   const row=this.db.prepare('SELECT id,slug,revision,payload FROM posts_v2 WHERE id=?').get(postId) as Record<string,unknown>|undefined;
   if(!row)return fail('POST_NOT_FOUND','Post not found');
   const checked=validatePostRecordV2(JSON.parse(String(row.payload)));if(!checked.ok)return checked;
   if(checked.value.document.id!==row.id||checked.value.metadata.slug!==row.slug||checked.value.metadata.revision!==row.revision)return fail('STORAGE_ROW_MISMATCH','Draft row does not match payload');
   return checked;
  }catch(error){return storageFailure(error,'Could not read draft');}
 }
 private head(postId:string):PublicationState{
  const row=this.db.prepare('SELECT generation,snapshot_id,last_snapshot_id,first_published_at,last_published_at,published_revision FROM publication_heads_v1 WHERE post_id=?').get(postId) as Record<string,unknown>|undefined;
  return row?{generation:Number(row.generation),snapshotId:row.snapshot_id as string|null,lastSnapshotId:row.last_snapshot_id as string|null,firstPublishedAt:row.first_published_at as string|null,publishedAt:row.last_published_at as string|null,publishedRevision:row.published_revision===null?null:Number(row.published_revision)}:{generation:0,snapshotId:null,lastSnapshotId:null,firstPublishedAt:null,publishedAt:null,publishedRevision:null};
 }
 async readState(postId:string):Promise<Result<PublicationState>>{
  if(!isIdentifier(postId))return fail('INVALID_POST_ID','Invalid post id');
  try{return {ok:true,value:this.head(postId),diagnostics:[]};}catch(error){return storageFailure(error,'Could not read publication state');}
 }
 private async decode(snapshotId:string,payload:unknown,postId:unknown,revision:unknown):Promise<Result<PublishedSnapshot>>{
  if(typeof payload!=='string')return fail('SNAPSHOT_INTEGRITY_ERROR','Snapshot payload missing');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload))),n=>n.toString(16).padStart(2,'0')).join('');
  if(digest!==snapshotId)return fail('SNAPSHOT_INTEGRITY_ERROR','Snapshot checksum mismatch');
  try{
   const snapshot=JSON.parse(payload) as PublicationSnapshot;
   const checked=validatePostRecordV2(snapshot.post);if(!checked.ok)return checked;
   if(snapshot.snapshotVersion!==1||checked.value.document.id!==postId||snapshot.publishedRevision!==revision||snapshot.publishedRevision!==checked.value.metadata.revision||typeof snapshot.html!=='string'||!isTimestamp(snapshot.firstPublishedAt)||!isTimestamp(snapshot.publishedAt)||Date.parse(snapshot.firstPublishedAt)>Date.parse(snapshot.publishedAt))
    return fail('INVALID_PUBLICATION_SNAPSHOT','Invalid snapshot envelope');
   return {ok:true,value:{snapshotId,snapshot:structuredClone(snapshot)},diagnostics:[]};
  }catch{return fail('INVALID_PUBLICATION_SNAPSHOT','Invalid snapshot JSON');}
 }
 async readSnapshot(snapshotId:string):Promise<Result<PublishedSnapshot>>{
  if(!/^[0-9a-f]{64}$/.test(snapshotId))return fail('INVALID_SNAPSHOT_ID','Invalid snapshot hash');
  try{
   const row=this.db.prepare('SELECT payload,post_id,source_revision FROM publication_snapshots_v1 WHERE snapshot_id=?').get(snapshotId) as Record<string,unknown>|undefined;
   return row?await this.decode(snapshotId,row.payload,row.post_id,row.source_revision):fail('SNAPSHOT_NOT_FOUND','Snapshot not found');
  }catch(error){return storageFailure(error,'Could not read snapshot');}
 }
 async readPublic(postId:string):Promise<Result<PublishedSnapshot>>{
  if(!isIdentifier(postId))return fail('INVALID_POST_ID','Invalid post id');
  try{
   const row=this.db.prepare('SELECT s.snapshot_id,s.payload,s.post_id,s.source_revision FROM publication_heads_v1 h JOIN publication_snapshots_v1 s ON s.snapshot_id=h.snapshot_id AND s.post_id=h.post_id WHERE h.post_id=?').get(postId) as Record<string,unknown>|undefined;
   return row?await this.decode(String(row.snapshot_id),row.payload,row.post_id,row.source_revision):fail('NOT_PUBLISHED','No active public snapshot');
  }catch(error){return storageFailure(error,'Could not read public snapshot');}
 }
 async commitPublication(command:PublicationCommit):Promise<Result<PublicationCommitResult>>{
  if(!command||!isIdentifier(command.postId)||!count(command.expectedDraftRevision,1)||!count(command.expectedGeneration)||!(/^[0-9a-f]{64}$/.test(command.snapshotId)))return fail('INVALID_PUBLICATION_INPUT','Invalid commit request');
  let started=false;
  try{
   const {postId,snapshot,snapshotId}=command;
   // Validate the supplied immutable snapshot before opening the write transaction.
   const payload=JSON.stringify(snapshot);
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload))),n=>n.toString(16).padStart(2,'0')).join('');
   if(digest!==snapshotId||snapshot.post.document.id!==postId||snapshot.publishedRevision!==command.expectedDraftRevision||snapshot.generation!==command.expectedGeneration+1||snapshot.snapshotVersion!==1)return fail('INVALID_PUBLICATION_SNAPSHOT','Snapshot does not match commit request');
   const checked=validatePostRecordV2(snapshot.post);if(!checked.ok)return checked;
   this.db.exec('BEGIN IMMEDIATE');started=true;
   const row=this.db.prepare('SELECT id,slug,revision,payload FROM posts_v2 WHERE id=?').get(postId) as Record<string,unknown>|undefined;
   if(!row){this.db.exec('ROLLBACK');started=false;return fail('POST_NOT_FOUND','Post not found');}
   const current=validatePostRecordV2(JSON.parse(String(row.payload)));
   if(!current.ok){this.db.exec('ROLLBACK');started=false;return current;}
   if(row.id!==postId||row.slug!==current.value.metadata.slug||row.revision!==current.value.metadata.revision||current.value.metadata.revision!==command.expectedDraftRevision||JSON.stringify(current.value)!==JSON.stringify(command.expectedDraft)||JSON.stringify(current.value)!==JSON.stringify(snapshot.post)){
    this.db.exec('ROLLBACK');started=false;return fail('REVISION_CONFLICT','Draft changed before commit');
   }
   // Keep the locked precondition read synchronous; readState is the async public API.
   const head=this.head(postId);
   if(head.generation!==command.expectedGeneration){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_CONFLICT','Publication generation changed');}
   if(head.generation===Number.MAX_SAFE_INTEGER){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_GENERATION_EXHAUSTED','Publication generation exhausted');}
   if(head.firstPublishedAt!==null&&head.firstPublishedAt!==snapshot.firstPublishedAt){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_CONFLICT','First publication timestamp changed');}
   if(head.publishedAt!==null&&Date.parse(snapshot.publishedAt)<=Date.parse(head.publishedAt)){this.db.exec('ROLLBACK');started=false;return fail('INVALID_PUBLICATION_TIME','Publication timestamp must increase');}
   if(head.publishedRevision!==null&&command.expectedDraftRevision<head.publishedRevision){this.db.exec('ROLLBACK');started=false;return fail('REVISION_REGRESSION','Draft revision regressed');}
   this.db.prepare('INSERT INTO publication_snapshots_v1(snapshot_id,post_id,source_revision,payload) VALUES(?,?,?,?)').run(snapshotId,postId,command.expectedDraftRevision,payload);
   if(head.generation===0)this.db.prepare('INSERT INTO publication_heads_v1(post_id,generation,snapshot_id,last_snapshot_id,first_published_at,last_published_at,published_revision) VALUES(?,?,?,?,?,?,?)').run(postId,snapshot.generation,snapshotId,snapshotId,snapshot.firstPublishedAt,snapshot.publishedAt,snapshot.publishedRevision);
   else this.db.prepare('UPDATE publication_heads_v1 SET generation=?,snapshot_id=?,last_snapshot_id=?,first_published_at=?,last_published_at=?,published_revision=? WHERE post_id=?').run(snapshot.generation,snapshotId,snapshotId,snapshot.firstPublishedAt,snapshot.publishedAt,snapshot.publishedRevision,postId);
   const updated:PublicationState={generation:snapshot.generation,snapshotId,lastSnapshotId:snapshotId,firstPublishedAt:snapshot.firstPublishedAt,publishedAt:snapshot.publishedAt,publishedRevision:snapshot.publishedRevision};
   this.db.exec('COMMIT');started=false;
   return {ok:true,value:{state:updated,publication:{snapshotId,snapshot:structuredClone(snapshot)}},diagnostics:[]};
  }catch(error){if(started)try{this.db.exec('ROLLBACK');}catch{}return storageFailure(error,'Could not commit publication');}
 }
 async restorePublication(command:PublicationRestoreCommit):Promise<Result<PublicationState>>{
  if(!command||!isIdentifier(command.postId)||!/^[0-9a-f]{64}$/.test(command.snapshotId)||!count(command.expectedGeneration,1))
   return fail('INVALID_PUBLICATION_INPUT','Invalid restore request');
  const {postId,snapshotId,expectedGeneration}=command;
  // Validate immutable snapshot checksum before entering the synchronous transaction.
  const candidate=await this.readSnapshot(snapshotId);if(!candidate.ok)return candidate;
  if(candidate.value.snapshot.post.document.id!==postId)return fail('SNAPSHOT_POST_MISMATCH','Snapshot belongs to another post');
  let started=false;
  try{
   this.db.exec('BEGIN IMMEDIATE');started=true;
   const head=this.head(postId);
   if(head.generation!==expectedGeneration){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_CONFLICT','Publication generation changed');}
   if(head.generation===Number.MAX_SAFE_INTEGER){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_GENERATION_EXHAUSTED','Publication generation exhausted');}
   const draftRow=this.db.prepare('SELECT id,slug,revision,payload FROM posts_v2 WHERE id=?').get(postId) as Record<string,unknown>|undefined;
   if(!draftRow){this.db.exec('ROLLBACK');started=false;return fail('POST_NOT_FOUND','Post not found');}
   const draft=validatePostRecordV2(JSON.parse(String(draftRow.payload)));
   if(!draft.ok){this.db.exec('ROLLBACK');started=false;return draft;}
   if(draft.value.document.id!==draftRow.id||draft.value.metadata.slug!==draftRow.slug||draft.value.metadata.revision!==draftRow.revision){this.db.exec('ROLLBACK');started=false;return fail('STORAGE_ROW_MISMATCH','Draft row does not match payload');}
   if(candidate.value.snapshot.post.metadata.createdAt!==draft.value.metadata.createdAt){this.db.exec('ROLLBACK');started=false;return fail('CREATED_AT_IMMUTABLE','Creation timestamp differs');}
   if(candidate.value.snapshot.post.metadata.slug!==draft.value.metadata.slug){this.db.exec('ROLLBACK');started=false;return fail('SLUG_RENAME_REQUIRED','Restoring a different slug requires redirect handling');}
   if(head.snapshotId===snapshotId){this.db.exec('COMMIT');started=false;return {ok:true,value:head,diagnostics:[]};}
   this.db.prepare('UPDATE publication_heads_v1 SET generation=generation+1,snapshot_id=?,last_snapshot_id=?,published_revision=? WHERE post_id=?').run(snapshotId,snapshotId,candidate.value.snapshot.publishedRevision,postId);
   const restored:PublicationState={...head,generation:head.generation+1,snapshotId,lastSnapshotId:snapshotId,publishedRevision:candidate.value.snapshot.publishedRevision};
   this.db.exec('COMMIT');started=false;return {ok:true,value:restored,diagnostics:[]};
  }catch(error){if(started)try{this.db.exec('ROLLBACK');}catch{}return storageFailure(error,'Could not restore publication');}
 }
 async unpublishPublication(command:PublicationUnpublishCommit):Promise<Result<PublicationState>>{
  if(!command||!isIdentifier(command.postId)||!count(command.expectedGeneration,1))return fail('INVALID_PUBLICATION_INPUT','Invalid unpublish request');
  let started=false;
  try{
   this.db.exec('BEGIN IMMEDIATE');started=true;
   const head=this.head(command.postId);
   if(head.generation!==command.expectedGeneration){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_CONFLICT','Publication generation changed');}
   if(head.snapshotId===null){this.db.exec('ROLLBACK');started=false;return fail('NOT_PUBLISHED','Post is already private');}
   if(head.generation===Number.MAX_SAFE_INTEGER){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_GENERATION_EXHAUSTED','Publication generation exhausted');}
   this.db.prepare('UPDATE publication_heads_v1 SET snapshot_id=NULL,generation=generation+1 WHERE post_id=?').run(command.postId);
   const unpublished:PublicationState={...head,generation:head.generation+1,snapshotId:null};
   this.db.exec('COMMIT');started=false;return {ok:true,value:unpublished,diagnostics:[]};
  }catch(error){if(started)try{this.db.exec('ROLLBACK');}catch{}return storageFailure(error,'Could not unpublish');}
 }
}
