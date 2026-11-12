import {useEffect,useRef,useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getNodeByKey,$getRoot,$isElementNode,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_MERGE_TAG,HISTORY_PUSH_TAG,type LexicalNode} from 'lexical';
import type {AssetProvider} from '@lexical-tufte/editor-ports';
import type {HostAssetLocator} from '@lexical-tufte/document';
import {InlineImageNode} from '@lexical-tufte/lexical';
import {
 imageRefreshRetryDelay,isUsableResolvedImage,nextImageRefreshAt
} from './hostAssetPolicy.js';

type Candidate={
 key:string;
 locator:HostAssetLocator;
 signature:string;
 src:string;
};
type Tracked={
 signature:string;
 nextAt:number;
 failures:number;
};

const MAX_TIMER_MS=2_147_483_647;

function fingerprint(candidate:{locator:HostAssetLocator;src:string}):string{
 const {assetId,revisionId}=candidate.locator;
 return JSON.stringify([candidate.locator.namespace,assetId,revisionId??null,candidate.src]);
}

/** Request URL reconciliation after a host-controlled document restore. */
export const REFRESH_TUFTE_HOST_ASSETS_COMMAND=createCommand<'restore'|'manual'>('REFRESH_TUFTE_HOST_ASSETS');

export interface HostAssetRefreshProps {
 adapter:AssetProvider;
 namespace:string;
 /** Compatibility: on expiry recheck all images; on failures retry only failed ones. */
 legacyTiming?:boolean;
 /** Allow a manual request to supersede an active automatic resolve. */
 allowManualOverride?:boolean;
 /** Keep the host's existing accessible name for the manual refresh button. */
 buttonLabel?:string;
 /** Send refresh diagnostics to an external host status region. */
 onStatus?:(message:string)=>void;
}

/**
 * Per-Lexical-editor refresh controller. Image locators remain stable; only
 * validated display URLs change. No globals, storage, network client or host auth.
 *
 * An absent expiresAt is treated as unknown: do not poll a permanent URL.
 * Failed resolutions preserve the existing src/locator and retry with backoff.
 */
export function HostAssetRefresh({adapter,namespace,legacyTiming=false,allowManualOverride=false,buttonLabel='호스트 이미지 URL 다시 확인',onStatus}:HostAssetRefreshProps){
 const [editor]=useLexicalComposerContext();
 const [running,setRunning]=useState(false);
 const [status,setStatus]=useState('');
 const manualRef=useRef<()=>void>(()=>{});
 const statusRef=useRef(onStatus);
 statusRef.current=onStatus;
 const notify=(message:string)=>{
  setStatus(message);
  statusRef.current?.(message);
 };

 useEffect(()=>{
  setRunning(false);
  setStatus('');
  let alive=true;
  let generation=0;
  let activeController:AbortController|null=null;
  let lastRefresh=0;
  let timer:ReturnType<typeof setTimeout>|null=null;
  const tracked=new Map<string,Tracked>();

  function stopTimer(){
   if(timer!==null)clearTimeout(timer);
   timer=null;
  }

  function collect():Candidate[]{
   const found:Candidate[]=[];
   editor.getEditorState().read(()=>{
    const visit=(node:LexicalNode):void=>{
     if(node instanceof InlineImageNode){
      const p=node.getImageProperties();
      const locator=p.hostAsset;
      if(locator?.namespace===namespace){
       const candidate={key:node.getKey(),locator,src:p.src,signature:''};
       candidate.signature=fingerprint(candidate);
       found.push(candidate);
      }
     }
     if($isElementNode(node))node.getChildren().forEach(visit);
    };
    visit($getRoot());
   });
   return found;
  }

  function live(g:number,controller:AbortController):boolean{
   return alive&&generation===g&&!controller.signal.aborted;
  }

  function schedule(){
   if(!alive)return;
   stopTimer();
   const items=collect();
   const existing=new Set(items.map(item=>item.key));
   for(const key of tracked.keys())if(!existing.has(key))tracked.delete(key);
   const now=Date.now();
   let next=Number.POSITIVE_INFINITY;
   for(const item of items){
    const old=tracked.get(item.key);
    if(!old||old.signature!==item.signature){next=now;break;}
    next=Math.min(next,old.nextAt);
   }
   if(Number.isFinite(next)){
    timer=setTimeout(()=>{timer=null;void refresh(false);},
     Math.max(0,Math.min(MAX_TIMER_MS,next-now)));
   }
  }

  async function refresh(manual:boolean,forceAll=false){
   if(!alive)return;
   if(activeController){
    if(!manual)return;
    activeController.abort();
    generation++;
    activeController=null;
   }
   stopTimer();
   const all=collect();
   const existing=new Set(all.map(item=>item.key));
   for(const key of tracked.keys())if(!existing.has(key))tracked.delete(key);
   const now=Date.now();
   const dueCandidates=all.filter(item=>{
    const old=tracked.get(item.key);
    return manual||forceAll||!old||old.signature!==item.signature||old.nextAt<=now;
   });
   // The standalone legacy example renewed every linked image on the
   // earliest expiry, but only retried failed locators after a provider error.
   const expireDue=dueCandidates.some(item=>{
    const old=tracked.get(item.key);
    return !old||old.signature!==item.signature||old.failures===0;
   });
   const due=legacyTiming&&!manual&&!forceAll&&expireDue?all:dueCandidates;
   if(!due.length){
    setRunning(false);
    if(manual)notify(all.length?'연결된 이미지 URL은 아직 갱신할 필요가 없습니다.':'갱신할 외부 이미지가 없습니다.');
    schedule();
    return;
   }
   const controller=new AbortController();
   const current=++generation;
   activeController=controller;
   lastRefresh=Date.now();
   setRunning(true);
   notify('호스트 이미지 URL 확인 중…');
   let succeeded=0,failed=0,skipped=0;

   try{
    for(const item of due){
     if(!live(current,controller))break;
     let resolved;
     try{
      const locator={assetId:item.locator.assetId,
       ...(item.locator.revisionId?{revisionId:item.locator.revisionId}:{})};
      resolved=await adapter.resolve(locator,controller.signal);
     }catch{
      if(!live(current,controller))break;
      resolved=null;
     }
     if(!live(current,controller))break;
     if(!isUsableResolvedImage(item.locator,resolved)){
      const previous=tracked.get(item.key);
      const failures=previous?.signature===item.signature?previous.failures+1:1;
      tracked.set(item.key,{
       signature:item.signature,failures,
       nextAt:Date.now()+imageRefreshRetryDelay(failures)
      });
      failed++;
      continue;
     }

     const safeResolved=resolved;

     // No visible change: record expiry without a Lexical update, so neither
     // React onChange nor Undo is disturbed by a redundant resolve.
     if(safeResolved.url===item.src){
      tracked.set(item.key,{
       signature:item.signature,failures:0,
       nextAt:nextImageRefreshAt(safeResolved.expiresAt)
      });
      succeeded++;
      continue;
     }

     let applied=false;
     let updateFailed=false;
     try{
      editor.update(()=>{
      if(!live(current,controller))return;
      const node=$getNodeByKey(item.key);
      if(!(node instanceof InlineImageNode))return;
      const p=node.getImageProperties();
      const candidate={locator:p.hostAsset??{namespace:'',assetId:''},src:p.src};
      // Protect a selection changed while resolve was in flight. A newer
      // asset, namespace, revision, or src must never be overwritten.
      if(fingerprint(candidate)!==item.signature)return;
      node.setHostAsset(item.locator,safeResolved.url,p.alt);
      applied=true;
      },{tag:legacyTiming?HISTORY_PUSH_TAG:HISTORY_MERGE_TAG,discrete:true});
     }catch{
      updateFailed=true;
     }
     if(updateFailed){
      const previous=tracked.get(item.key);
      const failures=previous?.signature===item.signature?previous.failures+1:1;
      tracked.set(item.key,{
       signature:item.signature,failures,
       nextAt:Date.now()+imageRefreshRetryDelay(failures)
      });
      failed++;
      continue;
     }

     if(applied){
      const updated={locator:item.locator,src:safeResolved.url};
      tracked.set(item.key,{
       signature:fingerprint(updated),failures:0,
       nextAt:nextImageRefreshAt(safeResolved.expiresAt)
      });
      succeeded++;
     }else{
      tracked.delete(item.key);
      skipped++;
     }
    }
   }finally{
    if(live(current,controller)){
     activeController=null;
     setRunning(false);
     const prefix=legacyTiming?'외부 이미지 URL 갱신: ':'호스트 이미지 URL 갱신: ';
     if(failed)notify(prefix+succeeded+'/'+due.length+'개, 실패 '+failed+'개, 재시도 예약.');
     else if(succeeded||skipped)notify(prefix+succeeded+'/'+due.length+'개'+(skipped?', 변경된 대상 '+skipped+'개 건너뜀':'')+'.');
       schedule();
    }
   }
  }

  const unregister=editor.registerUpdateListener(({dirtyElements,dirtyLeaves})=>{
   if(!alive||dirtyElements.size===0&&dirtyLeaves.size===0)return;
   // Coalesce document edits while resolve is active, and avoid a synchronous
   // re-entrant refresh from a Lexical update listener.
   if(activeController)return;
   schedule();
  });
  const onResume=()=>{
   if(document.visibilityState!=='visible')return;
   if(legacyTiming&&Date.now()-lastRefresh>60_000){void refresh(false,true);return;}
   schedule();
  };
  document.addEventListener('visibilitychange',onResume);
  window.addEventListener('pageshow',onResume);
  const unregisterRefresh=editor.registerCommand(REFRESH_TUFTE_HOST_ASSETS_COMMAND,()=>{
   if(!alive)return true;
   // The host dispatches the restore request after the replacement
   // Lexical editor state has committed, so one controller handles it.
   void refresh(true);
   return true;
  },COMMAND_PRIORITY_EDITOR);
  schedule();

  // Wire the click handler directly, avoiding DOM/root replacement coupling.
  manualRef.current=()=>void refresh(true);
  return()=>{
   alive=false;generation++;
   stopTimer();
   activeController?.abort();activeController=null;
   unregister();
   unregisterRefresh();
   manualRef.current=()=>{};
   document.removeEventListener('visibilitychange',onResume);
   window.removeEventListener('pageshow',onResume);
  };
 },[adapter,editor,namespace,legacyTiming]);

 const manual=()=>manualRef.current();
 return <div className="host-asset-refresh-controls">
  <button type="button" onClick={manual} disabled={running&&!allowManualOverride}
   aria-busy={running}>{buttonLabel}</button>
  {status&&<p role="status">{status}</p>}
 </div>;
}
