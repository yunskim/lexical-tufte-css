import {isIdentifier,isTimestamp,validatePostRecordV2,type PostRecordV2,type Result,type AssetRef,type TufteDocument} from '@lexical-tufte/document';
import {renderArticle,RENDER_PROFILE} from '@lexical-tufte/render';

export const PUBLICATION_SNAPSHOT_VERSION=1 as const;
/** Synchronous SQLite connection, e.g. node:sqlite DatabaseSync. Not a D1 adapter. */
export interface PublicationDatabase{
 exec(sql:string):unknown;
 prepare(sql:string):{get(...values:(string|number|null)[]):unknown;run(...values:(string|number|null)[]):unknown};
}
export type PublicationSnapshot={snapshotVersion:1;post:PostRecordV2;publishedRevision:number;generation:number;firstPublishedAt:string;publishedAt:string;rendererProfile:string;assets:AssetRef[];assetSources:string[];html:string};
export type PublishedSnapshot={snapshotId:string;snapshot:PublicationSnapshot};
export type PublicationState={generation:number;snapshotId:string|null;lastSnapshotId:string|null;firstPublishedAt:string|null;publishedAt:string|null;publishedRevision:number|null};
export type PublishOptions={expectedRevision:number;expectedGeneration:number;publishedAt:string;assetExists:(src:string)=>Promise<boolean>};
/** Opt-in no-op policy. Only asset-free documents can be compared safely without an immutable asset manifest. */
export type PublishIfChangedOptions=PublishOptions;
export type RestorePublicationOptions={expectedGeneration:number;assetExists:(src:string)=>Promise<boolean>;authorize:()=>Promise<boolean>};
const fail=(code:string,message:string):Result<never>=>({ok:false,diagnostics:[{code,path:'$.publication',message}]});
const validCount=(n:number,min=0)=>Number.isSafeInteger(n)&&n>=min;
const emptyState=():PublicationState=>({generation:0,snapshotId:null,lastSnapshotId:null,firstPublishedAt:null,publishedAt:null,publishedRevision:null});
const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
/** Dedicated connection: methods own their transactions; do not call inside a host transaction. */
export class SqlitePublicationStore{
 constructor(private readonly db:PublicationDatabase){}
 private head(id:string):PublicationState{
  const row=this.db.prepare('SELECT generation,snapshot_id,last_snapshot_id,first_published_at,last_published_at,published_revision FROM publication_heads_v1 WHERE post_id=?').get(id) as Record<string,unknown>|undefined;
  return row?{generation:Number(row.generation),snapshotId:row.snapshot_id as string|null,lastSnapshotId:row.last_snapshot_id as string,firstPublishedAt:String(row.first_published_at),publishedAt:String(row.last_published_at),publishedRevision:Number(row.published_revision)}:emptyState();
 }
 readState(id:string):Result<PublicationState>{
  if(!isIdentifier(id))return fail('INVALID_POST_ID','Invalid post id');
  try{return {ok:true,value:this.head(id),diagnostics:[]};}catch{return fail('PUBLICATION_STORAGE_ERROR','Could not read publication state');}
 }
 private draft(id:string):Result<PostRecordV2>{
  const row=this.db.prepare('SELECT id,slug,revision,payload FROM posts_v2 WHERE id=?').get(id) as Record<string,unknown>|undefined;
  if(!row)return fail('POST_NOT_FOUND','Post not found');
  try{
   const checked=validatePostRecordV2(JSON.parse(String(row.payload)));
   if(!checked.ok)return checked;
   if(checked.value.document.id!==row.id||checked.value.metadata.slug!==row.slug||checked.value.metadata.revision!==row.revision)return fail('STORAGE_ROW_MISMATCH','Draft row does not match payload');
   return checked;
  }catch{return fail('INVALID_STORAGE_JSON','Invalid draft JSON');}
 }
 async publish(id:string,options:PublishOptions):Promise<Result<PublishedSnapshot>>{
  return this.publishInternal(id,options,false);
 }
 async publishIfChanged(id:string,options:PublishIfChangedOptions):Promise<Result<PublishedSnapshot>>{
  return this.publishInternal(id,options,true);
 }
 private async publishInternal(id:string,options:PublishOptions,allowNoOp:boolean):Promise<Result<PublishedSnapshot>>{
  if(!options||typeof options!=='object')return fail('INVALID_PUBLICATION_INPUT','Expected publication options');
  options=Object.freeze({...options});
  if(!isIdentifier(id)||!validCount(options.expectedRevision,1)||!validCount(options.expectedGeneration)||!isTimestamp(options.publishedAt)||typeof options.assetExists!=='function')return fail('INVALID_PUBLICATION_INPUT','Invalid identity, revision, generation, timestamp or asset checker');
  let started=false;
  try{
   const draft=this.draft(id);if(!draft.ok)return draft;
   if(draft.value.metadata.revision!==options.expectedRevision)return fail('REVISION_CONFLICT','Draft revision changed');
   const head=this.head(id);
   if(head.generation!==options.expectedGeneration)return fail('PUBLICATION_CONFLICT','Publication generation changed');
   if(head.generation===Number.MAX_SAFE_INTEGER)return fail('PUBLICATION_GENERATION_EXHAUSTED','Publication generation exhausted');
   if(Date.parse(options.publishedAt)<Date.parse(draft.value.metadata.updatedAt)||(head.publishedAt!==null&&Date.parse(options.publishedAt)<=Date.parse(head.publishedAt)))return fail('INVALID_PUBLICATION_TIME','Publication must follow draft update and previous publication');
   // publishedRevision records the currently active source draft revision; restoring an older
   // public snapshot must not prevent publishing the still-current newer draft.
   if(head.publishedRevision!==null&&options.expectedRevision<head.publishedRevision)return fail('REVISION_REGRESSION','Cannot publish an older draft revision');
   if(head.firstPublishedAt!==null&&Date.parse(draft.value.metadata.createdAt)>Date.parse(head.firstPublishedAt))return fail('INVALID_PUBLICATION_TIME','Creation cannot follow first publication');
   if(head.lastSnapshotId){
    const last=await this.readSnapshot(head.lastSnapshotId);if(!last.ok)return last;
    if(last.value.snapshot.post.metadata.createdAt!==draft.value.metadata.createdAt)return fail('CREATED_AT_IMMUTABLE','Creation timestamp differs from publication history');
    if(last.value.snapshot.post.metadata.slug!==draft.value.metadata.slug)return fail('SLUG_RENAME_REQUIRED','Published slug changes require a separate redirect transaction');
   }
   const {editorFormat:_,schemaVersion:__,...legacy}=draft.value.document;
   const rendered=renderArticle({...legacy,schemaVersion:1} satisfies TufteDocument);if(!rendered.ok)return rendered;
   const sources=new Set(draft.value.document.assets.map(asset=>asset.src));
   const scan=(node:{type:string;src?:string;children?:unknown[]})=>{if((node.type==='tufte-inline-image'||node.type==='tufte-imagequilt')&&node.src)sources.add(node.src);for(const child of node.children??[])scan(child as Parameters<typeof scan>[0]);};
   scan(draft.value.document.lexicalState.root);
   for(const src of sources)if(!await options.assetExists(src))return fail('MISSING_PUBLICATION_ASSET','A referenced publication asset is unavailable');
   let noOp:PublishedSnapshot|null=null;
   if(allowNoOp&&head.snapshotId!==null&&sources.size===0&&draft.value.document.assets.length===0){
    const active=await this.readSnapshot(head.snapshotId);if(!active.ok)return active;
    const previous=active.value.snapshot;
    const publicMetadata=(record:PostRecordV2)=>{const {revision:_,updatedAt:__,status:___,publishedAt:____,...rest}=record.metadata;return rest;};
    if(previous.assetSources.length===0&&previous.assets.length===0&&previous.rendererProfile===RENDER_PROFILE&&JSON.stringify(previous.post.document)===JSON.stringify(draft.value.document)&&JSON.stringify(publicMetadata(previous.post))===JSON.stringify(publicMetadata(draft.value)))noOp=active.value;
   }
   const snapshot:PublicationSnapshot={snapshotVersion:1,post:structuredClone(draft.value),publishedRevision:options.expectedRevision,generation:head.generation+1,firstPublishedAt:head.firstPublishedAt??options.publishedAt,publishedAt:options.publishedAt,rendererProfile:RENDER_PROFILE,assets:structuredClone(draft.value.document.assets),assetSources:[...sources].sort(),html:rendered.html};
   const payload=JSON.stringify(snapshot),snapshotId=await sha256(payload);
   // No await inside the transaction: lock, recheck both heads, insert, pointer switch.
   this.db.exec('BEGIN IMMEDIATE');started=true;
   const current=this.draft(id);
   if(!current.ok){this.db.exec('ROLLBACK');started=false;return current;}
   if(current.value.metadata.revision!==options.expectedRevision||JSON.stringify(current.value)!==JSON.stringify(draft.value)){this.db.exec('ROLLBACK');started=false;return fail('REVISION_CONFLICT','Draft changed during publication preflight');}
   if(this.head(id).generation!==options.expectedGeneration){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_CONFLICT','Publication changed during preflight');}
   if(noOp){
    const currentHead=this.head(id);
    if(currentHead.snapshotId!==noOp.snapshotId){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_CONFLICT','Active publication changed');}
    this.db.exec('COMMIT');started=false;
    return {ok:true,value:structuredClone(noOp),diagnostics:[]};
   }
   this.db.prepare('INSERT INTO publication_snapshots_v1(snapshot_id,post_id,source_revision,payload) VALUES(?,?,?,?)').run(snapshotId,id,options.expectedRevision,payload);
   if(head.generation===0)this.db.prepare('INSERT INTO publication_heads_v1(post_id,generation,snapshot_id,last_snapshot_id,first_published_at,last_published_at,published_revision) VALUES(?,?,?,?,?,?,?)').run(id,snapshot.generation,snapshotId,snapshotId,snapshot.firstPublishedAt,snapshot.publishedAt,snapshot.publishedRevision);
   else this.db.prepare('UPDATE publication_heads_v1 SET generation=?,snapshot_id=?,last_snapshot_id=?,first_published_at=?,last_published_at=?,published_revision=? WHERE post_id=?').run(snapshot.generation,snapshotId,snapshotId,snapshot.firstPublishedAt,snapshot.publishedAt,snapshot.publishedRevision,id);
   this.db.exec('COMMIT');started=false;
   return {ok:true,value:{snapshotId,snapshot:structuredClone(snapshot)},diagnostics:[]};
  }catch{if(started)try{this.db.exec('ROLLBACK');}catch{/* Preserve original storage failure. */}return fail('PUBLICATION_STORAGE_ERROR','Publication preflight or storage failed; no successful publication was reported');}
 }
 /** Re-expose a historical immutable snapshot without changing the current draft. */
 async restorePublishedSnapshot(id:string,snapshotId:string,options:RestorePublicationOptions):Promise<Result<PublicationState>>{
  if(!isIdentifier(id)||!/^[0-9a-f]{64}$/.test(snapshotId)||!options||!validCount(options.expectedGeneration,1)||typeof options.authorize!=='function'||typeof options.assetExists!=='function')return fail('INVALID_PUBLICATION_INPUT','Invalid restore request');
  let started=false;
  try{
   const before=this.head(id);
   if(before.generation!==options.expectedGeneration)return fail('PUBLICATION_CONFLICT','Publication generation changed');
   if(before.generation===Number.MAX_SAFE_INTEGER)return fail('PUBLICATION_GENERATION_EXHAUSTED','Publication generation exhausted');
   if(!await options.authorize())return fail('PUBLICATION_FORBIDDEN','Restore is not authorized');
   const candidate=await this.readSnapshot(snapshotId);if(!candidate.ok)return candidate;
   if(candidate.value.snapshot.post.document.id!==id)return fail('SNAPSHOT_POST_MISMATCH','Snapshot belongs to another post');
   const draft=this.draft(id);if(!draft.ok)return draft;
   if(candidate.value.snapshot.post.metadata.createdAt!==draft.value.metadata.createdAt)return fail('CREATED_AT_IMMUTABLE','Creation timestamp differs');
   if(candidate.value.snapshot.post.metadata.slug!==draft.value.metadata.slug)return fail('SLUG_RENAME_REQUIRED','Restoring a different slug requires redirect handling');
   for(const src of candidate.value.snapshot.assetSources)if(!await options.assetExists(src))return fail('MISSING_PUBLICATION_ASSET','Historical publication asset is unavailable');
   this.db.exec('BEGIN IMMEDIATE');started=true;
   const current=this.head(id);
   if(current.generation!==options.expectedGeneration){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_CONFLICT','Publication changed during restore');}
   if(current.snapshotId===snapshotId){this.db.exec('COMMIT');started=false;return {ok:true,value:current,diagnostics:[]};}
   const latest=this.draft(id);if(!latest.ok){this.db.exec('ROLLBACK');started=false;return latest;}
   if(latest.value.metadata.slug!==draft.value.metadata.slug||latest.value.metadata.createdAt!==draft.value.metadata.createdAt){this.db.exec('ROLLBACK');started=false;return fail('REVISION_CONFLICT','Draft identity changed during restore');}
   this.db.prepare('UPDATE publication_heads_v1 SET generation=generation+1,snapshot_id=?,last_snapshot_id=?,published_revision=? WHERE post_id=?').run(snapshotId,snapshotId,candidate.value.snapshot.publishedRevision,id);
   const restored:PublicationState={...current,generation:current.generation+1,snapshotId,lastSnapshotId:snapshotId,publishedRevision:candidate.value.snapshot.publishedRevision};
   this.db.exec('COMMIT');started=false;
   return {ok:true,value:restored,diagnostics:[]};
  }catch{if(started)try{this.db.exec('ROLLBACK');}catch{}return fail('PUBLICATION_STORAGE_ERROR','Could not restore published snapshot');}
 }
 unpublish(id:string,expectedGeneration:number):Result<PublicationState>{
  if(!isIdentifier(id)||!validCount(expectedGeneration,1))return fail('INVALID_PUBLICATION_INPUT','Invalid id or publication generation');
  let started=false;
  try{
   this.db.exec('BEGIN IMMEDIATE');started=true;
   const head=this.head(id);
   if(head.generation!==expectedGeneration){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_CONFLICT','Publication generation changed');}
   if(head.snapshotId===null){this.db.exec('ROLLBACK');started=false;return fail('NOT_PUBLISHED','Post is already private');}
   if(head.generation===Number.MAX_SAFE_INTEGER){this.db.exec('ROLLBACK');started=false;return fail('PUBLICATION_GENERATION_EXHAUSTED','Publication generation exhausted');}
   this.db.prepare('UPDATE publication_heads_v1 SET snapshot_id=NULL,generation=generation+1 WHERE post_id=?').run(id);
   this.db.exec('COMMIT');started=false;return this.readState(id);
  }catch{if(started)try{this.db.exec('ROLLBACK');}catch{}return fail('PUBLICATION_STORAGE_ERROR','Could not unpublish');}
 }
 private async decode(snapshotId:string,payload:unknown,postId:unknown,revision:unknown):Promise<Result<PublishedSnapshot>>{
  if(typeof payload!=='string'||await sha256(payload)!==snapshotId)return fail('SNAPSHOT_INTEGRITY_ERROR','Snapshot checksum mismatch');
  try{
   const snapshot=JSON.parse(payload) as PublicationSnapshot,checked=validatePostRecordV2(snapshot.post);
   if(!checked.ok)return checked;
   if(snapshot.snapshotVersion!==1||checked.value.document.id!==postId||snapshot.publishedRevision!==revision||snapshot.publishedRevision!==checked.value.metadata.revision||typeof snapshot.html!=='string'||!isTimestamp(snapshot.firstPublishedAt)||!isTimestamp(snapshot.publishedAt)||Date.parse(snapshot.firstPublishedAt)>Date.parse(snapshot.publishedAt))return fail('INVALID_PUBLICATION_SNAPSHOT','Invalid snapshot envelope');
   return {ok:true,value:{snapshotId,snapshot:structuredClone(snapshot)},diagnostics:[]};
  }catch{return fail('INVALID_PUBLICATION_SNAPSHOT','Invalid snapshot JSON');}
 }
 async readSnapshot(snapshotId:string):Promise<Result<PublishedSnapshot>>{
  if(!/^[0-9a-f]{64}$/.test(snapshotId))return fail('INVALID_SNAPSHOT_ID','Invalid snapshot hash');
  try{const row=this.db.prepare('SELECT payload,post_id,source_revision FROM publication_snapshots_v1 WHERE snapshot_id=?').get(snapshotId) as Record<string,unknown>|undefined;return row?await this.decode(snapshotId,row.payload,row.post_id,row.source_revision):fail('SNAPSHOT_NOT_FOUND','Snapshot not found');}catch{return fail('PUBLICATION_STORAGE_ERROR','Could not read snapshot');}
 }
 async readPublic(id:string):Promise<Result<PublishedSnapshot>>{
  if(!isIdentifier(id))return fail('INVALID_POST_ID','Invalid post id');
  try{
   // One coherent SELECT: never combine a mutable draft with publication metadata.
   const row=this.db.prepare('SELECT s.snapshot_id,s.payload,s.post_id,s.source_revision FROM publication_heads_v1 h JOIN publication_snapshots_v1 s ON s.snapshot_id=h.snapshot_id AND s.post_id=h.post_id WHERE h.post_id=?').get(id) as Record<string,unknown>|undefined;
   return row?await this.decode(String(row.snapshot_id),row.payload,row.post_id,row.source_revision):fail('NOT_PUBLISHED','No active public snapshot');
  }catch{return fail('PUBLICATION_STORAGE_ERROR','Could not read public snapshot');}
 }
}
