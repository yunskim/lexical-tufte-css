import type {Result} from '@lexical-tufte/document';
import {AuthorizedRecoveryService} from './recoveryHost.js';
import type {RecoverySlot} from './recovery.js';

export type RecoveryHttpRequest={
 method:'GET'|'PUT'|'DELETE';
 postId:string;
 sessionId?:string;
 body?:unknown;
 /** Host-authenticated identity and CSRF verification must happen before calling this handler. */
};
export type RecoveryHttpResponse={status:number;body:Result<unknown>};
const failure=(code:string,message:string,status:number):RecoveryHttpResponse=>({
 status,body:{ok:false,diagnostics:[{code,path:'$.recovery',message}]}
});
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const statusFor=(result:Result<unknown>):number=>{
 if(result.ok)return 200;
 const code=result.diagnostics[0]?.code;
 if(code==='RECOVERY_ACCESS_DENIED')return 403;
 if(code==='RECOVERY_CONFLICT')return 409;
 if(code==='RECOVERY_INTEGRITY_ERROR')return 422;
 if(code==='RECOVERY_STORAGE_ERROR')return 503;
 return 400;
};
/** Framework-neutral dispatch only. No HTTP listener, authentication, or CSRF middleware is installed. */
export async function handleRecoveryRequest(service:AuthorizedRecoveryService,request:RecoveryHttpRequest):Promise<RecoveryHttpResponse>{
 if(!request||!['GET','PUT','DELETE'].includes(request.method))
  return failure('RECOVERY_METHOD_NOT_ALLOWED','Unsupported recovery method',405);
 let result:Result<unknown>;
 if(request.method==='GET'){
  result=request.sessionId===undefined?await service.list(request.postId):await service.read(request.postId,request.sessionId);
 }else if(request.method==='PUT'){
  if(request.sessionId===undefined||!object(request.body)||
   request.body.postId!==request.postId||request.body.sessionId!==request.sessionId||
   typeof request.body.expectedSequence!=='number')
   return failure('INVALID_RECOVERY_INPUT','Recovery identity or expected sequence mismatch',400);
  const {expectedSequence,...slot}=request.body;
  result=await service.save(slot as Omit<RecoverySlot,'checksum'>,expectedSequence);
 }else{
  if(request.sessionId===undefined||!object(request.body)||typeof request.body.expectedSequence!=='number')
   return failure('INVALID_RECOVERY_INPUT','Expected deletion sequence',400);
  result=await service.remove(request.postId,request.sessionId,request.body.expectedSequence);
 }
 return {status:statusFor(result),body:result};
}
