import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getRoot,$getSelection,$isElementNode,$isRangeSelection,type LexicalNode} from 'lexical';
import {connectHostImage,type HostImageTarget} from './hostAssetConnection.js';
import {searchHostImages,listHostImageRevisions} from './hostAssetCatalog.js';
import type {AssetProvider,AssetRevision,AssetSummary} from '@lexical-tufte/editor-ports';
import {InlineImageNode,NoteNode} from '@lexical-tufte/lexical';

export type HostAssetPickerProps={
 adapter:AssetProvider;
 namespace:string;
 /** Standalone compatibility: when there is one existing image, replace it
  *  instead of implicitly inserting another image in the selected note. */
 preferExistingTarget?:boolean;
};

type ImageTarget={key:string;noteId:string;src:string;alt:string;expectedImage:string};
const INSERT_TARGET='__insert-into-current-note__';

/** Image-only host picker; the host owns credentials, upload, persistence and signed URLs. */
export function HostAssetPicker({adapter,namespace,preferExistingTarget=false}:HostAssetPickerProps){
 const [editor]=useLexicalComposerContext();
 const instanceId=useId();
 const titleId=instanceId+'-title',searchId=instanceId+'-search',altId=instanceId+'-alt';
 const trigger=useRef<HTMLButtonElement>(null);
 const dialog=useRef<HTMLDivElement>(null);
 const searchInput=useRef<HTMLInputElement>(null);
 const pendingResolve=useRef<AbortController|null>(null);
 const generation=useRef(0);
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [targets,setTargets]=useState<ImageTarget[]>([]);
 const [noteKey,setNoteKey]=useState<string|null>(null);
 const [noteIdentity,setNoteIdentity]=useState<string|null>(null);
 const [targetKey,setTargetKey]=useState<string>('');
 const [results,setResults]=useState<AssetSummary[]>([]);
 const [assetId,setAssetId]=useState('');
 const [revisions,setRevisions]=useState<AssetRevision[]>([]);
 const [revisionId,setRevisionId]=useState('');
 const [alt,setAlt]=useState('');
 const [searchBusy,setSearchBusy]=useState(false);
 const [revisionsBusy,setRevisionsBusy]=useState(false);
 const [resolving,setResolving]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('');
 const mounted=useRef(true);
 const currentConfig=useRef({adapter,namespace});
 currentConfig.current={adapter,namespace};

 const abortResolve=()=>{
  generation.current++;
  pendingResolve.current?.abort();
  pendingResolve.current=null;
  setResolving(false);
 };
 const close=()=>{
  abortResolve();
  setOpen(false);
  setError('');
  queueMicrotask(()=>{
   // Other editors can have their own modal open while this one closes.
   // Never steal focus from a sibling modal; only restore our own trigger
   // when this was the last active modal.
   const anotherModal=[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
    .some(element=>element!==dialog.current);
   if(!anotherModal)trigger.current?.focus();
  });
 };
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;pendingResolve.current?.abort();};},[]);

 const openPicker=()=>{
  const found:ImageTarget[]=[];
  let currentNote:string|null=null;
  let currentNoteId:string|null=null;
  editor.getEditorState().read(()=>{
   const selected=$getSelection();
   if($isRangeSelection(selected)){
    for(let node:LexicalNode|null=selected.anchor.getNode();node;node=node.getParent()){
     if(node instanceof NoteNode){currentNote=node.getKey();currentNoteId=node.getNoteId();break;}
    }
   }
   const visit=(node:LexicalNode,note:NoteNode|null)=>{
    const containing=node instanceof NoteNode?node:note;
    if(node instanceof InlineImageNode&&containing){
     const properties=node.getImageProperties();
     found.push({key:node.getKey(),noteId:containing.getNoteId(),src:properties.src,alt:properties.alt,expectedImage:JSON.stringify(properties)});
    }
    if($isElementNode(node))node.getChildren().forEach(child=>visit(child,containing));
   };
   visit($getRoot(),null);
  });
  abortResolve();
  setTargets(found);
  setNoteKey(currentNote);
  setNoteIdentity(currentNoteId);
  const defaultImage=found.length===1?found[0]:null;
  const preferReplace=preferExistingTarget&&defaultImage!==null;
  setTargetKey(preferReplace&&defaultImage?defaultImage.key:currentNote?INSERT_TARGET:defaultImage?.key??'');
  setAlt(preferReplace&&defaultImage?defaultImage.alt:currentNote?'':defaultImage?.alt??'');
  setQuery('');setAssetId('');setRevisionId('');setResults([]);setRevisions([]);
  setError('');setStatus('');
  setOpen(true);
 };

 // Each search has its own abort signal; stale responses cannot overwrite newer results.
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();
  let active=true;
  setSearchBusy(true);setError('');
  setResults([]);setAssetId('');setRevisions([]);setRevisionId('');
  searchHostImages(adapter,query,controller.signal)
   .then(images=>{if(active)setResults(images);})
   .catch(()=>{if(active)setError('외부 이미지 검색에 실패했습니다.');})
   .finally(()=>{if(active)setSearchBusy(false);});
  return()=>{active=false;controller.abort();};
 },[adapter,namespace,open,query]);

 useEffect(()=>{
  if(!open||!assetId)return;
  const controller=new AbortController();
  let active=true;
  setRevisionsBusy(true);setRevisions([]);setRevisionId('');
  listHostImageRevisions(adapter,assetId,controller.signal)
   .then(revisions=>{if(active)setRevisions(revisions);})
   .catch(()=>{if(active)setError('이미지 버전을 조회하지 못했습니다.');})
   .finally(()=>{if(active)setRevisionsBusy(false);});
  return()=>{active=false;controller.abort();};
 },[adapter,namespace,open,assetId]);

 useEffect(()=>{
  if(!open)return;
  const frame=requestAnimationFrame(()=>searchInput.current?.focus());
  return()=>cancelAnimationFrame(frame);
 },[open]);

 // Changing adapters/namespaces invalidates any in-flight resolve, even if
 // the old provider ignores AbortSignal.
 useEffect(()=>()=>{generation.current++;pendingResolve.current?.abort();},[adapter,namespace]);

 const selectTarget=(key:string)=>{
  abortResolve();
  setTargetKey(key);
  setAlt(targets.find(item=>item.key===key)?.alt??'');
  setError('');
 };
 const selectAsset=(id:string)=>{
  abortResolve();
  setAssetId(id);
  setRevisionId('');
  setError('');
 };

 const connect=async()=>{
  if(resolving)return;
  const requestedAsset=results.find(item=>item.id===assetId);
  if(!requestedAsset||!targetKey){setError('이미지와 연결 대상을 선택하세요.');return;}
  if(!namespace.trim()){setError('호스트 namespace가 없습니다.');return;}
  const selectedTarget=targets.find(item=>item.key===targetKey);
  const target:HostImageTarget|null=targetKey===INSERT_TARGET?
   noteKey&&noteIdentity?{kind:'append',noteKey,noteId:noteIdentity}:null:
   selectedTarget?{kind:'replace',imageKey:selectedTarget.key,
    noteId:selectedTarget.noteId,expectedImage:selectedTarget.expectedImage}:null;
  if(!target){setError('대상 노트 또는 이미지가 변경되었습니다. 다시 선택하세요.');return;}
  const controller=new AbortController();
  pendingResolve.current=controller;
  const request=++generation.current;
  const fromAdapter=adapter,fromNamespace=namespace;
  setResolving(true);setError('');
  try{
   const result=await connectHostImage({
    editor,adapter:fromAdapter,namespace:fromNamespace,
    locator:{assetId,...(revisionId?{revisionId}:{})},
    target,alt,signal:controller.signal,
    isCurrent:()=>mounted.current&&request===generation.current&&
     currentConfig.current.adapter===fromAdapter&&currentConfig.current.namespace===fromNamespace
   });
   if(!mounted.current||request!==generation.current||controller.signal.aborted||
    currentConfig.current.adapter!==fromAdapter||currentConfig.current.namespace!==fromNamespace)return;
   if(result.ok){setStatus('외부 이미지 자산을 연결했습니다.');close();}
   else if(result.reason==='invalid')
    setError('외부 자산 URL·미디어 유형·버전 또는 만료 시간이 유효하지 않습니다.');
   else if(result.reason==='stale')
    setError('대상 노트 또는 이미지가 변경되었습니다. 다시 선택하세요.');
   else if(result.reason==='unavailable')
    setError('외부 이미지 URL을 확인하지 못했습니다.');
  }finally{
   if(mounted.current&&request===generation.current){
    pendingResolve.current=null;setResolving(false);
   }
  }
 };

 const keys=(event:KeyboardEvent<HTMLElement>)=>{
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const focusable=[...(dialog.current?.querySelectorAll<HTMLElement>(
   'button:not([disabled]),input:not([disabled]),select:not([disabled])'
  )??[])].filter(element=>element.getClientRects().length>0);
  if(focusable.length===0)return;
  if(event.shiftKey&&document.activeElement===focusable[0]){
   event.preventDefault();focusable.at(-1)?.focus();
  }else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){
   event.preventDefault();focusable[0].focus();
  }
 };

 return <>
  <button type="button" ref={trigger} onMouseDown={event=>event.preventDefault()}
   onClick={openPicker} aria-haspopup="dialog" aria-expanded={open}>호스트 이미지 자산 선택</button>
  {status&&<p role="status">{status}</p>}
  {open&&<div className="note-image-backdrop">
   <div ref={dialog} className="note-image-dialog host-asset-dialog" role="dialog"
    aria-modal="true" aria-labelledby={titleId} onKeyDown={keys}>
    <header className="note-image-dialog-head">
     <div><h2 id={titleId}>호스트 이미지 자산</h2><p>현재 문서의 노트 이미지에 연결하거나 선택한 노트 끝에 추가합니다.</p></div>
     <button type="button" onClick={close}>닫기</button>
    </header>
    <div className="host-asset-fields">
     <fieldset><legend>연결 대상</legend>
      {noteKey&&<label><input type="radio" name={instanceId+'-target'} checked={targetKey===INSERT_TARGET}
       onChange={()=>selectTarget(INSERT_TARGET)}/> 현재 노트에 새 이미지 삽입</label>}
      {targets.map(target=><label key={target.key}><input type="radio" name={instanceId+'-target'}
       checked={targetKey===target.key} onChange={()=>selectTarget(target.key)}/>
       {target.noteId} · {target.alt||target.src}</label>)}
      {!noteKey&&targets.length===0&&<p role="status">노트 안에 커서를 두거나 노트 이미지를 먼저 추가하세요.</p>}
     </fieldset>
     <label htmlFor={searchId}>외부 이미지 검색</label>
     <input ref={searchInput} type="search" id={searchId} value={query}
      onChange={event=>{abortResolve();setQuery(event.target.value);}}/>
     {searchBusy&&<p role="status">검색 중…</p>}
     <fieldset><legend>검색 결과</legend>
      {results.map(item=><label key={item.id}><input type="radio" name={instanceId+'-asset'}
       checked={assetId===item.id} onChange={()=>selectAsset(item.id)}/>
       {item.title} · {item.mediaType}</label>)}
      {!searchBusy&&results.length===0&&<p>검색 결과가 없습니다.</p>}
     </fieldset>
     {assetId&&<label>버전
      <select value={revisionId} disabled={revisionsBusy||resolving}
       onChange={event=>{abortResolve();setRevisionId(event.target.value);}}>
       <option value="">최신 버전</option>
       {revisions.map(item=><option key={item.id} value={item.id}>{item.id}</option>)}
      </select>
     </label>}
     <label htmlFor={altId}>대체 텍스트 (장식 이미지는 비워 둘 수 있습니다)</label>
     <input id={altId} type="text" maxLength={2000} value={alt} onChange={event=>setAlt(event.target.value)}/>
     {error&&<p role="alert">{error}</p>}
     <div className="note-image-actions">
      <button type="button" onClick={close}>취소</button>
      <button type="button" className="note-image-primary"
       disabled={!assetId||!targetKey||resolving||searchBusy||revisionsBusy}
       onClick={()=>void connect()}>{resolving?'확인 중…':'외부 이미지 연결'}</button>
     </div>
    </div>
   </div>
  </div>}
 </>;
}
