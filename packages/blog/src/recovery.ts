import {isIdentifier,isTimestamp,type Result} from '@lexical-tufte/document';
import type {PublicationDatabase} from './publication.js';

export type RecoverySlot={postId:string;sessionId:string;sequence:number;baseRevision:number;savedAt:string;payload:string;checksum:string};
const fail=(code:string,message:string):Result<never>=>({ok:false,diagnostics:[{code,path:'$.recovery',message}]});
const integer=(n:number,min:number)=>Number.isSafeInteger(n)&&n>=min;
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const MAX_BYTES=2_000_000;
/** Raw Lexical JSON recovery is not a validated or publishable Tufte document. */
export class SqliteEditorRecoveryStore{
 constructor(private readonly db:PublicationDatabase){}
 async save(input:Omit<RecoverySlot,'checksum'>,expectedSequence:number):Promise<Result<RecoverySlot>>{
  if(!input||!isIdentifier(input.postId)||!isIdentifier(input.sessionId)||!integer(input.sequence,1)||
   !integer(input.baseRevision,0)||!integer(expectedSequence,0)||input.sequence!==expectedSequence+1||
   !isTimestamp(input.savedAt)||typeof input.payload!=='string'||
   new TextEncoder().encode(input.payload).length>MAX_BYTES)
   return fail('INVALID_RECOVERY_INPUT','Invalid recovery metadata, sequence or size');
  try{JSON.parse(input.payload);}catch{return fail('INVALID_RECOVERY_JSON','Recovery payload must be JSON');}
  const slot:RecoverySlot={...input,checksum:await digest(input.payload)};
  let started=false;
  try{
   this.db.exec('BEGIN IMMEDIATE');started=true;
   const row=this.db.prepare('SELECT sequence FROM editor_recovery_v1 WHERE post_id=? AND session_id=?').get(input.postId,input.sessionId) as {sequence:number}|undefined;
   const current=row?.sequence??0;
   if(current!==expectedSequence){this.db.exec('ROLLBACK');started=false;return fail('RECOVERY_CONFLICT','Recovery sequence changed');}
   if(row)this.db.prepare('UPDATE editor_recovery_v1 SET sequence=?,base_revision=?,saved_at=?,payload=?,checksum=? WHERE post_id=? AND session_id=?')
    .run(slot.sequence,slot.baseRevision,slot.savedAt,slot.payload,slot.checksum,slot.postId,slot.sessionId);
   else this.db.prepare('INSERT INTO editor_recovery_v1(post_id,session_id,sequence,base_revision,saved_at,payload,checksum) VALUES(?,?,?,?,?,?,?)')
    .run(slot.postId,slot.sessionId,slot.sequence,slot.baseRevision,slot.savedAt,slot.payload,slot.checksum);
   this.db.exec('COMMIT');started=false;return {ok:true,value:slot,diagnostics:[]};
  }catch{if(started)try{this.db.exec('ROLLBACK');}catch{}return fail('RECOVERY_STORAGE_ERROR','Recovery save failed');}
 }
 remove(postId:string,sessionId:string,expectedSequence:number):Result<boolean>{
  if(!isIdentifier(postId)||!isIdentifier(sessionId)||!integer(expectedSequence,1))
   return fail('INVALID_RECOVERY_INPUT','Invalid recovery identity or sequence');
  let started=false;
  try{
   this.db.exec('BEGIN IMMEDIATE');started=true;
   const row=this.db.prepare('SELECT sequence FROM editor_recovery_v1 WHERE post_id=? AND session_id=?')
    .get(postId,sessionId) as {sequence:number}|undefined;
   if(!row||row.sequence!==expectedSequence){
    this.db.exec('ROLLBACK');started=false;
    return fail('RECOVERY_CONFLICT','Recovery missing or sequence changed');
   }
   this.db.prepare('DELETE FROM editor_recovery_v1 WHERE post_id=? AND session_id=? AND sequence=?')
    .run(postId,sessionId,expectedSequence);
   this.db.exec('COMMIT');started=false;
   return {ok:true,value:true,diagnostics:[]};
  }catch{
   if(started)try{this.db.exec('ROLLBACK');}catch{}
   return fail('RECOVERY_STORAGE_ERROR','Recovery removal failed');
  }
 }
 /** Enumerate recovery metadata without returning raw drafts; each payload is integrity checked on read. */
 list(postId:string):Result<Array<Pick<RecoverySlot,'postId'|'sessionId'|'sequence'|'baseRevision'|'savedAt'|'checksum'>>>{
  if(!isIdentifier(postId))return fail('INVALID_RECOVERY_INPUT','Invalid recovery identity');
  try{
   const rows=this.db.prepare('SELECT post_id,session_id,sequence,base_revision,saved_at,checksum FROM editor_recovery_v1 WHERE post_id=? ORDER BY saved_at DESC,session_id ASC').all(postId) as Array<Record<string,unknown>>;
   return {ok:true,value:rows.map(row=>({postId:String(row.post_id),sessionId:String(row.session_id),sequence:Number(row.sequence),baseRevision:Number(row.base_revision),savedAt:String(row.saved_at),checksum:String(row.checksum)})),diagnostics:[]};
  }catch{return fail('RECOVERY_STORAGE_ERROR','Recovery list failed');}
 }
 async read(postId:string,sessionId:string):Promise<Result<RecoverySlot|null>>{
  if(!isIdentifier(postId)||!isIdentifier(sessionId))return fail('INVALID_RECOVERY_INPUT','Invalid recovery identity');
  try{
   const row=this.db.prepare('SELECT post_id,session_id,sequence,base_revision,saved_at,payload,checksum FROM editor_recovery_v1 WHERE post_id=? AND session_id=?')
    .get(postId,sessionId) as Record<string,unknown>|undefined;
   if(!row)return {ok:true,value:null,diagnostics:[]};
   const slot:RecoverySlot={postId:String(row.post_id),sessionId:String(row.session_id),sequence:Number(row.sequence),baseRevision:Number(row.base_revision),savedAt:String(row.saved_at),payload:String(row.payload),checksum:String(row.checksum)};
   if(await digest(slot.payload)!==slot.checksum)return fail('RECOVERY_INTEGRITY_ERROR','Recovery checksum mismatch');
   return {ok:true,value:slot,diagnostics:[]};
  }catch{return fail('RECOVERY_STORAGE_ERROR','Recovery read failed');}
 }
}
