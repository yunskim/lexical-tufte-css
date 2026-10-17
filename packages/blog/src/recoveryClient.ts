import type {Result} from '@lexical-tufte/document';
/** Browser-only structural DTOs; do not import server modules here. */
export type RecoveryClientSlot={postId:string;sessionId:string;sequence:number;baseRevision:number;savedAt:string;payload:string;checksum:string};
export type RecoveryClientMetadata=Omit<RecoveryClientSlot,'payload'>;

export type RecoveryClientFetch=(input:string,init?:RequestInit)=>Promise<Response>;
export type RecoveryClientOptions={
 baseUrl:string;
 fetcher?:RecoveryClientFetch;
 /** Host supplies CSRF headers for mutations. Never embed credentials or tokens in drafts. */
 headers?:()=>HeadersInit|Promise<HeadersInit>;
};
const failure=(code:string,message:string):Result<never>=>({ok:false,diagnostics:[{code,path:'$.recovery',message}]});
const identifier=(s:string)=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s);
const validResult=(value:unknown):value is Result<unknown>=>{
 if(!value||typeof value!=='object')return false;
 const obj=value as Record<string,unknown>;
 return typeof obj.ok==='boolean'&&Array.isArray(obj.diagnostics)&&
  (obj.ok===false||'value' in obj);
};
/** Browser-safe network client. Import this module directly; do not import the Node SQLite barrel into browser bundles. */
export class RecoveryHttpClient{
 private readonly base:string;
 private readonly fetcher:RecoveryClientFetch;
 constructor(private readonly options:RecoveryClientOptions){
  this.base=options.baseUrl.replace(/\/$/,'');
  this.fetcher=options.fetcher??((input,init)=>fetch(input,init));
 }
 private async send<T>(method:'GET'|'PUT'|'DELETE',postId:string,sessionId?:string,body?:unknown):Promise<Result<T>>{
  if(!identifier(postId)||(sessionId!==undefined&&!identifier(sessionId)))
   return failure('INVALID_RECOVERY_INPUT','Invalid recovery identity');
  try{
   const headers=new Headers(await this.options.headers?.());
   if(method!=='GET')headers.set('content-type','application/json');
   const response=await this.fetcher(this.base+'/posts/'+encodeURIComponent(postId)+'/recoveries'+(sessionId===undefined?'':'/'+encodeURIComponent(sessionId)),{
    method,headers,credentials:'same-origin',cache:'no-store',
    ...(method==='GET'?{}:{body:JSON.stringify(body)})
   });
   let parsed:unknown;
   try{parsed=await response.json();}catch{return failure('RECOVERY_PROTOCOL_ERROR','Invalid recovery JSON response');}
   if(!validResult(parsed))return failure('RECOVERY_PROTOCOL_ERROR','Invalid recovery response');
   if(response.ok!==(parsed as Result<unknown>).ok)return failure('RECOVERY_PROTOCOL_ERROR','HTTP status and recovery result disagree');
   return parsed as Result<T>;
  }catch{return failure('RECOVERY_NETWORK_ERROR','Recovery request failed');}
 }
 list(postId:string):Promise<Result<RecoveryClientMetadata[]>>{return this.send('GET',postId);}
 read(postId:string,sessionId:string):Promise<Result<RecoveryClientSlot|null>>{return this.send('GET',postId,sessionId);}
 save(input:Omit<RecoveryClientSlot,'checksum'>,expectedSequence:number):Promise<Result<RecoveryClientSlot>>{
  return this.send('PUT',input.postId,input.sessionId,{...input,expectedSequence});
 }
 remove(postId:string,sessionId:string,expectedSequence:number):Promise<Result<boolean>>{
  return this.send('DELETE',postId,sessionId,{expectedSequence});
 }
}
