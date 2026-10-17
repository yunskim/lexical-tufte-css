import {useEffect, useRef, useState, type MouseEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {$loadLayoutFixture} from './layoutFixture.js';
import {$createLinkNode} from '@lexical/link';
import {$generateHtmlFromNodes} from '@lexical/html';
import {
  $getRoot, $getSelection, $isRangeSelection, $isNodeSelection, $isElementNode, $isTextNode,
  $createParagraphNode, $createTextNode, $createLineBreakNode, $isParagraphNode,
  FORMAT_TEXT_COMMAND, KEY_ESCAPE_COMMAND, KEY_ARROW_DOWN_COMMAND, KEY_ENTER_COMMAND,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, COPY_COMMAND, CUT_COMMAND, PASTE_COMMAND, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND, HISTORY_PUSH_TAG, UNDO_COMMAND, REDO_COMMAND,
  COMMAND_PRIORITY_HIGH, type LexicalNode, type EditorState,
} from 'lexical';
import {registerFigureCommands,INSERT_TUFTE_FIGURE_COMMAND,SET_TUFTE_FIGURE_WIDTH_COMMAND,INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,registerQuotationCommands,INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,INSERT_TUFTE_QUOTATION_COMMAND,APPEND_TUFTE_SECTION_CITE_COMMAND,APPEND_TUFTE_ATTRIBUTION_COMMAND,registerListCommands,INSERT_TUFTE_LIST_COMMAND,APPEND_TUFTE_LIST_ITEM_COMMAND,registerInlineCommands,SET_TUFTE_SPAN_KIND_COMMAND,registerDefinitionCommands,INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,registerSectionCommands,WRAP_TUFTE_ROOT_COMMAND,INSERT_TUFTE_SECTION_COMMAND,SPLIT_TUFTE_SECTION_COMMAND,MERGE_TUFTE_SECTION_COMMAND,SET_TUFTE_BLOCK_COMMAND,inspectEditorStructure,focusStructureIssue,type StructureIssue,replaceEditorDocumentState,TUFTE_NODES,NoteNode, $createNoteNode, $createInlineImageNode, $splitNoteAtSelection, $mergeNoteWithNext, $moveNote, $insertNotePhrasing, $reidentifyPastedNotes, registerNoteCompositionGuard, registerNoteEdgeTypingGuard, type NoteKind} from '@lexical-tufte/lexical';
import './style.css';

type ToolbarIconName='bold'|'italic'|'code'|'quote'|'epigraph'|'sidenote'|'marginnote'|'rule'|'undo'|'redo'|'list'|'numbered'|'definition'|'attribution'|'figure'|'underline'|'strike'|'highlight';
const toolbarPaths:Record<ToolbarIconName,string>={
 bold:'M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 0 1 0 8H7z',
 italic:'M10 4h10M4 20h10M14 4 10 20',
 code:'m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 16',
 quote:'M4 11h7v8H4v-8zm0 0V9a5 5 0 0 1 5-5m4 7h7v8h-7v-8zm0 0V9a5 5 0 0 1 5-5',
 epigraph:'M4 5h16M4 10h11M4 15h16M4 20h11',
 sidenote:'M4 5h10M4 10h10M4 15h10m6-8h4v10h-4',
 marginnote:'M4 5h16M4 10h11M4 15h11m5-3h4v8h-4',
 rule:'M3 12h18',
 undo:'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12',
 redo:'m15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12',
 list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
 numbered:'M8 6h13M8 12h13M8 18h13M3 5h1v4M3 13h2l-2 3h2',
 definition:'M4 5h16M4 10h10M7 15h13M7 20h10',
 attribution:'M5 5h14M5 10h14M10 16h9M10 20h9',
 figure:'M3 4h18v16H3zM7 15l4-4 3 3 2-2 4 4M8 8h.01',
 underline:'M6 4v7a6 6 0 0 0 12 0V4M4 21h16',
 strike:'M4 12h16M7 7a5 5 0 0 1 10 0M7 17a5 5 0 0 0 10 0',
 highlight:'M5 17 15 7l4 4-10 10H5zM14 5l5 5M4 22h16'
};
function ToolbarIcon({name}:{name:ToolbarIconName}){
 return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={toolbarPaths[name]}/></svg>;
}
const EDITOR_SHORTCUTS:Record<string,string>={굵게:'Ctrl/Cmd+B',기울임:'Ctrl/Cmd+I','실행 취소':'Ctrl/Cmd+Z','다시 실행':'Ctrl/Cmd+Shift+Z'};
function IconButton({name,label,onClick,onMouseDown}:{name:ToolbarIconName;label:string;onClick:()=>void;onMouseDown:(event:MouseEvent<HTMLButtonElement>)=>void}){
 return <button type="button" aria-label={label} title={EDITOR_SHORTCUTS[label]?`${label} (${EDITOR_SHORTCUTS[label]})`:label} onMouseDown={onMouseDown} onClick={onClick}><ToolbarIcon name={name}/></button>;
}

type InlineAction='bold'|'italic'|'underline'|'strikethrough'|'code'|'highlight';
const INLINE_ACTIONS:ReadonlyArray<{id:InlineAction;label:string;icon:ToolbarIconName}>=[
 {id:'bold',label:'굵게',icon:'bold'},
 {id:'italic',label:'기울임',icon:'italic'},
 {id:'underline',label:'밑줄',icon:'underline'},
 {id:'strikethrough',label:'취소선',icon:'strike'},
 {id:'code',label:'코드',icon:'code'},
 {id:'highlight',label:'마크',icon:'highlight'}
];

function SelectionToolbar(){
 const [editor]=useLexicalComposerContext();
 const [position,setPosition]=useState<{top:number;left:number}|null>(null);
 const dismissed=useRef(false);
 const toolbarRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  const update=()=>{
   if(editor.isComposing()){setPosition(null);return;}
   if(document.activeElement?.closest('.selection-toolbar'))return;
   const root=editor.getRootElement();
   const selection=window.getSelection();
   if(!root||!selection||selection.isCollapsed||selection.rangeCount===0||!root.contains(selection.anchorNode)||!root.contains(selection.focusNode)){
    setPosition(null);dismissed.current=false;return;
   }
   if(dismissed.current)return;
   let selected=false;
   editor.getEditorState().read(()=>{const s=$getSelection();selected=$isRangeSelection(s)&&!s.isCollapsed();});
   if(!selected){setPosition(null);return;}
   const rect=selection.getRangeAt(0).getBoundingClientRect();
   if(rect.width===0&&rect.height===0){setPosition(null);return;}
   const width=Math.min(340,Math.max(0,window.innerWidth-24));
   const half=width/2;
   setPosition({top:rect.top>=56?rect.top-52:Math.max(8,Math.min(window.innerHeight-52,rect.bottom+8)),left:Math.max(half+12,Math.min(window.innerWidth-half-12,rect.left+rect.width/2))});
  };
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.altKey&&event.shiftKey&&event.key.toLowerCase()==='f'&&!event.ctrlKey&&!event.metaKey){
    if(!editor.getRootElement()?.contains(document.activeElement)||editor.isComposing())return;
    const selection=window.getSelection();
    if(!selection||selection.isCollapsed||selection.rangeCount===0||dismissed.current)return;
    update();
    requestAnimationFrame(()=>toolbarRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
    event.preventDefault();
   }
  };
  editor.getRootElement()?.addEventListener('keydown',onKeyDown);
  const unregister=editor.registerUpdateListener(()=>requestAnimationFrame(update));
  document.addEventListener('selectionchange',update);
  window.addEventListener('resize',update);
  window.addEventListener('scroll',update,true);
  document.addEventListener('compositionstart',update,true);
  document.addEventListener('compositionend',update,true);
  return ()=>{editor.getRootElement()?.removeEventListener('keydown',onKeyDown);unregister();document.removeEventListener('selectionchange',update);window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);document.removeEventListener('compositionstart',update,true);document.removeEventListener('compositionend',update,true);};
 },[editor]);
 if(!position)return null;
 return <div ref={toolbarRef} className="selection-toolbar" role="toolbar" aria-label="선택 영역 서식" style={{top:position.top,left:position.left}} onMouseDown={e=>e.preventDefault()} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();dismissed.current=true;setPosition(null);editor.focus();}}}>
  {INLINE_ACTIONS.map(action=><IconButton key={action.id} name={action.icon} label={action.label} onMouseDown={e=>e.preventDefault()} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,action.id)}/>)}
 </div>;
}

function BlockContextMenu(){
 const [editor]=useLexicalComposerContext();
 const [open,setOpen]=useState(false);
 const [available,setAvailable]=useState(false);
 const [blockType,setBlockType]=useState('본문');
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 const menuRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>editor.registerUpdateListener(({editorState})=>{
  editorState.read(()=>{
   const selection=$getSelection();
   const valid=$isRangeSelection(selection)&&selection.isCollapsed()&&!containingNote(selection.anchor.getNode());
   setAvailable(valid);
   if(valid){
    let node=selection.anchor.getNode();
    while(node.getParent()&&node.getParent()?.getKey()!=='root'&&!['paragraph','heading','quote'].includes(node.getType()))node=node.getParent()!;
    setBlockType(node.getType()==='heading'?'제목':node.getType()==='quote'?'인용문':'본문');
   }
  });
 }),[editor]);
 useEffect(()=>{
  const root=editor.getRootElement();
  if(!root)return;
  const onContext=(event:globalThis.MouseEvent)=>{
   if(editor.isComposing())return;
   const target=event.target;
   if(!(target instanceof Node)||!root.contains(target))return;
   const caret=document.caretPositionFromPoint?.(event.clientX,event.clientY);
   const legacy=document.caretRangeFromPoint?.(event.clientX,event.clientY);
   const node=caret?.offsetNode??legacy?.startContainer;
   const offset=caret?.offset??legacy?.startOffset;
   if(!node||offset===undefined||!root.contains(node))return;
   const domSelection=window.getSelection();
   if(!domSelection)return;
   const range=document.createRange();
   try{range.setStart(node,offset);range.collapse(true);}catch{return;}
   domSelection.removeAllRanges();
   domSelection.addRange(range);
   editor.focus();
   let valid=false;
   editor.getEditorState().read(()=>{
    const selection=$getSelection();
    valid=$isRangeSelection(selection)&&selection.isCollapsed()&&!containingNote(selection.anchor.getNode());
   });
   if(!valid)return;
   event.preventDefault();
   setPoint({x:Math.max(8,Math.min(window.innerWidth-260,event.clientX)),y:Math.max(8,Math.min(window.innerHeight-160,event.clientY))});
   setOpen(true);
  };
  root.addEventListener('contextmenu',onContext);
  return()=>root.removeEventListener('contextmenu',onContext);
 },[editor]);
 useEffect(()=>{
  if(!open)return;
  const close=(event:PointerEvent)=>{
   if(!menuRef.current?.contains(event.target as Node))setOpen(false);
  };
  document.addEventListener('pointerdown',close);
  return()=>document.removeEventListener('pointerdown',close);
 },[open]);
 useEffect(()=>{if(!available)setOpen(false);},[available]);
 if(!available)return null;
 return <div ref={menuRef} className={point&&open?'block-context-menu is-floating':'block-context-menu'} style={point&&open?{left:point.x,top:point.y}:undefined} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);setPoint(null);editor.focus();}}}>
  <button type="button" aria-expanded={open} aria-controls="tufte-block-menu" onMouseDown={event=>event.preventDefault()} onClick={()=>{setPoint(null);setOpen(value=>!value);}}>블록 유형: {blockType} ▾</button>
  {open&&<div id="tufte-block-menu" role="group" aria-label="블록 유형">
   {([['paragraph','본문 문단'],['h2','제목 h2'],['h3','제목 h3']] as const).map(([type,label])=><button type="button" key={type} onMouseDown={event=>event.preventDefault()} onClick={()=>{editor.dispatchCommand(SET_TUFTE_BLOCK_COMMAND,type);setOpen(false);setPoint(null);editor.focus();}}>{label}</button>)}
   <button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>{editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'quote');setOpen(false);setPoint(null);editor.focus();}}>인용문 삽입</button>
  </div>}
 </div>;
}

function containingNote(node: LexicalNode | null): NoteNode | null {
  for(let n=node;n;n=n.getParent()) if(n instanceof NoteNode)return n;
  return null;
}
function seed(){
  const note=$createNoteNode('seed-note').append($createTextNode('노트에서 링크·강조·코드·이미지를 편집합니다.'));
  $getRoot().append($createParagraphNode().append($createTextNode('이 본문 중간에 '),note,$createTextNode(' 사이드노트가 연결되어 있습니다.')));
}
function EditorUI(){
  const [editor]=useLexicalComposerContext();
  const [status,setStatus]=useState('본문을 선택하고 노트를 삽입하세요.');
  const [html,setHtml]=useState('');
  const [json,setJson]=useState('');
  useEffect(()=>registerSectionCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerInlineCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerDefinitionCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerQuotationCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerFigureCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  useEffect(()=>registerListCommands(editor,diagnostic=>setStatus(diagnostic.message)),[editor]);
  const [structureIssues,setStructureIssues]=useState<StructureIssue[]>([]);
  const checkpoint=useRef<EditorState|null>(null);
  useEffect(()=>{
    const inspect=()=>{const issues=inspectEditorStructure(editor);setStructureIssues(issues);if(issues.length===0)checkpoint.current=editor.getEditorState();};
    inspect();return editor.registerUpdateListener(inspect);
  },[editor]);
  function recoverStructure(){
    if(!checkpoint.current){setStatus('복구할 정상 구조가 없습니다. 문제 위치를 수정하거나 실행 취소하세요.');return;}
    try{
      localStorage.setItem('lexical-tufte-recovery-v1',JSON.stringify(editor.getEditorState().toJSON()));
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
        localStorage.setItem(sessionKey,JSON.stringify({savedAt:new Date().toISOString(),state:latest.toJSON()}));
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
            const value=JSON.parse(raw) as {savedAt?:unknown;state?:unknown};
            if(typeof value.savedAt!=='string'||!value.state)return null;
            return {key,savedAt:value.savedAt,state:value.state};
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
      const state=editor.parseEditorState(JSON.stringify(selected.state));
      if(!window.confirm('현재 편집 상태를 선택한 복구본으로 바꾸시겠습니까?'))return;
      replaceEditorDocumentState(editor,state);
      setStatus('선택한 복구본을 열었습니다. 구조를 확인한 후 정상 저장하세요.');
    }catch{setStatus('복구용 사본을 열지 못했습니다.');}
  }
  const textarea=useRef<HTMLTextAreaElement>(null);
  function enterNote():boolean {
    const selection=$getSelection();
    if(!$isRangeSelection(selection)||!selection.isCollapsed())return false;
    const anchor=selection.anchor.getNode();
    const inside=containingNote(anchor);
    if(inside)return false;
    const all:LexicalNode[]=[];
    function visit(n:LexicalNode){all.push(n);if($isElementNode(n))n.getChildren().forEach(visit);}
    visit($getRoot());
    const index=all.indexOf(anchor);
    const next=all.slice(index+1).find(n=>n instanceof NoteNode);
    if(!(next instanceof NoteNode))return false;
    next.selectStart();
    setStatus('노트 안입니다. Escape로 본문에 돌아갑니다.');return true;
  }
  function leaveNote():boolean {
    const selection=$getSelection();
    if(!$isRangeSelection(selection))return false;
    const note=containingNote(selection.anchor.getNode());if(!note)return false;
    let next=note.getNextSibling();
    if(!next){next=$createTextNode(' ');note.insertAfter(next);}
    if($isTextNode(next))next.select(0,0);
    else if($isElementNode(next))next.selectStart();
    else next.selectPrevious();
    setStatus('본문으로 돌아왔습니다.');return true;
  }
  useEffect(()=>{
    const escape=editor.registerCommand(KEY_ESCAPE_COMMAND,event=>{
      if(!leaveNote())return false;event?.preventDefault();return true;
    },COMMAND_PRIORITY_HIGH);
    const down=editor.registerCommand(KEY_ARROW_DOWN_COMMAND,event=>{
      if(!event.altKey||!enterNote())return false;event.preventDefault();return true;
    },COMMAND_PRIORITY_HIGH);
    const cutIds=new Set<string>();
    const copying=editor.registerCommand(COPY_COMMAND,()=>{cutIds.clear();return false;},COMMAND_PRIORITY_HIGH);
    const cutting=editor.registerCommand(CUT_COMMAND,()=>{
      cutIds.clear();const s=$getSelection();
      if($isRangeSelection(s)||$isNodeSelection(s)){
        const visitCut=(node:LexicalNode):void=>{
          if(node instanceof NoteNode)cutIds.add(node.getNoteId());
          if($isElementNode(node))for(const child of node.getChildren())visitCut(child);
        };
        for(const node of s.getNodes()){
          const parentNote=containingNote(node);
          if(parentNote)cutIds.add(parentNote.getNoteId());
          visitCut(node);
        }
      }
      return false;
    },COMMAND_PRIORITY_HIGH);
    const pasting=editor.registerCommand(SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,({nodes,selection})=>{
      const notes:NoteNode[]=[];
      function scan(n:LexicalNode){if(n instanceof NoteNode)notes.push(n);if($isElementNode(n))n.getChildren().forEach(scan);}
      nodes.forEach(scan);
      if($isRangeSelection(selection)&&containingNote(selection.anchor.getNode())&&notes.length){
        setStatus('노트 안에는 다른 노트를 붙여넣을 수 없습니다.');return true;
      }
      $reidentifyPastedNotes(nodes,cutIds,()=>crypto.randomUUID());
      cutIds.clear();
      if($isRangeSelection(selection)&&containingNote(selection.anchor.getNode())){
        const phrasing:LexicalNode[]=[];
        for(const [index,node] of nodes.entries()){
          if($isParagraphNode(node)){
            if(index>0)phrasing.push($createLineBreakNode());phrasing.push(...node.getChildren());
          }else if(!$isElementNode(node)||node.isInline())phrasing.push(node);
          else {setStatus('노트에는 본문 블록을 붙여넣을 수 없습니다.');return true;}
        }
        $insertNotePhrasing(selection,phrasing);return true;
      }
      return false;
    },COMMAND_PRIORITY_HIGH);
    const plainPaste=editor.registerCommand(PASTE_COMMAND,event=>{
      const s=$getSelection();
      if(!$isRangeSelection(s)||!containingNote(s.anchor.getNode())||!(event instanceof ClipboardEvent))return false;
      const data=event.clipboardData;if(!data||data.getData('application/x-lexical-editor')||data.getData('text/html'))return false;
      const text=data.getData('text/plain');if(!text)return false;
      const nodes:LexicalNode[]=[];
      text.replace(/\r\n?/g,'\n').split('\n').forEach((line,index)=>{
        if(index)nodes.push($createLineBreakNode());if(line)nodes.push($createTextNode(line));
      });
      event.preventDefault();$insertNotePhrasing(s,nodes);return true;
    },COMMAND_PRIORITY_HIGH);
    function exitAtEdge(event:KeyboardEvent|null,backward:boolean){
      const s=$getSelection();if(!$isRangeSelection(s)||!s.isCollapsed())return false;
      const node=s.anchor.getNode(),note=containingNote(node);
      if(!note||!$isTextNode(node))return false;
      const atEdge=backward?node.is(note.getFirstDescendant())&&s.anchor.offset===0:
        node.is(note.getLastDescendant())&&s.anchor.offset===node.getTextContentSize();
      if(!atEdge)return false;
      event?.preventDefault();
      if(backward)note.selectPrevious();else leaveNote();
      return true;
    }
    const backspace=editor.registerCommand(KEY_BACKSPACE_COMMAND,event=>exitAtEdge(event,true),COMMAND_PRIORITY_HIGH);
    const forwardDelete=editor.registerCommand(KEY_DELETE_COMMAND,event=>exitAtEdge(event,false),COMMAND_PRIORITY_HIGH);
    const composing=registerNoteCompositionGuard(editor);
    const enter=editor.registerCommand(KEY_ENTER_COMMAND,event=>{
      const s=$getSelection();if(!$isRangeSelection(s)||!containingNote(s.anchor.getNode()))return false;
      if(event?.isComposing)return false;
      event?.preventDefault();s.insertLineBreak();return true;
    },COMMAND_PRIORITY_HIGH);
    const typing=registerNoteEdgeTypingGuard(editor);
    return()=>{escape();down();typing();copying();cutting();pasting();plainPaste();backspace();forwardDelete();composing();enter();};
  },[editor]);
  function insertNote(kind:NoteKind='sidenote'){
    editor.update(()=>{
      const s=$getSelection();
      if(!$isRangeSelection(s)||!s.isCollapsed()){setStatus('본문의 삽입 위치 한 곳을 선택하세요.');return;}
      if(containingNote(s.anchor.getNode())){setStatus('노트 안에 노트를 넣을 수 없습니다.');return;}
      const note=$createNoteNode(crypto.randomUUID(),kind).append($createTextNode('새 노트'));
      s.insertNodes([note]);note.selectStart();setStatus('새 노트를 삽입했습니다. Escape로 본문에 돌아갑니다.');
    });editor.focus();
  }
  function noteOperation(operation:'split'|'merge'|'previous'|'next'){
    editor.update(()=>{
      const s=$getSelection();if(!$isRangeSelection(s))return;
      const note=containingNote(s.anchor.getNode());if(!note){setStatus('먼저 노트 안으로 이동하세요.');return;}
      const ok=operation==='split'?Boolean($splitNoteAtSelection(crypto.randomUUID())):
        operation==='merge'?$mergeNoteWithNext(note):$moveNote(note,operation);
      setStatus(ok?'노트 구조를 변경했습니다.':'이 위치에서 노트 구조를 변경할 수 없습니다.');
    },{tag:HISTORY_PUSH_TAG});editor.focus();
  }
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
    if(inspectEditorStructure(editor).length){setHtml('');setJson(JSON.stringify(editor.getEditorState().toJSON(),null,2));setStatus('구조를 수정해야 HTML을 생성할 수 있습니다. JSON은 복구용으로 보존합니다.');return;}
    editor.getEditorState().read(()=>setHtml($generateHtmlFromNodes(editor)));
    setJson(JSON.stringify(editor.getEditorState().toJSON(),null,2));setStatus('JSON과 HTML을 생성했습니다.');
  }
  function save(){
    try{const invalid=inspectEditorStructure(editor).length>0;localStorage.setItem(invalid?'lexical-tufte-recovery-v1':'lexical-tufte-p1',JSON.stringify(editor.getEditorState().toJSON()));setStatus(invalid?'구조 오류가 있어 복구용 사본에만 저장했습니다. 마지막 저장 문서는 유지합니다.':'이 브라우저에 저장했습니다.');}
    catch{setStatus('저장 실패: 저장 공간을 확인하세요.');}
  }
  function restore(){
    try{
      const raw=localStorage.getItem('lexical-tufte-p1');if(!raw){setStatus('저장한 문서가 없습니다.');return;}
      replaceEditorDocumentState(editor,editor.parseEditorState(raw));setStatus('저장한 문서를 불러왔습니다.');
    }catch{setStatus('문서를 불러오지 못했습니다.');}
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
      {([['quote','인용문 삽입'],['epigraph','Epigraph 삽입'],['section-footer','섹션 출처 삽입']] as const).map(([kind,label])=><IconButton key={kind} name={kind==='epigraph'?'epigraph':'quote'} label={label} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,kind)}/>)}
      <IconButton name="rule" label="구분선 삽입" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined)}/>
      <IconButton name="attribution" label="인용문 출처 추가" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined)}/>
      <IconButton name="attribution" label="섹션 문헌 추가" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_SECTION_CITE_COMMAND,undefined)}/>
      <IconButton name="definition" label="정의목록 삽입" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_DEFINITION_LIST_COMMAND,undefined)}/>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_DEFINITION_PAIR_COMMAND,undefined)}>정의목록 항목 추가</button>
      {(['sans','newthought','numeral','danger'] as const).map(kind=><button key={kind} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_SPAN_KIND_COMMAND,kind)}>인라인 {kind}</button>)}
      <IconButton name="sidenote" label="노트 삽입" onMouseDown={preserve} onClick={()=>insertNote()}/>
      <IconButton name="marginnote" label="여백 주석 삽입" onMouseDown={preserve} onClick={()=>insertNote('marginnote')}/>
      <button onMouseDown={preserve} onClick={()=>editor.update(()=>{if(!enterNote())setStatus('뒤에 있는 노트를 찾지 못했습니다.');})}>다음 노트로</button>
      <button onMouseDown={preserve} onClick={()=>editor.update(leaveNote)}>본문으로</button>
      {INLINE_ACTIONS.map(action=><IconButton key={action.id} name={action.icon} label={action.label} onMouseDown={preserve} onClick={()=>editor.update(()=>{editor.dispatchCommand(FORMAT_TEXT_COMMAND,action.id);},{tag:HISTORY_PUSH_TAG})}/>)}
      <button onMouseDown={preserve} onClick={()=>insertPayload('link')}>노트 링크 삽입</button>
      <button onMouseDown={preserve} onClick={()=>insertPayload('image')}>노트 이미지 삽입</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('split')}>노트 나누기</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('merge')}>다음 노트와 합치기</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('previous')}>노트 앞으로 이동</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('next')}>노트 뒤로 이동</button>
      <IconButton name="undo" label="실행 취소" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(UNDO_COMMAND,undefined)}/>
      <IconButton name="redo" label="다시 실행" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(REDO_COMMAND,undefined)}/>
    </div>
    <p id="help">본문에서 Alt+↓: 다음 노트로 이동 · 노트에서 Escape: 본문으로 이동</p>
    <main>
      <RichTextPlugin contentEditable={<ContentEditable className="editor" aria-label="본문과 사이드노트 편집" aria-describedby="help"/>} ErrorBoundary={LexicalErrorBoundary}/>
      <HistoryPlugin/><TablePlugin/><SelectionToolbar/><BlockContextMenu/>
    </main>
    <p role="status" aria-label="편집 작업 상태">{status}</p><p role="status" aria-label="자동 복구 저장 상태">{autoSaveState}</p>
    {structureIssues.length>0&&<aside role="alert" aria-label="문서 구조 복구"><p>문서 구조를 수정하세요. 내용은 자동 삭제하지 않으며 HTML 생성은 차단됩니다.</p><ul>{structureIssues.map((issue,i)=><li key={`${issue.key}-${i}`}><button onClick={()=>focusStructureIssue(editor,issue.key)}>{issue.message}</button> <code>{issue.path}</code></li>)}</ul><button onClick={()=>editor.dispatchCommand(UNDO_COMMAND,undefined)}>구조 변경 실행 취소</button><button onClick={recoverStructure} disabled={!checkpoint.current}>마지막 정상 구조로 복구</button></aside>}
    <div className="actions"><button onClick={save}>저장</button><button onClick={restore}>불러오기</button><button onClick={restoreRecovery} disabled={!recoveryAvailable}>복구용 사본 열기</button><button onClick={exportRecovery} disabled={!recoveryAvailable}>복구본 JSON 내보내기</button><button onClick={deleteRecovery} disabled={!recoveryAvailable}>복구본 정리</button><button onClick={exportDocument}>JSON·HTML 확인</button><button onClick={()=>{editor.update($loadLayoutFixture,{tag:HISTORY_PUSH_TAG});setStatus('레이아웃 예제를 불러왔습니다. 실행 취소할 수 있습니다.');}}>레이아웃 예제 불러오기</button></div>
    <details><summary>JSON과 발행 HTML 검사</summary><label>JSON<textarea ref={textarea} aria-label="문서 JSON" value={json} readOnly/></label><label>HTML<textarea aria-label="발행 HTML" value={html} readOnly/></label></details>
    <p className="notice">프로토타입: 공개 발행·모바일 여백 배치·OS별 실제 IME와 다른 브라우저 검증은 후속 단계에서 진행합니다. 한글 웹폰트 자산 연결은 P4 대상입니다.</p>
  </>;
}
createRoot(document.getElementById('root')!).render(<LexicalComposer initialConfig={{namespace:'tufte-p1',nodes:TUFTE_NODES,editorState:seed,onError(error){throw error;},theme:{text:{bold:'text-bold',italic:'text-italic',code:'text-code',underline:'text-underline',strikethrough:'text-strike',underlineStrikethrough:'text-underline-strike',highlight:'text-highlight'}}}}><EditorUI/></LexicalComposer>);
