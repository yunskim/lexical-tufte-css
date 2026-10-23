import {isIdentifier,validatePostRecordV2,type PostRecordV2,type Result} from '@lexical-tufte/document';
import {SqlitePublicationStore,type PublicationDatabase,type PublicationState} from './publication.js';
import type {PublicationStore,PublicationCommit,PublicationCommitResult,PublicationRestoreCommit,PublicationUnpublishCommit} from './publicationStore.js';

const fail=(code:string,message:string):Result<never>=>({ok:false,diagnostics:[{code,path:'$.publication',message}]});
const count=(n:number,min=0)=>Number.isSafeInteger(n)&&n>=min;

/**
 * SQLite implementation of the storage-neutral PublicationStore contract.
 * Uses its own synchronous connection; callers must not wrap calls in a host transaction.
 */
export class SqlitePublicationAdapter implements PublicationStore{
 private readonly legacy:SqlitePublicationStore;
 constructor(private readonly db:PublicationDatabase){this.legacy=new SqlitePublicationStore(db);}
 async readDraft(postId:string):Promise<Result<PostRecordV2>>{
  if(!isIdentifier(postId))return fail('INVALID_POST_ID','Invalid post id');
  try{
   const row=this.db.prepare('SELECT id,slug,revision,payload FROM posts_v2 WHERE id=?').get(postId) as Record<string,unknown>|undefined;
   if(!row)return fail('POST_NOT_FOUND','Post not found');
   const checked=validatePostRecordV2(JSON.parse(String(row.payload)));if(!checked.ok)return checked;
   if(checked.value.document.id!==row.id||checked.value.metadata.slug!==row.slug||checked.value.metadata.revision!==row.revision)return fail('STORAGE_ROW_MISMATCH','Draft row does not match payload');
   return checked;
  }catch{return fail('PUBLICATION_STORAGE_ERROR','Could not read draft');}
 }
 async readState(postId:string){return this.legacy.readState(postId);}
 async readSnapshot(snapshotId:string){return this.legacy.readSnapshot(snapshotId);}
 async readPublic(postId:string){return this.legacy.readPublic(postId);}
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
   const state=this.legacy.readState(postId);if(!state.ok){this.db.exec('ROLLBACK');started=false;return state;}
   const head=state.value;
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
  }catch{if(started)try{this.db.exec('ROLLBACK');}catch{}return fail('PUBLICATION_STORAGE_ERROR','Could not commit publication');}
 }
 async restorePublication(command:PublicationRestoreCommit):Promise<Result<PublicationState>>{
  if(!command)return fail('INVALID_PUBLICATION_INPUT','Missing restore request');
  // This low-level port assumes the host already checked authorization and immutable assets.
  // The legacy implementation performs its own preflight before an atomic pointer change.
  return this.legacy.restorePublishedSnapshot(command.postId,command.snapshotId,{expectedGeneration:command.expectedGeneration,authorize:async()=>true,assetExists:async()=>true});
 }
 async unpublishPublication(command:PublicationUnpublishCommit):Promise<Result<PublicationState>>{
  if(!command)return fail('INVALID_PUBLICATION_INPUT','Missing unpublish request');
  return this.legacy.unpublish(command.postId,command.expectedGeneration);
 }
}
