import {
 $getNodeByKey,$createTextNode,HISTORY_PUSH_TAG,type LexicalEditor
} from 'lexical';
import type {AssetProvider,AssetLocator} from '@lexical-tufte/editor-ports';
import {InlineImageNode,NoteNode,$createInlineImageNode,$getContainingNote} from '@lexical-tufte/lexical';
import {isUsableResolvedImage} from './hostAssetPolicy.js';

export type HostImageTarget=
 | {kind:'replace';imageKey:string;noteId:string;expectedImage:string}
 | {kind:'append';noteKey:string;noteId:string};

export interface ConnectHostImageOptions{
 editor:LexicalEditor;
 adapter:AssetProvider;
 namespace:string;
 locator:AssetLocator;
 target:HostImageTarget;
 alt:string;
 signal?:AbortSignal;
 /** Prevent committing a response from an obsolete chooser, host or request. */
 isCurrent?:()=>boolean;
}
export type HostImageConnectionResult=
 | {ok:true;expiresAt?:string}
 | {ok:false;reason:'cancelled'|'invalid'|'stale'|'unavailable'};

/**
 * Shared host-asset commit boundary. No UI, globals, persistence or network
 * client. Only this helper resolves the selected locator and mutates the
 * captured image/note after checking the latest Lexical state.
 */
export async function connectHostImage({
 editor,adapter,namespace,locator,target,alt,signal,isCurrent
}:ConnectHostImageOptions):Promise<HostImageConnectionResult>{
 const current=()=>!signal?.aborted&&(isCurrent?.()??true);
 if(!current())return {ok:false,reason:'cancelled'};
 if(!namespace.trim()||!locator.assetId.trim()||
  (locator.revisionId!==undefined&&!locator.revisionId.trim()))
  return {ok:false,reason:'invalid'};
 let resolved;
 try{resolved=await adapter.resolve(locator,signal);}
 catch{return {ok:false,reason:current()?'unavailable':'cancelled'};}
 if(!current())return {ok:false,reason:'cancelled'};
 if(!isUsableResolvedImage(locator,resolved))
  return {ok:false,reason:'invalid'};

 let applied=false;
 const safe=resolved;
 editor.update(()=>{
  if(!current()||!editor.isEditable()||editor.isComposing())return;
  if(target.kind==='append'){
   const note=$getNodeByKey(target.noteKey);
   if(!(note instanceof NoteNode)||note.getNoteId()!==target.noteId)return;
   note.append(
    $createInlineImageNode(safe.url,alt,undefined,undefined,undefined,{
     namespace,assetId:locator.assetId,
     ...(locator.revisionId?{revisionId:safe.revisionId}:{})
    }),
    $createTextNode(' ')
   );
  }else{
   const image=$getNodeByKey(target.imageKey);
   if(!(image instanceof InlineImageNode))return;
   const note=$getContainingNote(image);
   if(!note||note.getNoteId()!==target.noteId||
    JSON.stringify(image.getImageProperties())!==target.expectedImage)return;
   image.setHostAsset({
    namespace,assetId:locator.assetId,
    ...(locator.revisionId?{revisionId:safe.revisionId}:{})
   },safe.url,alt);
  }
  applied=true;
 },{tag:HISTORY_PUSH_TAG,discrete:true});
 if(!current())return {ok:false,reason:'cancelled'};
 return applied?{ok:true,...(safe.expiresAt?{expiresAt:safe.expiresAt}:{})}:
  {ok:false,reason:'stale'};
}
