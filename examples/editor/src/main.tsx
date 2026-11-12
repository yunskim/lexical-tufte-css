import type {AssetProvider,AssetSummary,AssetRevision} from '@lexical-tufte/editor-ports';
import {
  validateDocument,
  isSafeURL,
  type TufteDocument} from '@lexical-tufte/document';
import {useEffect,
  useRef,
  useState,
  type MouseEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$loadLayoutFixture} from './layoutFixture.js';
import {$createLinkNode} from '@lexical/link';
import {$isHeadingNode} from '@lexical/rich-text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  FORMAT_TEXT_COMMAND,
  HISTORY_PUSH_TAG,
  UNDO_COMMAND,
  REDO_COMMAND,
  type LexicalNode,
  type EditorState,
  type RangeSelection
} from 'lexical';
import {canonicalBlockType,
  exportCanonicalEditorState,
  parseCanonicalEditorState,
  loadDocumentIntoEditor,
  exportEditorToDocument,
  registerFigureCommands,
  INSERT_TUFTE_FIGURE_COMMAND,
  SET_TUFTE_FIGURE_WIDTH_COMMAND,
  INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,
  REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,
  UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,
  registerQuotationCommands,
  APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,
  MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,
  SET_TUFTE_QUOTE_CITE_COMMAND,
  REMOVE_TUFTE_QUOTATION_COMMAND,
  INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,
  INSERT_TUFTE_QUOTATION_COMMAND,
  APPEND_TUFTE_SECTION_CITE_COMMAND,
  APPEND_TUFTE_ATTRIBUTION_COMMAND,
  registerListKeyboardCommands,
  registerListCommands,
  INSERT_TUFTE_LIST_COMMAND,
  APPEND_TUFTE_LIST_ITEM_COMMAND,
  SET_TUFTE_LIST_KIND_COMMAND,
  CHANGE_TUFTE_LIST_INDENT_COMMAND,
  UNWRAP_TUFTE_LIST_COMMAND,
  registerInlineCommands,
  SET_TUFTE_SPAN_KIND_COMMAND,
  WRAP_TUFTE_SPAN_COMMAND,
  UNWRAP_TUFTE_SPAN_COMMAND,
  registerDefinitionCommands,
  INSERT_TUFTE_DEFINITION_LIST_COMMAND,
  APPEND_TUFTE_DEFINITION_PAIR_COMMAND,
  REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,
  MOVE_TUFTE_DEFINITION_PAIR_COMMAND,
  REMOVE_TUFTE_DEFINITION_LIST_COMMAND,
  registerSectionCommands,
  WRAP_TUFTE_ROOT_COMMAND,
  INSERT_TUFTE_SECTION_COMMAND,
  SPLIT_TUFTE_SECTION_COMMAND,
  MERGE_TUFTE_SECTION_COMMAND,
  SET_TUFTE_BLOCK_COMMAND,
  inspectEditorStructure,
  focusStructureIssue,
  type StructureIssue,
  replaceEditorDocumentState,
  NoteNode,
  InlineImageNode,
  $createSidenoteNode,
  $createInlineImageNode,
  $insertNotePhrasing
} from '@lexical-tufte/lexical';
import {NODE_SCHEMA} from '@lexical-tufte/document';
import {ToolbarButton as IconButton, TufteComposer, TufteEditingSurface, INLINE_ACTIONS, ENTER_TUFTE_NOTE_COMMAND, LEAVE_TUFTE_NOTE_COMMAND, INSERT_TUFTE_NOTE_COMMAND, SPLIT_TUFTE_NOTE_COMMAND, MERGE_TUFTE_NOTE_COMMAND, MOVE_TUFTE_NOTE_COMMAND, OPEN_TUFTE_NOTE_IMAGE_EDITOR_COMMAND} from '@lexical-tufte/editor-react';
import './style.css';
import '@lexical-tufte/editor-react/styles.css';



function containingNote(node: LexicalNode | null): NoteNode | null {
  for(let n=node;n;n=n.getParent()) if(n instanceof NoteNode)return n;
  return null;
}
function seed(){
  const note=$createSidenoteNode('seed-note').append($createTextNode('노트에서 링크·강조·코드·이미지를 편집합니다.'));
  $getRoot().append($createParagraphNode().append($createTextNode('이 본문 중간에 '),note,$createTextNode(' 사이드노트가 연결되어 있습니다.')));
}
function EditorUI(){
  const [editor]=useLexicalComposerContext();
  const [status,setStatus]=useState('본문을 선택하고 노트를 삽입하세요.');
  const [html,setHtml]=useState('');
  const [json,setJson]=useState('');
  const [managedJson,setManagedJson]=useState('');
  const [imageChooserOpen,setImageChooserOpen]=useState(false);
  // Local document catalog. External AssetProvider remains read-only.
  const [documentAssets,setDocumentAssets]=useState<Array<{id:string;src:string;mimeType:string;width?:number;height?:number}>>([]);
  // The embedding host may provide this capability; the standalone example
  // intentionally does not create a network client or bind to Magnolia Works.
  const hostConfig=useRef(
    window as Window & {lexicalTufteAssetProvider?:AssetProvider;lexicalTufteAssetNamespace?:string});
  const hostAssets=useRef<AssetProvider|null>(hostConfig.current.lexicalTufteAssetProvider??null);
  const hostNamespace=hostConfig.current.lexicalTufteAssetNamespace;
  const hostNamespaceValid=typeof hostNamespace==='string'&&hostNamespace.trim().length>0;
  const [hostResults,setHostResults]=useState<AssetSummary[]>([]);
  const [hostRevisions,setHostRevisions]=useState<AssetRevision[]>([]);
  const [hostAssetId,setHostAssetId]=useState<string|null>(null);
  const [hostRevisionId,setHostRevisionId]=useState<string|null>(null);
  const [hostResolving,setHostResolving]=useState(false);
  const hostResolveGeneration=useRef(0);
  const expiryRefreshTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const expiryRefreshDeadline=useRef<number|null>(null);
  const retryRefreshTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const refreshFailures=useRef(0);
  const failedHostKeys=useRef<Set<string>>(new Set());
  const lastHostRefresh=useRef(0);
  function clearExpiryRefresh(){
    if(expiryRefreshTimer.current!==null)clearTimeout(expiryRefreshTimer.current);
    expiryRefreshTimer.current=null;
    expiryRefreshDeadline.current=null;
  }
  function clearRetryRefresh(){
    if(retryRefreshTimer.current!==null)clearTimeout(retryRefreshTimer.current);
    retryRefreshTimer.current=null;
  }
  function scheduleExpiryRefresh(expiresAt?:string){
    if(!expiresAt)return;
    const expiry=Date.parse(expiresAt);
    if(!Number.isFinite(expiry))return;
    const delay=Math.max(1000,expiry-Date.now()-60_000);
    const deadline=Date.now()+delay;
    if(expiryRefreshDeadline.current!==null&&expiryRefreshDeadline.current<=deadline)return;
    clearExpiryRefresh();
    expiryRefreshDeadline.current=deadline;
    expiryRefreshTimer.current=setTimeout(()=>{
      expiryRefreshTimer.current=null;expiryRefreshDeadline.current=null;
      void refreshHostAssetURLs(false,true);
    },Math.min(delay,2_147_483_647));
  }
  function scheduleRefreshRetry(){
    refreshFailures.current=Math.min(refreshFailures.current+1,6);
    const delay=Math.min(300_000,5000*2**(refreshFailures.current-1));
    clearRetryRefresh();
    retryRefreshTimer.current=setTimeout(()=>{
      retryRefreshTimer.current=null;
      void refreshHostAssetURLs(true,true);
    },delay);
  }
  useEffect(()=>()=>{clearExpiryRefresh();clearRetryRefresh();},[]);
  useEffect(()=>{
    if(!hostAssets.current||!hostNamespaceValid)return;
    const onResume=()=>{
      if(document.visibilityState==='visible'&&Date.now()-lastHostRefresh.current>60_000)
        void refreshHostAssetURLs();
    };
    document.addEventListener('visibilitychange',onResume);
    window.addEventListener('pageshow',onResume);
    return()=>{
      document.removeEventListener('visibilitychange',onResume);
      window.removeEventListener('pageshow',onResume);
    };
  },[editor]);
  const refreshGeneration=useRef(0);
  const activeHostRefresh=useRef(false);
  const restoreRefreshGeneration=useRef(0);
  function scheduleHostRefresh(){
    if(!hostAssets.current||!hostNamespaceValid)return;
    const generation=++restoreRefreshGeneration.current;
    // Lexical may commit the restored state after the caller returns.
    requestAnimationFrame(()=>{
      if(generation!==restoreRefreshGeneration.current)return;
      void refreshHostAssetURLs();
    });
  }

  const [refreshingHostAssets,setRefreshingHostAssets]=useState(false);
  async function refreshHostAssetURLs(retryOnly=false,automatic=false){
    if(automatic&&activeHostRefresh.current)return;
    const provider=hostAssets.current;
    if(!provider||!hostNamespaceValid){
      setStatus('외부 이미지 갱신을 위한 호스트 설정이 없습니다.');return;
    }
    const generation=++refreshGeneration.current;
    activeHostRefresh.current=true;
    if(!retryOnly){failedHostKeys.current.clear();clearExpiryRefresh();}
    clearRetryRefresh();
    lastHostRefresh.current=Date.now();
    const images:Array<{key:string;assetId:string;revisionId?:string}>=[];
    editor.getEditorState().read(()=>{
      const scan=(node:LexicalNode):void=>{
        if(node instanceof InlineImageNode){
          const locator=node.getImageProperties().hostAsset;
          if(locator?.namespace===hostNamespace)
            images.push({key:node.getKey(),assetId:locator.assetId,revisionId:locator.revisionId});
        }
        if($isElementNode(node))node.getChildren().forEach(scan);
      };
      scan($getRoot());
    });
    const pending=retryOnly?images.filter(image=>failedHostKeys.current.has(image.key)):images;
    if(pending.length===0){activeHostRefresh.current=false;failedHostKeys.current.clear();refreshFailures.current=0;setRefreshingHostAssets(false);setStatus('갱신할 외부 이미지가 없습니다.');return;}
    setRefreshingHostAssets(true);
    let refreshed=0;
    let failed=0;
    try{
      for(const image of pending){
        failedHostKeys.current.delete(image.key);
        let resolved;
        try{
          resolved=await provider.resolve({assetId:image.assetId,
            ...(image.revisionId?{revisionId:image.revisionId}:{})});
        }catch{
          if(generation!==refreshGeneration.current)return;
          failed++;
          failedHostKeys.current.add(image.key);
          continue;
        }
        if(generation!==refreshGeneration.current)return;
        if(!resolved||resolved.assetId!==image.assetId||
          (image.revisionId&&resolved.revisionId!==image.revisionId)||
          typeof resolved.mediaType!=='string'||!resolved.mediaType.startsWith('image/')||
          typeof resolved.url!=='string'||!isSafeURL(resolved.url,'image')||
          (resolved.expiresAt!==undefined&&(!Number.isFinite(Date.parse(resolved.expiresAt))||Date.parse(resolved.expiresAt)<=Date.now()))){
          failed++;failedHostKeys.current.add(image.key);continue;
        }
        let applied=false;
        editor.update(()=>{
          const node=$getNodeByKey(image.key);
          if(!(node instanceof InlineImageNode))return;
          const current=node.getImageProperties();
          if(current.hostAsset?.namespace!==hostNamespace||
            current.hostAsset.assetId!==image.assetId||
            current.hostAsset.revisionId!==image.revisionId)return;
          node.setHostAsset(current.hostAsset,resolved.url,current.alt);
          applied=true;
          refreshed++;
        },{tag:HISTORY_PUSH_TAG,discrete:true});
        if(applied)scheduleExpiryRefresh(resolved.expiresAt);
      }
      if(generation!==refreshGeneration.current)return;
      if(failed){scheduleRefreshRetry();}else{refreshFailures.current=0;clearRetryRefresh();}
      setStatus('외부 이미지 URL 갱신: '+refreshed+'/'+pending.length+'개.'+(failed?' 실패 '+failed+'개, 재시도 예약.':''));
    }catch{if(generation===refreshGeneration.current){scheduleRefreshRetry();setStatus('외부 이미지 URL 갱신 중 오류가 발생했습니다. 재시도합니다.');}}
    finally{if(generation===refreshGeneration.current){activeHostRefresh.current=false;setRefreshingHostAssets(false);}}
  }

  async function connectHostAsset(){
    const provider=hostAssets.current;
    const target=assetTargetKey;
    const id=hostAssetId;
    if(!provider||!target||!id||hostResolving)return;
    if(!hostNamespaceValid){setHostError('호스트 자산 namespace가 설정되지 않았습니다.');return;}
    const generation=++hostResolveGeneration.current;
    setHostResolving(true);setHostError('');
    try{
      const resolved=await provider.resolve({assetId:id,...(hostRevisionId?{revisionId:hostRevisionId}:{})});
      if(generation!==hostResolveGeneration.current)return;
      if(!resolved||resolved.assetId!==id||!resolved.mediaType.startsWith('image/')||
        !isSafeURL(resolved.url,'image')||(hostRevisionId&&resolved.revisionId!==hostRevisionId)){
        setHostError('외부 자산 URL 또는 버전이 유효하지 않습니다.');return;
      }
      let valid=false;
      editor.getEditorState().read(()=>{
        const node=$getNodeByKey(target);
        valid=node instanceof InlineImageNode&&containingNote(node)!==null;
      });
      if(!valid){setHostError('연결 대상 이미지가 변경되었습니다.');return;}
      editor.update(()=>{
        const node=$getNodeByKey(target);
        if(node instanceof InlineImageNode&&containingNote(node))
          node.setHostAsset({namespace:hostNamespace!,assetId:id,...(hostRevisionId?{revisionId:resolved.revisionId}:{})},resolved.url,assetAlt);
      },{tag:HISTORY_PUSH_TAG,discrete:true});
      scheduleExpiryRefresh(resolved.expiresAt);
      setStatus('외부 이미지 자산을 연결했습니다.');
      closeAssetChooser();
    }catch{if(generation===hostResolveGeneration.current)setHostError('외부 자산 URL 해석에 실패했습니다.');}
    finally{if(generation===hostResolveGeneration.current)setHostResolving(false);}
  }
  const [assetChooserOpen,setAssetChooserOpen]=useState(false);
  const [assetQuery,setAssetQuery]=useState('');
  const [hostLoading,setHostLoading]=useState(false);
  const [hostError,setHostError]=useState('');
  useEffect(()=>{
    const provider=hostAssets.current;
    if(!provider||!assetChooserOpen)return;
    const controller=new AbortController();
    let current=true;
    setHostLoading(true);setHostError('');
    provider.search({text:assetQuery,mediaTypes:['image/png','image/jpeg','image/webp','image/svg+xml'],limit:40},controller.signal)
      .then(page=>{if(current)setHostResults(page.items.filter(item=>item.mediaType.startsWith('image/')));})
      .catch(()=>{if(current)setHostError('외부 이미지 검색에 실패했습니다.');})
      .finally(()=>{if(current)setHostLoading(false);});
    return()=>{current=false;controller.abort();};
  },[assetChooserOpen,assetQuery]);
  useEffect(()=>{
    const provider=hostAssets.current;
    if(!provider||!assetChooserOpen||!hostAssetId)return;
    const controller=new AbortController();
    let current=true;
    setHostRevisions([]);setHostRevisionId(null);
    provider.revisions(hostAssetId,{limit:40},controller.signal)
      .then(page=>{if(current)setHostRevisions(page.items);})
      .catch(()=>{if(current)setHostError('외부 자산 버전을 조회하지 못했습니다.');});
    return()=>{current=false;controller.abort();};
  },[assetChooserOpen,hostAssetId]);
  const [assetChoice,setAssetChoice]=useState<string|null>(null);
  const [assetTargetKey,setAssetTargetKey]=useState<string|null>(null);
  const [assetAlt,setAssetAlt]=useState('');
  const [assetTargets,setAssetTargets]=useState<Array<{key:string;noteId:string;alt:string;src:string}>>([]);
  function openAssetChooser(){
    const targets:Array<{key:string;noteId:string;alt:string;src:string}>=[];
    editor.getEditorState().read(()=>{
      const scan=(node:LexicalNode,noteId:string|null):void=>{
        const currentNote=node instanceof NoteNode?node.getNoteId():noteId;
        if(node instanceof InlineImageNode&&currentNote!==null){
          const properties=node.getImageProperties();
          targets.push({key:node.getKey(),noteId:currentNote,alt:properties.alt,src:properties.src});
        }
        if($isElementNode(node))node.getChildren().forEach(child=>scan(child,currentNote));
      };
      scan($getRoot(),null);
    });
    setAssetTargets(targets);
    setAssetTargetKey(targets.length===1?targets[0].key:null);
    setAssetAlt(targets.length===1?targets[0].alt:'');
    setAssetQuery('');setAssetChoice(null);setAssetChooserOpen(true);
  }
  function connectChosenAsset(){
    const asset=documentAssets.find(item=>item.id===assetChoice);
    if(!asset||!assetTargetKey){setStatus('이미지와 연결 대상을 모두 선택하세요.');return;}
    let valid=false;
    editor.getEditorState().read(()=>{
      const node=$getNodeByKey(assetTargetKey!);
      valid=node instanceof InlineImageNode&&containingNote(node)!==null;
    });
    if(!valid){setStatus('연결 대상 이미지가 변경되었습니다. 다시 선택하세요.');return;}
    const key=assetTargetKey;
    const alt=assetAlt;
    editor.update(()=>{
      const node=$getNodeByKey(key);
      if(node instanceof InlineImageNode&&containingNote(node))node.setDocumentAsset(asset).setImagePresentation(alt,asset.width,asset.height);
    },{tag:HISTORY_PUSH_TAG,discrete:true});
    setStatus('선택한 노트 이미지에 문서 자산을 연결했습니다.');
    closeAssetChooser();
  }

  const assetChooserTrigger=useRef<HTMLButtonElement>(null);
  const assetChooserDialog=useRef<HTMLDivElement>(null);
  const assetSearchRef=useRef<HTMLInputElement>(null);
  const matchingAssets=documentAssets.filter(asset=>
    (asset.id+' '+asset.mimeType+' '+asset.src).toLocaleLowerCase().includes(assetQuery.toLocaleLowerCase()));
  function closeAssetChooser(){
    hostResolveGeneration.current++;
    setHostResolving(false);
    setAssetChooserOpen(false);setAssetChoice(null);setAssetTargetKey(null);setAssetAlt('');
    queueMicrotask(()=>assetChooserTrigger.current?.focus());
  }
  useEffect(()=>{
    if(!assetChooserOpen)return;
    assetSearchRef.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeAssetChooser();return;}
      if(event.key!=='Tab')return;
      const nodes=Array.from(assetChooserDialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')??[]);
      if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[assetChooserOpen]);
  const documentAssetsRef=useRef(documentAssets);
  documentAssetsRef.current=documentAssets;

  function connectDocumentAsset(asset:{id:string;src:string;width?:number;height?:number}){
    let imageKey:string|null=null;
    editor.getEditorState().read(()=>{
      const selection=$getSelection();
      const note=selection?$isRangeSelection(selection)?containingNote(selection.anchor.getNode()):null:null;
      const collect=(node:LexicalNode):void=>{
        if(imageKey!==null)return;
        if(node instanceof InlineImageNode){imageKey=node.getKey();return;}
        if($isElementNode(node))node.getChildren().forEach(collect);
      };
      if(note)note.getChildren().forEach(collect);
      // A catalog action may move focus out of the editor. The prototype
      // has a single seeded note, so prefer that note before other images.
      if(imageKey===null){
        const root=$getRoot();
        const findSeed=(node:LexicalNode):void=>{
          if(imageKey!==null)return;
          if(node instanceof NoteNode&&node.getNoteId()==='seed-note')node.getChildren().forEach(collect);
          else if($isElementNode(node))node.getChildren().forEach(findSeed);
        };
        findSeed(root);
      }
    });
    if(imageKey===null){setStatus('연결할 노트 이미지가 없습니다.');return;}
    const key:string=imageKey;
    editor.update(()=>{
      const image=$getNodeByKey(key);
      if(!(image instanceof InlineImageNode)||!containingNote(image))return;
      image.setDocumentAsset(asset);
    },{tag:HISTORY_PUSH_TAG,discrete:true});
    setStatus('선택한 노트 이미지에 문서 자산을 연결했습니다.');
  }
  function registerDocumentImage(){
    const id=window.prompt('자산 ID');if(id===null)return;
    const src=window.prompt('이미지 URL');if(src===null)return;
    const mimeType=window.prompt('MIME 유형','image/svg+xml');if(mimeType===null)return;
    const widthText=window.prompt('너비 (선택)','');if(widthText===null)return;
    const heightText=window.prompt('높이 (선택)','');if(heightText===null)return;
    const validSize=(value:string)=>value===''||(/^[0-9]+$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)>0);
    if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id)||
       !src||src.startsWith('//')||/^[a-z]+:/i.test(src)&&!/^https?:\/\//i.test(src)||
       !/^image\/[a-z0-9.+-]+$/i.test(mimeType)||!validSize(widthText)||!validSize(heightText)||
       documentAssets.some(asset=>asset.id===id)){
      setStatus('자산 등록 거부: 중복 ID 또는 잘못된 이미지 정보입니다.');return;
    }
    const asset={id,src,mimeType,...(widthText?{width:Number(widthText)}:{}),...(heightText?{height:Number(heightText)}:{})};
    setDocumentAssets(previous=>[...previous,asset]);
    setStatus('문서 이미지 자산을 등록했습니다.');
  }

  const chooserTrigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>registerSectionCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerInlineCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerDefinitionCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerQuotationCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerFigureCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerListCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerListKeyboardCommands(editor),[editor]);
  const [structureIssues,setStructureIssues]=useState<StructureIssue[]>([]);
  const checkpoint=useRef<EditorState|null>(null);
  useEffect(()=>{
    const inspect=()=>{const issues=inspectEditorStructure(editor);setStructureIssues(issues);if(issues.length===0)checkpoint.current=editor.getEditorState();};
    inspect();return editor.registerUpdateListener(inspect);
  },[editor]);
  function recoverStructure(){
    if(!checkpoint.current){setStatus('복구할 정상 구조가 없습니다. 문제 위치를 수정하거나 실행 취소하세요.');return;}
    try{
      localStorage.setItem('lexical-tufte-recovery-v1',JSON.stringify(exportCanonicalEditorState(editor.getEditorState())));
      editor.setEditorState(checkpoint.current,{tag:HISTORY_PUSH_TAG});setStatus('복구용 사본을 보존하고 마지막 정상 구조로 돌아왔습니다.');
    }catch{setStatus('복구용 사본 저장에 실패했습니다. 현재 내용은 유지합니다.');}
  }
  const [recoveryAvailable,setRecoveryAvailable]=useState(false);
  const [autoSaveState,setAutoSaveState]=useState('자동 복구 저장 대기');
  const recoveryKey='lexical-tufte-recovery-v2';
  const recoverySession=useRef<string>(crypto.randomUUID());
  const sessionKey=recoveryKey+':'+recoverySession.current;
  const legacyRecoveryKey='lexical-tufte-recovery-v1';
  function recoveryKeys(){
    return Object.keys(localStorage).filter(key=>key.startsWith(recoveryKey+':'));
  }
  function migrateLegacyRecovery(){
    const raw=localStorage.getItem(legacyRecoveryKey);
    if(raw===null)return;
    const parsed:unknown=JSON.parse(raw);
    if(!parsed||typeof parsed!=='object')return;
    const migratedKey=recoveryKey+':legacy';
    if(localStorage.getItem(migratedKey)===null){
      localStorage.setItem(migratedKey,JSON.stringify({savedAt:new Date().toISOString(),state:parsed}));
    }
    // Only delete the legacy copy after the new slot is confirmed present.
    if(localStorage.getItem(migratedKey)!==null)localStorage.removeItem(legacyRecoveryKey);
  }
  useEffect(()=>{
    let pending:ReturnType<typeof setTimeout>|undefined;
    let latest:EditorState|null=null;
    const refresh=()=>{
      try{
        setRecoveryAvailable(Object.keys(localStorage).some(key=>key.startsWith(recoveryKey+':')));
      }catch{setAutoSaveState('복구 저장소에 접근할 수 없습니다.');}
    };
    try{migrateLegacyRecovery();refresh();}catch{setAutoSaveState('이전 복구본 이관에 실패했습니다. 원본은 유지됩니다.');}
    const persist=()=>{
      if(pending!==undefined){clearTimeout(pending);pending=undefined;}
      if(latest===null)return;
      try{
        localStorage.setItem(sessionKey,JSON.stringify({savedAt:new Date().toISOString(),state:exportCanonicalEditorState(latest),assets:documentAssetsRef.current}));
        latest=null;refresh();setAutoSaveState('이 탭의 편집 상태를 복구용으로 저장했습니다.');
      }catch{
        // Quota pressure must not silently delete older recovery copies.
        // The user can explicitly remove selected copies before retrying.
        setAutoSaveState('자동 복구 저장 실패: 저장 공간이 부족할 수 있습니다. 복구본을 확인하세요.');
      }
    };
    const unregister=editor.registerUpdateListener(({editorState,dirtyElements,dirtyLeaves})=>{
      if(dirtyElements.size===0&&dirtyLeaves.size===0)return;
      latest=editorState;
      if(pending!==undefined)clearTimeout(pending);
      pending=setTimeout(persist,800);
    });
    const flush=()=>{if(document.visibilityState==='hidden')persist();};
    const onPageHide=()=>persist();
    const onStorage=(event:StorageEvent)=>{if(event.key===null||event.key.startsWith(recoveryKey+':'))refresh();};
    document.addEventListener('visibilitychange',flush);
    window.addEventListener('pagehide',onPageHide);
    window.addEventListener('storage',onStorage);
    return()=>{
      unregister();persist();
      document.removeEventListener('visibilitychange',flush);
      window.removeEventListener('pagehide',onPageHide);
      window.removeEventListener('storage',onStorage);
    };
  },[editor,sessionKey]);
  function exportRecovery(){
    try{
      const entries=recoveryKeys().map(key=>({key,raw:localStorage.getItem(key)}))
        .filter((item):item is {key:string;raw:string}=>item.raw!==null);
      if(entries.length===0){setStatus('내보낼 복구본이 없습니다.');return;}
      const choice=window.prompt('내보낼 복구본 번호 (취소하면 유지):\\n'+
        entries.map((entry,index)=>index+': '+entry.key.slice(-12)).join('\\n'),'0');
      if(choice===null)return;
      const selected=/^(0|[1-9][0-9]*)$/.test(choice)?entries[Number(choice)]:undefined;
      if(!selected){setStatus('올바른 복구본 번호를 입력하세요.');return;}
      // Export the exact stored bytes without attempting to parse a possibly damaged draft.
      const blob=new Blob([selected.raw],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;link.download='lexical-tufte-recovery-'+selected.key.slice(-12)+'.json';
      document.body.appendChild(link);
      try{link.click();setStatus('선택한 복구본의 다운로드를 요청했습니다.');}
      finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);}
    }catch{setStatus('복구본 내보내기에 실패했습니다.');}
  }
  function deleteRecovery(){
    try{
      const entries=recoveryKeys().map(key=>{
        try{
          const raw=localStorage.getItem(key);
          const value=raw===null?null:JSON.parse(raw) as {savedAt?:unknown};
          return {key,savedAt:typeof value?.savedAt==='string'?value.savedAt:'읽을 수 없는 복구본'};
        }catch{return {key,savedAt:'읽을 수 없는 복구본'};}
      }).sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
      if(entries.length===0){setRecoveryAvailable(false);setStatus('삭제할 복구본이 없습니다.');return;}
      const choice=window.prompt('삭제할 복구본 번호 (취소하면 유지):\\n'+
        entries.map((entry,index)=>index+': '+entry.savedAt+' · '+entry.key.slice(-8)).join('\\n'));
      if(choice===null)return;
      const selected=/^(0|[1-9][0-9]*)$/.test(choice)?entries[Number(choice)]:undefined;
      if(!selected){setStatus('올바른 복구본 번호를 입력하세요.');return;}
      if(!window.confirm('선택한 복구본을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'))return;
      localStorage.removeItem(selected.key);
      setRecoveryAvailable(recoveryKeys().length>0);
      setStatus('선택한 복구본을 삭제했습니다.');
    }catch{setStatus('복구본 삭제에 실패했습니다.');}
  }
  function restoreRecovery(){
    try{
      const entries=Object.keys(localStorage).filter(key=>key.startsWith(recoveryKey+':'))
        .map(key=>{
          try{
            const raw=localStorage.getItem(key);
            if(raw===null)return null;
            const value=JSON.parse(raw) as {savedAt?:unknown;state?:unknown;assets?:unknown};
            if(typeof value.savedAt!=='string'||!value.state)return null;
            return {key,savedAt:value.savedAt,state:value.state,assets:value.assets};
          }catch{return null;}
        }).filter((item):item is NonNullable<typeof item>=>item!==null)
        .sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
      if(entries.length===0){setRecoveryAvailable(false);setStatus('읽을 수 있는 복구용 사본이 없습니다.');return;}
      const choice=entries.length===1?'0':window.prompt(
        '복구본 번호를 선택하세요 (취소하면 현재 문서를 유지합니다):\\n'+
        entries.map((entry,index)=>index+': '+entry.savedAt+' · '+entry.key.slice(-8)).join('\\n'),'0');
      if(choice===null){setStatus('복구본 선택을 취소했습니다.');return;}
      const selected=/^(0|[1-9][0-9]*)$/.test(choice)?entries[Number(choice)]:undefined;
      if(!selected){setStatus('복구본 선택을 취소했습니다.');return;}
      const candidate={schemaVersion:1,id:'editor-document',locale:'ko',
        title:'사이드노트 편집 문서',lexicalState:selected.state,assets:selected.assets??[]};
      const checked=validateDocument(candidate);
      if(!checked.ok){setStatus('복구본의 본문 또는 자산 목록 검증 실패: 현재 문서를 유지합니다.');return;}
      const state=parseCanonicalEditorState(editor,checked.document.lexicalState);
      if(!window.confirm('현재 편집 상태를 선택한 복구본으로 바꾸시겠습니까?'))return;
      replaceEditorDocumentState(editor,state);
      setDocumentAssets(structuredClone(checked.document.assets));
      setStatus('복구본의 본문과 자산 목록을 함께 불러왔습니다. 구조를 확인한 후 정상 저장하세요.');
      scheduleHostRefresh();
    }catch{setStatus('복구용 사본을 열지 못했습니다.');}
  }
  const textarea=useRef<HTMLTextAreaElement>(null);
  function insertPayload(kind:'link'|'image'){
    editor.update(()=>{
      const s=$getSelection();if(!$isRangeSelection(s))return;
      if(!containingNote(s.anchor.getNode())){setStatus('먼저 노트 안으로 이동하세요.');return;}
      if(kind==='link'){
        const link=$createLinkNode('https://lexical.dev').append($createTextNode('Lexical 문서'));
        $insertNotePhrasing(s,[link,$createTextNode(' ')]);
      }else $insertNotePhrasing(s,[$createInlineImageNode('/fixture.svg','프로토타입의 파란 막대 그림'),$createTextNode(' ')]);
    });editor.focus();
  }
  function exportDocument(){
    const managed=exportEditorToDocument(editor,documentBase());
    setManagedJson(managed.ok?JSON.stringify(managed.value,null,2):'');
    if(inspectEditorStructure(editor).length){setHtml('');setJson(JSON.stringify(exportCanonicalEditorState(editor.getEditorState()),null,2));setStatus('구조를 수정해야 HTML을 생성할 수 있습니다. JSON은 복구용으로 보존합니다.');return;}
    editor.getEditorState().read(()=>setHtml($generateHtmlFromNodes(editor)));
    setJson(JSON.stringify(exportCanonicalEditorState(editor.getEditorState()),null,2));setStatus('JSON과 HTML을 생성했습니다.');
  }
  const managedDocumentKey='lexical-tufte-p1-document';
  function documentBase():TufteDocument{
    return {schemaVersion:1,id:'editor-document',locale:'ko',title:'사이드노트 편집 문서',
      lexicalState:exportCanonicalEditorState(editor.getEditorState()) as TufteDocument['lexicalState'],
      assets:documentAssets};
  }
  function save(){
    try{
      const invalid=inspectEditorStructure(editor).length>0;
      if(invalid){
        localStorage.setItem('lexical-tufte-recovery-v1',JSON.stringify(exportCanonicalEditorState(editor.getEditorState())));
        setStatus('구조 오류가 있어 복구용 사본에만 저장했습니다. 마지막 저장 문서는 유지합니다.');return;
      }
      const existing=localStorage.getItem(managedDocumentKey);
      let hasHostAsset=false;
      editor.getEditorState().read(()=>{
        const scan=(node:LexicalNode):void=>{
          if(node instanceof InlineImageNode&&node.getImageProperties().hostAsset)hasHostAsset=true;
          if($isElementNode(node))node.getChildren().forEach(scan);
        };scan($getRoot());
      });
      if(documentAssets.length===0&&existing===null&&!hasHostAsset){
        localStorage.setItem('lexical-tufte-p1',JSON.stringify(exportCanonicalEditorState(editor.getEditorState())));
        setStatus('이 브라우저에 저장했습니다.');return;
      }
      if(existing!==null){
        const checked=validateDocument(JSON.parse(existing));
        if(!checked.ok){setStatus('기존 관리 문서 검증 실패: 저장본을 유지합니다.');return;}
        if(!window.confirm('기존 관리 문서를 덮어쓰시겠습니까?')){
          setStatus('기존 관리 문서 저장본을 유지합니다.');return;
        }
      }
      const exported=exportEditorToDocument(editor,documentBase());
      if(!exported.ok){setStatus('관리 문서 검증 실패: 저장하지 않았습니다.');return;}
      localStorage.setItem(managedDocumentKey,JSON.stringify(exported.value));
      setStatus('본문과 자산 목록을 한 문서로 저장했습니다.');
    }catch{setStatus('저장 실패: 저장 공간과 문서 형식을 확인하세요.');}
  }
  function restore(){
    try{
      const managed=localStorage.getItem(managedDocumentKey);
      if(managed!==null){
        const input:unknown=JSON.parse(managed);
        const checked=validateDocument(input);
        if(!checked.ok){setStatus('관리 문서 검증 실패: 현재 편집 내용을 유지합니다.');return;}
        const loaded=loadDocumentIntoEditor(editor,checked.document);
        if(!loaded.ok){setStatus('관리 문서 검증 실패: 현재 편집 내용을 유지합니다.');return;}
        setDocumentAssets(structuredClone(loaded.value.assets));
        setStatus('본문과 자산 목록을 함께 불러왔습니다.');
        scheduleHostRefresh();return;
      }
      const raw=localStorage.getItem('lexical-tufte-p1');
      if(!raw){setStatus('저장한 문서가 없습니다.');return;}
      replaceEditorDocumentState(editor,parseCanonicalEditorState(editor,JSON.parse(raw)));
      setDocumentAssets([]);
      setStatus('저장한 문서를 불러왔습니다.');
      scheduleHostRefresh();
    }catch{setStatus('관리 문서 검증 실패: 현재 편집 내용을 유지합니다.');}
  }
  const preserve=(e:MouseEvent<HTMLButtonElement>)=>e.preventDefault();
  return <>
    <header><h1>사이드노트 편집 프로토타입</h1><p>P1.2 · 본문과 노트를 한 편집 상태에서 작성합니다.</p></header>
    <div className="toolbar" role="toolbar" aria-label="노트 편집">
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(WRAP_TUFTE_ROOT_COMMAND,undefined)}>본문을 섹션으로 묶기</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_SECTION_COMMAND,undefined)}>다음 섹션 추가</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SPLIT_TUFTE_SECTION_COMMAND,undefined)}>현재 블록 앞에서 섹션 나누기</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(MERGE_TUFTE_SECTION_COMMAND,undefined)}>다음 섹션과 합치기</button>
      {([['paragraph','본문 문단'],['h2','본문 제목 h2'],['h3','본문 제목 h3']] as const).map(([type,label])=><button key={type} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_BLOCK_COMMAND,type)}>{label}</button>)}
      <button onMouseDown={preserve} onClick={()=>{
        const src=window.prompt('이미지 URL (허용된 HTTPS 또는 상대 경로)');
        if(src===null)return;
        const alt=window.prompt('이미지 대체 텍스트');
        if(alt===null)return;
        const caption=window.prompt('그림 설명 (선택 사항)');
        editor.dispatchCommand(INSERT_TUFTE_FIGURE_COMMAND,{src,alt,...(caption===null?{}:{caption})});
      }}>그림 삽입</button>
      <button onMouseDown={preserve} onClick={()=>{
        const noteId=window.prompt('그림 여백 주석 ID (문서에서 고유해야 합니다)');
        if(noteId===null)return;
        const text=window.prompt('그림 여백 주석 내용');
        if(text===null)return;
        editor.dispatchCommand(INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,{noteId,text});
      }}>그림 여백 주석 삽입</button>
      <button onMouseDown={preserve} onClick={()=>{
        const noteId=window.prompt('삭제할 그림 여백 주석 ID');
        if(noteId!==null)editor.dispatchCommand(REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,noteId);
      }}>그림 여백 주석 삭제</button>
      <button onMouseDown={preserve} onClick={()=>{
        const noteId=window.prompt('수정할 그림 여백 주석 ID');
        if(noteId===null)return;
        const text=window.prompt('새 그림 여백 주석 내용');
        if(text!==null)editor.dispatchCommand(UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,{noteId,text});
      }}>그림 여백 주석 수정</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_FIGURE_WIDTH_COMMAND,'body')}>그림 본문 폭</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_FIGURE_WIDTH_COMMAND,'fullwidth')}>그림 전체 폭</button>
      <IconButton name="list" label="글머리표 목록 삽입" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,'bullet')}/>
      <IconButton name="numbered" label="번호 목록 삽입" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,'number')}/>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_LIST_ITEM_COMMAND,undefined)}>목록 항목 추가</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_LIST_KIND_COMMAND,'bullet')}>현재 목록 글머리표로</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_LIST_KIND_COMMAND,'number')}>현재 목록 번호로</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'indent')}>목록 들여쓰기</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'outdent')}>목록 내어쓰기</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(UNWRAP_TUFTE_LIST_COMMAND,undefined)}>목록을 문단으로 해제</button>
      {([['quote','인용문 삽입'],['epigraph','Epigraph 삽입'],['section-footer','섹션 출처 삽입']] as const).map(([kind,label])=><IconButton key={kind} name={kind==='epigraph'?'epigraph':'quote'} label={label} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,kind)}/>)}
      <IconButton name="rule" label="구분선 삽입" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined)}/>
      <IconButton name="attribution" label="인용문 출처 추가" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined)}/>
      <IconButton name="attribution" label="섹션 문헌 추가" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_SECTION_CITE_COMMAND,undefined)}/>
      <button onMouseDown={preserve} onClick={()=>{
        const url=window.prompt('인용문 출처 URL (비우면 해제)');
        if(url!==null)editor.dispatchCommand(SET_TUFTE_QUOTE_CITE_COMMAND,url);
      }}>인용문 URL 수정</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,undefined)}>Epigraph 항목 추가</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,'up')}>Epigraph 항목 위로</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,'down')}>Epigraph 항목 아래로</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_QUOTE_CITE_COMMAND,null)}>인용문 URL 해제</button>
      {([['cite','문헌 삭제'],['attribution','인용 출처 삭제'],['quote','인용문 삭제'],['epigraph','Epigraph 전체 삭제'],['section-footer','섹션 출처 삭제'],['horizontalrule','구분선 삭제']] as const).map(([kind,label])=><button key={kind} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(REMOVE_TUFTE_QUOTATION_COMMAND,kind)}>{label}</button>)}
      <IconButton name="definition" label="정의목록 삽입" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_DEFINITION_LIST_COMMAND,undefined)}/>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_DEFINITION_PAIR_COMMAND,undefined)}>정의목록 항목 추가</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,'up')}>정의 쌍 위로 이동</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,'down')}>정의 쌍 아래로 이동</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,undefined)}>정의 쌍 삭제</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(REMOVE_TUFTE_DEFINITION_LIST_COMMAND,undefined)}>정의목록 전체 삭제</button>
      {(['sans','newthought','numeral','danger'] as const).map(kind=><button key={kind} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_SPAN_KIND_COMMAND,kind)}>인라인 {kind}</button>)}
      {(['sans','newthought','numeral','danger'] as const).map(kind=><button key={'wrap-'+kind} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(WRAP_TUFTE_SPAN_COMMAND,kind)}>선택 텍스트 {kind}</button>)}
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(UNWRAP_TUFTE_SPAN_COMMAND,undefined)}>인라인 속성 해제</button>
      <IconButton name="sidenote" label="노트 삽입" onMouseDown={preserve} onClick={()=>{editor.dispatchCommand(INSERT_TUFTE_NOTE_COMMAND,'sidenote');editor.focus();}}/>
      <IconButton name="marginnote" label="여백 주석 삽입" onMouseDown={preserve} onClick={()=>{editor.dispatchCommand(INSERT_TUFTE_NOTE_COMMAND,'marginnote');editor.focus();}}/>
      <button onMouseDown={preserve} onClick={()=>{if(!editor.dispatchCommand(ENTER_TUFTE_NOTE_COMMAND,undefined))setStatus('뒤에 있는 노트를 찾지 못했습니다.');}}>다음 노트로</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(LEAVE_TUFTE_NOTE_COMMAND,undefined)}>본문으로</button>
      {INLINE_ACTIONS.map(action=><IconButton key={action.id} name={action.icon} label={action.label} onMouseDown={preserve} onClick={()=>editor.update(()=>{editor.dispatchCommand(FORMAT_TEXT_COMMAND,action.id);},{tag:HISTORY_PUSH_TAG})}/>)}
      <button onMouseDown={preserve} onClick={()=>insertPayload('link')}>노트 링크 삽입</button>
      <button onMouseDown={preserve} onClick={()=>insertPayload('image')}>노트 이미지 삽입</button>
      <button ref={chooserTrigger} type="button" onMouseDown={preserve} onClick={event=>editor.dispatchCommand(OPEN_TUFTE_NOTE_IMAGE_EDITOR_COMMAND,event.currentTarget)} aria-haspopup="dialog" aria-expanded={imageChooserOpen}>노트 이미지 선택</button>
      <button onMouseDown={preserve} onClick={()=>{editor.dispatchCommand(SPLIT_TUFTE_NOTE_COMMAND,undefined);editor.focus();}}>노트 나누기</button>
      <button onMouseDown={preserve} onClick={()=>{editor.dispatchCommand(MERGE_TUFTE_NOTE_COMMAND,undefined);editor.focus();}}>다음 노트와 합치기</button>
      <button onMouseDown={preserve} onClick={()=>{editor.dispatchCommand(MOVE_TUFTE_NOTE_COMMAND,'previous');editor.focus();}}>노트 앞으로 이동</button>
      <button onMouseDown={preserve} onClick={()=>{editor.dispatchCommand(MOVE_TUFTE_NOTE_COMMAND,'next');editor.focus();}}>노트 뒤로 이동</button>
      <IconButton name="undo" label="실행 취소" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(UNDO_COMMAND,undefined)}/>
      <IconButton name="redo" label="다시 실행" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(REDO_COMMAND,undefined)}/>
    </div>
    <p id="help">본문에서 Alt+↓: 다음 노트로 이동 · 노트에서 Escape: 본문으로 이동</p>
    <main>
      <TufteEditingSurface ariaLabel="본문과 사이드노트 편집" ariaDescribedBy="help" onNotice={setStatus} onNoteImageEditorOpenChange={setImageChooserOpen}/>
    </main>
    <p role="status" aria-label="편집 작업 상태">{status}</p><p role="status" aria-label="자동 복구 저장 상태">{autoSaveState}</p>
    {structureIssues.length>0&&<aside role="alert" aria-label="문서 구조 복구"><p>문서 구조를 수정하세요. 내용은 자동 삭제하지 않으며 HTML 생성은 차단됩니다.</p><ul>{structureIssues.map((issue,i)=><li key={`${issue.key}-${i}`}><button onClick={()=>focusStructureIssue(editor,issue.key)}>{issue.message}</button> <code>{issue.path}</code></li>)}</ul><button onClick={()=>editor.dispatchCommand(UNDO_COMMAND,undefined)}>구조 변경 실행 취소</button><button onClick={recoverStructure} disabled={!checkpoint.current}>마지막 정상 구조로 복구</button></aside>}
    {assetChooserOpen&&<div role="presentation" className="asset-chooser-backdrop">
      <div ref={assetChooserDialog} role="dialog" aria-modal="true" aria-label="문서 이미지 선택" className="asset-chooser">
        <h2>문서 이미지 선택</h2>
        <label>이미지 검색 <input ref={assetSearchRef} type="search" value={assetQuery} onChange={event=>{setAssetQuery(event.target.value);setAssetChoice(null);}}/></label>
        <fieldset><legend>교체할 노트 이미지 선택</legend>
          {assetTargets.length===0&&<p>연결할 노트 이미지가 없습니다.</p>}
          {assetTargets.map(target=><label key={target.key} style={{display:'block'}}>
            <input type="radio" name="document-asset-target" checked={assetTargetKey===target.key} onChange={()=>{setAssetTargetKey(target.key);setAssetAlt(target.alt);}}/>
            {target.noteId} · {target.alt||'(장식 이미지)'} · {target.src}
          </label>)}
        </fieldset>
        <label>대체텍스트 (장식용 이미지는 비워 두세요)
          <input type="text" value={assetAlt} onChange={event=>setAssetAlt(event.target.value)} maxLength={2000}/>
        </label>
        <p aria-live="polite">검색 결과 {matchingAssets.length}개</p>
        <ul>{matchingAssets.map(asset=><li key={asset.id}>
          <label><input type="radio" name="document-asset-choice" checked={assetChoice===asset.id} onChange={()=>setAssetChoice(asset.id)}/>
          <img src={asset.src} alt="" width="72" height="54" loading="lazy"/>
          {asset.id} · {asset.mimeType} · {asset.width??'?'}×{asset.height??'?'}</label>
        </li>)}</ul>
        {hostAssets.current&&<section aria-label="외부 이미지 자산">
          <h3>호스트 이미지</h3>
          {hostLoading&&<p role="status">검색 중…</p>}
          {hostError&&<p role="alert">{hostError}</p>}
          <ul>{hostResults.map(item=><li key={item.id}>
            <label><input type="radio" name="host-asset" checked={hostAssetId===item.id}
              onChange={()=>{setHostAssetId(item.id);setHostRevisionId(null);setAssetChoice(null);}}/>
              {item.title} · {item.mediaType}</label>
          </li>)}</ul>
          {hostAssetId&&<label>버전
            <select value={hostRevisionId??''} onChange={event=>setHostRevisionId(event.target.value||null)}>
              <option value="">최신 버전</option>
              {hostRevisions.map(revision=><option key={revision.id} value={revision.id}>{revision.id}</option>)}
            </select>
          </label>}
        </section>}
        {hostAssets.current&&<button type="button" disabled={!hostAssetId||!assetTargetKey||hostResolving||!hostNamespaceValid}
          onClick={()=>void connectHostAsset()}>{hostResolving?'외부 이미지 확인 중…':'선택한 외부 이미지 연결'}</button>}
        <button type="button" onClick={closeAssetChooser}>취소</button>
        <button type="button" disabled={!assetChoice||!assetTargetKey} onClick={connectChosenAsset}>선택한 이미지 연결</button>
      </div>
    </div>}
    {hostAssets.current&&<button type="button" aria-busy={refreshingHostAssets}
      onClick={()=>void refreshHostAssetURLs()}>외부 이미지 URL 다시 확인</button>}
    <section role="group" aria-label="문서 이미지 자산">
      <button type="button" onClick={registerDocumentImage}>문서 이미지 자산 등록</button>
      <button ref={assetChooserTrigger} type="button" onClick={openAssetChooser}>이미지 라이브러리에서 선택</button>
      <p>문서 자산 {documentAssets.length}개</p>
      <ul>{documentAssets.map(asset=><li key={asset.id}>{asset.id} · {asset.mimeType} · {asset.width??'?'}×{asset.height??'?'} <button type="button" onClick={()=>connectDocumentAsset(asset)}>선택한 노트 이미지에 {asset.id} 연결</button></li>)}</ul>
    </section>
    <div className="actions"><button onClick={save}>저장</button><button onClick={restore}>불러오기</button><button onClick={restoreRecovery} disabled={!recoveryAvailable}>복구용 사본 열기</button><button onClick={exportRecovery} disabled={!recoveryAvailable}>복구본 JSON 내보내기</button><button onClick={deleteRecovery} disabled={!recoveryAvailable}>복구본 정리</button><button onClick={exportDocument}>JSON·HTML 확인</button><button onClick={()=>{editor.update($loadLayoutFixture,{tag:HISTORY_PUSH_TAG});setStatus('레이아웃 예제를 불러왔습니다. 실행 취소할 수 있습니다.');}}>레이아웃 예제 불러오기</button></div>
    <details><summary>JSON과 발행 HTML 검사</summary><label>JSON<textarea ref={textarea} aria-label="문서 JSON" value={json} readOnly/></label><label>관리 문서 JSON<textarea aria-label="관리 문서 JSON" value={managedJson} readOnly/></label><label>HTML<textarea aria-label="발행 HTML" value={html} readOnly/></label></details>
    <p className="notice">프로토타입: 공개 발행·모바일 여백 배치·OS별 실제 IME와 다른 브라우저 검증은 후속 단계에서 진행합니다. 한글 웹폰트 자산 연결은 P4 대상입니다.</p>
  </>;
}
createRoot(document.getElementById('root')!).render(<TufteComposer initialConfig={{namespace:'tufte-p1',editorState:seed,onError(error){throw error;},theme:{text:{bold:'text-bold',italic:'text-italic',code:'text-code',underline:'text-underline',strikethrough:'text-strike',underlineStrikethrough:'text-underline-strike',highlight:'text-highlight'}}}}><EditorUI/></TufteComposer>);
