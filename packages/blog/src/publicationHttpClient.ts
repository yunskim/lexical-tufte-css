import type {Result} from '@lexical-tufte/document';
import type {PublicationState,PublishedSnapshot} from './publication.js';

export type PublicationHttpFetch=(input:string,init?:RequestInit)=>Promise<Response>;
export type PublicationHttpOptions={
 baseUrl:string;
 fetcher?:PublicationHttpFetch;
 /** Host-provided CSRF headers; credentials are never embedded in publication DTOs. */
 headers?:()=>HeadersInit|Promise<HeadersInit>;
};
const fail=(code:string,message:string):Result<never>=>({ok:false,diagnostics:[{code,path:'$.publication',message}]});
const identifier=(value:string)=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
const snapshotId=(value:string)=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const count=(value:number,min=0)=>Number.isSafeInteger(value)&&value>=min;
const envelope=(value:unknown):value is Result<unknown>=>{
 if(!value||typeof value!=='object')return false;
 const record=value as Record<string,unknown>;
 return typeof record.ok==='boolean'&&Array.isArray(record.diagnostics)&&
  (record.ok===false||Object.hasOwn(record,'value'));
};

/** Browser-safe transport for the FastAPI-owned publication lifecycle. */
export class PublicationHttpClient{
 private readonly base:string;
 private readonly fetcher:PublicationHttpFetch;
 constructor(private readonly options:PublicationHttpOptions){
  this.base=options.baseUrl.replace(/\/$/,'');
  this.fetcher=options.fetcher??((input,init)=>fetch(input,init));
 }
 private async send<T>(method:'GET'|'POST',postId:string,suffix='',body?:unknown):Promise<Result<T>>{
  if(!identifier(postId))return fail('INVALID_POST_ID','Invalid post id');
  try{
   const headers=new Headers(await this.options.headers?.());
   if(method==='POST')headers.set('content-type','application/json');
   const response=await this.fetcher(this.base+'/posts/'+encodeURIComponent(postId)+'/publication'+suffix,{
    method,headers,credentials:'same-origin',cache:'no-store',
    ...(method==='POST'?{body:JSON.stringify(body)}:{})
   });
   let payload:unknown;
   try{payload=await response.json();}catch{return fail('PUBLICATION_PROTOCOL_ERROR','Invalid JSON response');}
   if(!envelope(payload)||response.ok!==(payload as Result<unknown>).ok)
    return fail('PUBLICATION_PROTOCOL_ERROR','Invalid publication response envelope');
   return payload as Result<T>;
  }catch{return fail('PUBLICATION_NETWORK_ERROR','Publication request failed');}
 }
 readState(postId:string):Promise<Result<PublicationState>>{return this.send('GET',postId);}
 readPublic(postId:string):Promise<Result<PublishedSnapshot>>{return this.send('GET',postId,'/public');}
 readSnapshot(postId:string,id:string):Promise<Result<PublishedSnapshot>>{
  return snapshotId(id)?this.send('GET',postId,'/snapshots/'+id):Promise.resolve(fail('INVALID_SNAPSHOT_ID','Invalid snapshot id'));
 }
 publish(postId:string,input:{expectedRevision:number;expectedGeneration:number;publishedAt:string}):Promise<Result<PublishedSnapshot>>{
  if(!input||!count(input.expectedRevision,1)||!count(input.expectedGeneration)||typeof input.publishedAt!=='string')
   return Promise.resolve(fail('INVALID_PUBLICATION_INPUT','Invalid publish request'));
  return this.send('POST',postId,'/publish',input);
 }
 restore(postId:string,input:{snapshotId:string;expectedGeneration:number}):Promise<Result<PublicationState>>{
  if(!input||!snapshotId(input.snapshotId)||!count(input.expectedGeneration,1))
   return Promise.resolve(fail('INVALID_PUBLICATION_INPUT','Invalid restore request'));
  return this.send('POST',postId,'/restore',input);
 }
 unpublish(postId:string,input:{expectedGeneration:number}):Promise<Result<PublicationState>>{
  if(!input||!count(input.expectedGeneration,1))
   return Promise.resolve(fail('INVALID_PUBLICATION_INPUT','Invalid unpublish request'));
  return this.send('POST',postId,'/unpublish',input);
 }
}
