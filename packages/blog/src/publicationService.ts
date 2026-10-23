import {isIdentifier,isTimestamp,validatePostRecordV2,type PostRecordV2,type Result,type TufteDocument} from '@lexical-tufte/document';
import {renderArticle,RENDER_PROFILE} from '@lexical-tufte/render';
import type {PublicationStore,PublicationCommit} from './publicationStore.js';
import type {PublicationSnapshot,PublishedSnapshot,PublicationState,PublishOptions} from './publication.js';

const fail=(code:string,message:string):Result<never>=>({ok:false,diagnostics:[{code,path:'$.publication',message}]});
const validCount=(n:number,min=0)=>Number.isSafeInteger(n)&&n>=min;
const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');

/**
 * Storage-neutral publication orchestration.
 * Authorization and immutable asset identity are host responsibilities.
 * All compare-and-swap and snapshot visibility guarantees belong to the port.
 */
export class PublicationService{
 constructor(private readonly store:PublicationStore){}

 async publish(postId:string,options:PublishOptions):Promise<Result<PublishedSnapshot>>{
  if(!options||!isIdentifier(postId)||!validCount(options.expectedRevision,1)||!validCount(options.expectedGeneration)||!isTimestamp(options.publishedAt)||typeof options.assetExists!=='function')
   return fail('INVALID_PUBLICATION_INPUT','Invalid publication request');
  try{
   const draft=await this.store.readDraft(postId);if(!draft.ok)return draft;
   const record:PostRecordV2=draft.value;
   if(record.metadata.revision!==options.expectedRevision)return fail('REVISION_CONFLICT','Draft revision changed');
   const state=await this.store.readState(postId);if(!state.ok)return state;
   const head:PublicationState=state.value;
   if(head.generation!==options.expectedGeneration)return fail('PUBLICATION_CONFLICT','Publication generation changed');
   if(head.generation===Number.MAX_SAFE_INTEGER)return fail('PUBLICATION_GENERATION_EXHAUSTED','Publication generation exhausted');
   if(Date.parse(options.publishedAt)<Date.parse(record.metadata.updatedAt)||(head.publishedAt!==null&&Date.parse(options.publishedAt)<=Date.parse(head.publishedAt)))
    return fail('INVALID_PUBLICATION_TIME','Publication must follow draft update and previous publication');
   if(head.publishedRevision!==null&&options.expectedRevision<head.publishedRevision)return fail('REVISION_REGRESSION','Cannot publish an older draft revision');
   if(head.firstPublishedAt!==null&&Date.parse(record.metadata.createdAt)>Date.parse(head.firstPublishedAt))return fail('INVALID_PUBLICATION_TIME','Creation cannot follow first publication');
   if(head.lastSnapshotId){
    const last=await this.store.readSnapshot(head.lastSnapshotId);if(!last.ok)return last;
    if(last.value.snapshot.post.metadata.createdAt!==record.metadata.createdAt)return fail('CREATED_AT_IMMUTABLE','Creation timestamp differs from publication history');
    if(last.value.snapshot.post.metadata.slug!==record.metadata.slug)return fail('SLUG_RENAME_REQUIRED','Published slug changes require a redirect transaction');
   }
   const {editorFormat:_,schemaVersion:__,...legacy}=record.document;
   const rendered=renderArticle({...legacy,schemaVersion:1} satisfies TufteDocument);if(!rendered.ok)return rendered;
   const sources=new Set(record.document.assets.map(asset=>asset.src));
   const scan=(node:{type:string;src?:string;children?:unknown[]})=>{
    if((node.type==='tufte-inline-image'||node.type==='tufte-imagequilt')&&node.src)sources.add(node.src);
    for(const child of node.children??[])scan(child as Parameters<typeof scan>[0]);
   };
   scan(record.document.lexicalState.root);
   for(const src of sources)if(!await options.assetExists(src))return fail('MISSING_PUBLICATION_ASSET','Referenced asset unavailable');
   const snapshot:PublicationSnapshot={
    snapshotVersion:1,post:structuredClone(record),publishedRevision:options.expectedRevision,
    generation:head.generation+1,firstPublishedAt:head.firstPublishedAt??options.publishedAt,
    publishedAt:options.publishedAt,rendererProfile:RENDER_PROFILE,
    assets:structuredClone(record.document.assets),assetSources:[...sources].sort(),html:rendered.html
   };
   const snapshotId=await sha256(JSON.stringify(snapshot));
   const command:PublicationCommit={
    postId,expectedDraftRevision:options.expectedRevision,expectedGeneration:options.expectedGeneration,
    expectedDraft:structuredClone(record),snapshotId,snapshot
   };
   const committed=await this.store.commitPublication(command);if(!committed.ok)return committed;
   return {ok:true,value:committed.value.publication,diagnostics:[]};
  }catch{return fail('PUBLICATION_SERVICE_ERROR','Publication orchestration failed');}
 }
 /**
  * Restore a historical public snapshot. Host authorization and asset checks
  * are preflight checks, not an atomic guarantee against external revocation.
  */
 async restore(postId:string,snapshotId:string,options:{
  expectedGeneration:number;
  authorize:()=>Promise<boolean>;
  assetExists:(src:string)=>Promise<boolean>;
 }):Promise<Result<PublicationState>>{
  if(!isIdentifier(postId)||!/^[0-9a-f]{64}$/.test(snapshotId)||!options||!validCount(options.expectedGeneration,1)||typeof options.authorize!=='function'||typeof options.assetExists!=='function')
   return fail('INVALID_PUBLICATION_INPUT','Invalid restore request');
  try{
   const state=await this.store.readState(postId);if(!state.ok)return state;
   if(state.value.generation!==options.expectedGeneration)return fail('PUBLICATION_CONFLICT','Publication generation changed');
   if(state.value.generation===0)return fail('NOT_PUBLISHED','No publication history');
   if(state.value.generation===Number.MAX_SAFE_INTEGER)return fail('PUBLICATION_GENERATION_EXHAUSTED','Publication generation exhausted');
   if(!await options.authorize())return fail('PUBLICATION_FORBIDDEN','Restore is not authorized');
   const candidate=await this.store.readSnapshot(snapshotId);if(!candidate.ok)return candidate;
   if(candidate.value.snapshot.post.document.id!==postId)return fail('SNAPSHOT_POST_MISMATCH','Snapshot belongs to another post');
   const draft=await this.store.readDraft(postId);if(!draft.ok)return draft;
   if(candidate.value.snapshot.post.metadata.createdAt!==draft.value.metadata.createdAt)return fail('CREATED_AT_IMMUTABLE','Creation timestamp differs');
   if(candidate.value.snapshot.post.metadata.slug!==draft.value.metadata.slug)return fail('SLUG_RENAME_REQUIRED','Restoring a different slug requires redirect handling');
   for(const src of candidate.value.snapshot.assetSources)if(!await options.assetExists(src))return fail('MISSING_PUBLICATION_ASSET','Historical asset unavailable');
   return await this.store.restorePublication({postId,snapshotId,expectedGeneration:options.expectedGeneration});
  }catch{return fail('PUBLICATION_SERVICE_ERROR','Restore orchestration failed');}
 }

 /** Unpublishing requires host authorization, supplied explicitly per call. */
 async unpublish(postId:string,options:{expectedGeneration:number;authorize:()=>Promise<boolean>}):Promise<Result<PublicationState>>{
  if(!isIdentifier(postId)||!options||!validCount(options.expectedGeneration,1)||typeof options.authorize!=='function')
   return fail('INVALID_PUBLICATION_INPUT','Invalid unpublish request');
  try{
   if(!await options.authorize())return fail('PUBLICATION_FORBIDDEN','Unpublish is not authorized');
   return await this.store.unpublishPublication({postId,expectedGeneration:options.expectedGeneration});
  }catch{return fail('PUBLICATION_SERVICE_ERROR','Unpublish orchestration failed');}
 }

}
