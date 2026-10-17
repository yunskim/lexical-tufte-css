import {isIdentifier,type Result} from '@lexical-tufte/document';
import {SqliteEditorRecoveryStore,type RecoverySlot} from './recovery.js';

export type RecoveryOperation='list'|'read'|'save'|'remove';
export type RecoveryAccess={postId:string;sessionId?:string;operation:RecoveryOperation};
export type RecoveryAuthorizer=(request:RecoveryAccess)=>boolean|Promise<boolean>;
export type RecoveryMetadata=Pick<RecoverySlot,'postId'|'sessionId'|'sequence'|'baseRevision'|'savedAt'|'checksum'>;
const fail=(code:string,message:string):Result<never>=>({ok:false,diagnostics:[{code,path:'$.recovery',message}]});
/** Server-side adapter. The host must authenticate callers and enforce CSRF protections before invocation. */
export class AuthorizedRecoveryService{
 constructor(private readonly store:SqliteEditorRecoveryStore,private readonly authorize:RecoveryAuthorizer){}
 private async allowed(operation:RecoveryOperation,postId:string,sessionId?:string):Promise<Result<true>>{
  if(!isIdentifier(postId)||(sessionId!==undefined&&!isIdentifier(sessionId)))
   return fail('INVALID_RECOVERY_INPUT','Invalid recovery identity');
  try{
   if(!await this.authorize({operation,postId,sessionId}))
    return fail('RECOVERY_ACCESS_DENIED','Recovery access denied');
   return {ok:true,value:true,diagnostics:[]};
  }catch{return fail('RECOVERY_ACCESS_DENIED','Recovery authorization failed');}
 }
 async list(postId:string):Promise<Result<RecoveryMetadata[]>>{
  const access=await this.allowed('list',postId);return access.ok?this.store.list(postId):access;
 }
 async read(postId:string,sessionId:string):Promise<Result<RecoverySlot|null>>{
  const access=await this.allowed('read',postId,sessionId);return access.ok?this.store.read(postId,sessionId):access;
 }
 async save(input:Omit<RecoverySlot,'checksum'>,expectedSequence:number):Promise<Result<RecoverySlot>>{
  if(!input||typeof input!=='object')return fail('INVALID_RECOVERY_INPUT','Invalid recovery input');
  const access=await this.allowed('save',input.postId,input.sessionId);
  return access.ok?this.store.save(input,expectedSequence):access;
 }
 async remove(postId:string,sessionId:string,expectedSequence:number):Promise<Result<boolean>>{
  const access=await this.allowed('remove',postId,sessionId);
  return access.ok?this.store.remove(postId,sessionId,expectedSequence):access;
 }
}
