import type {Result} from './types.js';
import {validatePostRecordV2,type PostRecordV2} from './metadata.js';
import type {PostRevisionStoreV2} from './revisionStore.js';

export type PostBackupV2={
 backupFormat:'lexical-tufte-post';backupVersion:1;record:PostRecordV2;
};

/** Explicit backup envelope; no implicit mutation or publication. */
export function createPostBackupV2(input:unknown):Result<PostBackupV2>{
 const validated=validatePostRecordV2(input);
 if(!validated.ok)return validated;
 return {ok:true,value:{
  backupFormat:'lexical-tufte-post',backupVersion:1,
  record:structuredClone(validated.value),
 },diagnostics:[]};
}

export function inspectPostBackupV2(input:unknown):Result<PostBackupV2>{
 if(input===null||typeof input!=='object'||Array.isArray(input)||
  Object.getOwnPropertySymbols(input).length!==0||
  Object.values(Object.getOwnPropertyDescriptors(input)).some(d=>!('value'in d)))
  return {ok:false,diagnostics:[{code:'INVALID_BACKUP',path:'$',message:'Expected plain backup object'}]};
 const obj=input as Record<string,unknown>;
 if(Object.keys(obj).some(k=>!['backupFormat','backupVersion','record'].includes(k))||
  obj.backupFormat!=='lexical-tufte-post'||obj.backupVersion!==1)
  return {ok:false,diagnostics:[{code:'UNSUPPORTED_BACKUP_FORMAT',path:'$',message:'Unsupported backup envelope'}]};
 const validated=validatePostRecordV2(obj.record);
 if(!validated.ok)return {ok:false,diagnostics:validated.diagnostics.map(d=>({...d,path:'$.record'+d.path.slice(1)}))};
 return {ok:true,value:{
  backupFormat:'lexical-tufte-post',backupVersion:1,
  record:structuredClone(validated.value),
 },diagnostics:[]};
}

/** Restore only as a new revision via the storage adapter's atomic CAS. */
export async function restorePostBackupV2(
 store:PostRevisionStoreV2,backup:unknown,current:unknown,expectedRevision:number,
):Promise<Result<PostRecordV2>>{
 const inspected=inspectPostBackupV2(backup);
 if(!inspected.ok)return inspected;
 const live=validatePostRecordV2(current);
 if(!live.ok)return live;
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1||
  live.value.metadata.revision!==expectedRevision)
  return {ok:false,diagnostics:[{code:'REVISION_CONFLICT',path:'$.expectedRevision',message:'Current revision differs'}]};
 if(inspected.value.record.document.id!==live.value.document.id||
  inspected.value.record.metadata.slug!==live.value.metadata.slug)
  return {ok:false,diagnostics:[{code:'BACKUP_IDENTITY_MISMATCH',path:'$.record',message:'Backup must match current id and slug'}]};
 if(expectedRevision===Number.MAX_SAFE_INTEGER)
  return {ok:false,diagnostics:[{code:'REVISION_OVERFLOW',path:'$.expectedRevision',message:'Revision cannot increase'}]};
 const restored:PostRecordV2={
  document:structuredClone(inspected.value.record.document),
  metadata:{...structuredClone(inspected.value.record.metadata),
   revision:expectedRevision+1,createdAt:live.value.metadata.createdAt,
   updatedAt:live.value.metadata.updatedAt},
 };
 return store.compareAndSwap(restored,expectedRevision);
}
