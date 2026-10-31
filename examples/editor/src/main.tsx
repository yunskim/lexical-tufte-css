import type {AssetProvider,AssetSummary,AssetRevision} from '@lexical-tufte/editor-ports';
import {validateDocument,isSafeURL, type TufteDocument} from '@lexical-tufte/document';
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
import {$isHeadingNode} from '@lexical/rich-text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {
  $getRoot, $getSelection, $isRangeSelection, $isNodeSelection, $isElementNode, $isTextNode, $createRangeSelection, $setSelection,
  $createParagraphNode, $createTextNode, $createLineBreakNode, $isParagraphNode, $getNodeByKey,
  FORMAT_TEXT_COMMAND, KEY_ESCAPE_COMMAND, KEY_ARROW_DOWN_COMMAND, KEY_ENTER_COMMAND,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, COPY_COMMAND, CUT_COMMAND, PASTE_COMMAND, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND, HISTORY_PUSH_TAG, UNDO_COMMAND, REDO_COMMAND,
  COMMAND_PRIORITY_HIGH, type LexicalNode, type EditorState, type RangeSelection,
} from 'lexical';
import {canonicalBlockType,exportCanonicalEditorState,parseCanonicalEditorState,loadDocumentIntoEditor,exportEditorToDocument,registerFigureCommands,INSERT_TUFTE_FIGURE_COMMAND,SET_TUFTE_FIGURE_WIDTH_COMMAND,INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,registerQuotationCommands,APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,SET_TUFTE_QUOTE_CITE_COMMAND,REMOVE_TUFTE_QUOTATION_COMMAND,INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,INSERT_TUFTE_QUOTATION_COMMAND,APPEND_TUFTE_SECTION_CITE_COMMAND,APPEND_TUFTE_ATTRIBUTION_COMMAND,registerListKeyboardCommands,registerListCommands,INSERT_TUFTE_LIST_COMMAND,APPEND_TUFTE_LIST_ITEM_COMMAND,SET_TUFTE_LIST_KIND_COMMAND,CHANGE_TUFTE_LIST_INDENT_COMMAND,UNWRAP_TUFTE_LIST_COMMAND,registerInlineCommands,SET_TUFTE_SPAN_KIND_COMMAND,WRAP_TUFTE_SPAN_COMMAND,UNWRAP_TUFTE_SPAN_COMMAND,registerDefinitionCommands,INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,MOVE_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_LIST_COMMAND,registerSectionCommands,WRAP_TUFTE_ROOT_COMMAND,INSERT_TUFTE_SECTION_COMMAND,SPLIT_TUFTE_SECTION_COMMAND,MERGE_TUFTE_SECTION_COMMAND,SET_TUFTE_BLOCK_COMMAND,inspectEditorStructure,focusStructureIssue,type StructureIssue,replaceEditorDocumentState,TUFTE_NODES,NoteNode, InlineImageNode, $createSidenoteNode, $createMarginnoteNode, $createInlineImageNode, $splitNoteAtSelection, $mergeNoteWithNext, $moveNote, $insertNotePhrasing, $reidentifyPastedNotes, registerNoteCompositionGuard, registerNoteEdgeTypingGuard} from '@lexical-tufte/lexical';
import {NODE_SCHEMA} from '@lexical-tufte/document';
import {NoteImagePanel,type NoteImageChoice,type ImagePresentation} from './NoteImagePanel.js';
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

function canOpenBlockMenu(node:LexicalNode):boolean{
 let hasEditableBlock=false;
 for(let current:LexicalNode|null=node;current;current=current.getParent()){
  if(current instanceof NoteNode)return false;
  const type=canonicalBlockType(current.getType());
  if(['table','tablerow','tablecell','figure','image'].includes(type))return false;
  if(['paragraph','heading','quote'].includes(type))hasEditableBlock=true;
  if(type==='root')break;
 }
 return hasEditableBlock;
}
type BlockMenuCapabilities={paragraph:boolean;heading:boolean;insert:boolean};
const NO_BLOCK_MENU_ACTIONS:BlockMenuCapabilities={paragraph:false,heading:false,insert:false};
/** Match the structural preconditions of section/list/quotation commands before showing actions. */
function blockMenuCapabilities(node:LexicalNode):BlockMenuCapabilities{
 if(!canOpenBlockMenu(node))return NO_BLOCK_MENU_ACTIONS;
 let selected:LexicalNode|null=node;
 while(selected&&!['paragraph','heading','quote'].includes(canonicalBlockType(selected.getType())))selected=selected.getParent();
 if(!selected)return NO_BLOCK_MENU_ACTIONS;
 const selectedBlock=selected;
 const parent=selectedBlock.getParent();
 const children=$isElementNode(selectedBlock)?selectedBlock.getChildren():[];
 const canConvert=(target:'paragraph'|'heading')=>
  (canonicalBlockType(selectedBlock.getType())==='paragraph'||canonicalBlockType(selectedBlock.getType())==='heading')&&
  Boolean(parent&&NODE_SCHEMA[canonicalBlockType(parent.getType())]?.children?.includes(target))&&
  children.every(child=>NODE_SCHEMA[target]?.children?.includes(canonicalBlockType(child.getType())));
 let section:LexicalNode|null=node;
 while(section&&canonicalBlockType(section.getType())!=='tufte-section')section=section.getParent();
 let direct:LexicalNode=node;
 if(section){
  while(direct.getParent()&&!direct.getParent()!.is(section))direct=direct.getParent()!;
 }
 const insert=Boolean(section&&section.getParent()?.getType()==='root'&&
  direct.getParent()?.is(section)&&NODE_SCHEMA['tufte-section']?.children?.includes(canonicalBlockType(direct.getType())));
 return {paragraph:canConvert('paragraph'),heading:canConvert('heading'),insert};
}
function BlockContextMenu(){
 const [editor]=useLexicalComposerContext();
 const [open,setOpen]=useState(false);
 const [available,setAvailable]=useState(false);
 const [blockType,setBlockType]=useState('본문');
 const [capabilities,setCapabilities]=useState<BlockMenuCapabilities>(NO_BLOCK_MENU_ACTIONS);
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 const menuRef=useRef<HTMLDivElement|null>(null);
 const menuOpenRef=useRef(false);
 const targetSelectionRef=useRef<RangeSelection|null>(null);
 const captureTarget=(selection:RangeSelection)=>{
  targetSelectionRef.current=selection.clone();
  setCapabilities(blockMenuCapabilities(selection.anchor.getNode()));
  let node:LexicalNode=selection.anchor.getNode();
  while(node.getParent()&&node.getParent()?.getKey()!=='root'&&!['paragraph','heading','quote'].includes(canonicalBlockType(node.getType())))node=node.getParent()!;
  setBlockType($isHeadingNode(node)?(node.getTag()==='h3'?'제목 h3':'제목 h2'):canonicalBlockType(node.getType())==='quote'?'인용문':'본문');
  setAvailable(true);
 };
 const closeMenu=()=>{
  menuOpenRef.current=false;
  targetSelectionRef.current=null;
  setOpen(false);
  setPoint(null);
 };
 /** Restore the caret captured when opening; focus moving into the menu must not change the command target. */
 const restoreTarget=(action?:()=>void)=>{
  const target=targetSelectionRef.current;
  closeMenu();
  if(target){
   editor.update(()=>{
    const anchor=$getNodeByKey(target.anchor.key),focus=$getNodeByKey(target.focus.key);
    if(!anchor||!focus||editor.isComposing())return;
    $setSelection(target.clone());
    action?.();
   },action?{tag:HISTORY_PUSH_TAG,discrete:true}:{discrete:true});
  }
  editor.focus();
 };
 const moveFocusPastMenu=(backward:boolean)=>{
  const container=menuRef.current;
  const focusable=Array.from(document.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'))
   .filter(element=>element.getClientRects().length>0);
  const index=focusable.indexOf(document.activeElement as HTMLElement);
  const candidates=backward?focusable.slice(0,index).reverse():focusable.slice(index+1);
  const next=candidates.find(element=>!container?.contains(element));
  closeMenu();
  if(next)next.focus();else editor.focus();
 };
 useEffect(()=>editor.registerUpdateListener(({editorState})=>{
  editorState.read(()=>{
   // Menu items intentionally own DOM focus; do not erase the captured selection on editor blur.
   if(menuOpenRef.current)return;
   const selection=$getSelection();
   const valid=$isRangeSelection(selection)&&selection.isCollapsed()&&canOpenBlockMenu(selection.anchor.getNode());
   setAvailable(valid);
   if(valid)captureTarget(selection);
   else {setCapabilities(NO_BLOCK_MENU_ACTIONS);targetSelectionRef.current=null;}
  });
 }),[editor]);
 useEffect(()=>{
  const root=editor.getRootElement();
  if(!root)return;
  const onContext=(event:globalThis.MouseEvent)=>{
   if(editor.isComposing())return;
   const target=event.target;
   if(!(target instanceof Node)||!root.contains(target))return;
   const element=target instanceof Element?target:target.parentElement;
   // Do not steal the native menu from atomic media, table cells or note editors.
   if(element?.closest('figure, img, table, [data-tufte-editor="table-layout"], .tufte-note-editor, [contenteditable="false"]'))return;
   const caret=document.caretPositionFromPoint?.(event.clientX,event.clientY);
   const legacy=document.caretRangeFromPoint?.(event.clientX,event.clientY);
   const node=caret?.offsetNode??legacy?.startContainer;
   const offset=caret?.offset??legacy?.startOffset;
   if(!node||offset===undefined||!root.contains(node))return;
   const domSelection=window.getSelection();
   if(!domSelection)return;
   const range=document.createRange();
   try{range.setStart(node,offset);range.collapse(true);}catch{return;}
   let valid=false;
   editor.update(()=>{
    const selection=$createRangeSelection();
    selection.applyDOMRange(range);
    valid=selection.isCollapsed()&&canOpenBlockMenu(selection.anchor.getNode())&&selection.anchor.getNode().getType()!=='root';
    if(valid){$setSelection(selection);captureTarget(selection);}
   },{discrete:true});
   if(!valid)return;
   event.preventDefault();
   editor.focus();
   setPoint({x:Math.max(8,Math.min(window.innerWidth-260,event.clientX)),y:Math.max(8,Math.min(window.innerHeight-160,event.clientY))});
   menuOpenRef.current=true;
   setOpen(true);
   requestAnimationFrame(()=>menuRef.current?.querySelector<HTMLButtonElement>('#tufte-block-menu button')?.focus());
  };
  const onKeyboardMenu=(event:KeyboardEvent)=>{
   if(editor.isComposing()||!(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')))return;
   const target=event.target;
   const element=target instanceof Element?target:target instanceof Node?target.parentElement:null;
   if(element?.closest('figure, img, table, [data-tufte-editor="table-layout"], .tufte-note-editor, [contenteditable="false"]'))return;
   let valid=false;
   editor.getEditorState().read(()=>{
    const selection=$getSelection();
    valid=$isRangeSelection(selection)&&selection.isCollapsed()&&canOpenBlockMenu(selection.anchor.getNode());
    if($isRangeSelection(selection)&&valid)captureTarget(selection);
   });
   if(!valid)return;
   event.preventDefault();
   const selection=window.getSelection();
   const rect=selection?.rangeCount?selection.getRangeAt(0).getBoundingClientRect():root.getBoundingClientRect();
   setPoint({x:Math.max(8,Math.min(window.innerWidth-260,rect.left)),y:Math.max(8,Math.min(window.innerHeight-160,rect.bottom+8))});
   menuOpenRef.current=true;
   setOpen(true);
   requestAnimationFrame(()=>menuRef.current?.querySelector<HTMLButtonElement>('#tufte-block-menu button')?.focus());
  };
  root.addEventListener('keydown',onKeyboardMenu);
  root.addEventListener('contextmenu',onContext);
  return()=>{root.removeEventListener('contextmenu',onContext);root.removeEventListener('keydown',onKeyboardMenu);};
 },[editor]);
 useEffect(()=>{
  if(!open)return;
  const close=(event:PointerEvent)=>{
   if(!menuRef.current?.contains(event.target as Node))closeMenu();
  };
  document.addEventListener('pointerdown',close);
  return()=>document.removeEventListener('pointerdown',close);
 },[open]);
 useEffect(()=>{
  if(!open||!point)return;
  const reposition=()=>{
   const menu=menuRef.current;
   if(!menu)return;
   const viewport=window.visualViewport;
   const visibleWidth=viewport?.width??window.innerWidth;
   const visibleHeight=viewport?.height??window.innerHeight;
   menu.style.maxWidth=`${Math.max(1,visibleWidth-16)}px`;
   menu.style.maxHeight=`${Math.max(1,visibleHeight-16)}px`;
   const rect=menu.getBoundingClientRect();
   const left=viewport?.offsetLeft??0;
   const top=viewport?.offsetTop??0;
   const right=left+(viewport?.width??window.innerWidth);
   const bottom=top+(viewport?.height??window.innerHeight);
   const x=Math.max(left+8,Math.min(right-rect.width-8,point.x));
   const y=Math.max(top+8,Math.min(bottom-rect.height-8,point.y));
   if(x!==point.x||y!==point.y)setPoint({x,y});
  };
  reposition();
  window.addEventListener('resize',reposition);
  window.addEventListener('scroll',reposition,true);
  const visualViewport=window.visualViewport;
  visualViewport?.addEventListener('resize',reposition);
  visualViewport?.addEventListener('scroll',reposition);
  return()=>{window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);visualViewport?.removeEventListener('resize',reposition);visualViewport?.removeEventListener('scroll',reposition);if(menuRef.current){menuRef.current.style.maxWidth='';menuRef.current.style.maxHeight='';}};
 },[open,point]);
 useEffect(()=>{if(!available&&!open)setPoint(null);},[available]);
 if(!available&&!open)return null;
 return <div ref={menuRef} className={point&&open?'block-context-menu is-floating':'block-context-menu'} style={point&&open?{left:point.x,top:point.y}:undefined} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();restoreTarget();}else if(open&&event.key==='Tab'){event.preventDefault();moveFocusPastMenu(event.shiftKey);}else if(open&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){const buttons=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('#tufte-block-menu button')??[]);const index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(buttons.length){event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}}}}>
  <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls="tufte-block-menu" onMouseDown={event=>event.preventDefault()} onClick={()=>{if(open){closeMenu();return;}let valid=false;editor.getEditorState().read(()=>{const selection=$getSelection();if($isRangeSelection(selection)&&selection.isCollapsed()&&canOpenBlockMenu(selection.anchor.getNode())){captureTarget(selection);valid=true;}});if(!valid)return;menuOpenRef.current=true;setPoint(null);setOpen(true);requestAnimationFrame(()=>menuRef.current?.querySelector<HTMLButtonElement>('#tufte-block-menu button')?.focus());}}>블록 유형: {blockType} ▾</button>
  {open&&<div id="tufte-block-menu" role="menu" aria-label="블록 유형" aria-orientation="vertical">
   {([['paragraph','본문 문단'],['h2','제목 h2'],['h3','제목 h3']] as const).filter(([type])=>type==='paragraph'?capabilities.paragraph:capabilities.heading).map(([type,label])=><button type="button" key={type} role="menuitem" onMouseDown={event=>event.preventDefault()} onClick={()=>restoreTarget(()=>editor.dispatchCommand(SET_TUFTE_BLOCK_COMMAND,type))}>{label}</button>)}
   {capabilities.insert&&<>
    {([['bullet','글머리표 목록 삽입'],['number','번호 목록 삽입']] as const).map(([kind,label])=><button type="button" key={kind} role="menuitem" onMouseDown={event=>event.preventDefault()} onClick={()=>restoreTarget(()=>editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,kind))}>{label}</button>)}
    <button type="button" role="menuitem" onMouseDown={event=>event.preventDefault()} onClick={()=>restoreTarget(()=>editor.dispatchCommand(INSERT_TUFTE_DEFINITION_LIST_COMMAND,undefined))}>정의목록 삽입</button>
    <button type="button" role="menuitem" onMouseDown={event=>event.preventDefault()} onClick={()=>restoreTarget(()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined))}>구분선 삽입</button>
    <button type="button" role="menuitem" onMouseDown={event=>event.preventDefault()} onClick={()=>restoreTarget(()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'epigraph'))}>Epigraph 삽입</button>
    <button type="button" role="menuitem" onMouseDown={event=>event.preventDefault()} onClick={()=>restoreTarget(()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'section-footer'))}>섹션 출처 삽입</button>
    <button type="button" role="menuitem" onMouseDown={event=>event.preventDefault()} onClick={()=>restoreTarget(()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'quote'))}>인용문 삽입</button>
   </>}
  </div>}
 </div>;
}

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
  const [imageChooserOpen,setImageChooserOpen]=useState(false);
  const [noteImages,setNoteImages]=useState<NoteImageChoice[]>([]);
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
      void refreshHostAssetURLs();
    },Math.min(delay,2_147_483_647));
  }
  function scheduleRefreshRetry(){
    refreshFailures.current=Math.min(refreshFailures.current+1,6);
    const delay=Math.min(300_000,5000*2**(refreshFailures.current-1));
    clearRetryRefresh();
    retryRefreshTimer.current=setTimeout(()=>{
      retryRefreshTimer.current=null;
      void refreshHostAssetURLs(true);
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
  async function refreshHostAssetURLs(retryOnly=false){
    const provider=hostAssets.current;
    if(!provider||!hostNamespaceValid){
      setStatus('외부 이미지 갱신을 위한 호스트 설정이 없습니다.');return;
    }
    const generation=++refreshGeneration.current;
    if(!retryOnly)failedHostKeys.current.clear();
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
    if(pending.length===0){failedHostKeys.current.clear();refreshFailures.current=0;setRefreshingHostAssets(false);setStatus('갱신할 외부 이미지가 없습니다.');return;}
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
          !resolved.mediaType.startsWith('image/')||!isSafeURL(resolved.url,'image')){failed++;failedHostKeys.current.add(image.key);continue;}
        editor.update(()=>{
          const node=$getNodeByKey(image.key);
          if(!(node instanceof InlineImageNode))return;
          const current=node.getImageProperties();
          if(current.hostAsset?.namespace!==hostNamespace||
            current.hostAsset.assetId!==image.assetId||
            current.hostAsset.revisionId!==image.revisionId)return;
          node.setHostAsset(current.hostAsset,resolved.url,current.alt);
          refreshed++;
        },{tag:HISTORY_PUSH_TAG,discrete:true});
        scheduleExpiryRefresh(resolved.expiresAt);
      }
      if(generation!==refreshGeneration.current)return;
      if(failed){scheduleRefreshRetry();}else{refreshFailures.current=0;clearRetryRefresh();}
      setStatus('외부 이미지 URL 갱신: '+refreshed+'/'+pending.length+'개.'+(failed?' 실패 '+failed+'개, 재시도 예약.':''));
    }catch{if(generation===refreshGeneration.current){scheduleRefreshRetry();setStatus('외부 이미지 URL 갱신 중 오류가 발생했습니다. 재시도합니다.');}}
    finally{if(generation===refreshGeneration.current)setRefreshingHostAssets(false);}
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
  const [assetChooserOpen,setAssetChooserOpen]=useState(false);
  const [assetQuery,setAssetQuery]=useState('');
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

  const chooserNoteKey=useRef<string|null>(null);
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
  function insertNote(kind:'sidenote'|'marginnote'='sidenote'){
    editor.update(()=>{
      const s=$getSelection();
      if(!$isRangeSelection(s)||!s.isCollapsed()){setStatus('본문의 삽입 위치 한 곳을 선택하세요.');return;}
      if(containingNote(s.anchor.getNode())){setStatus('노트 안에 노트를 넣을 수 없습니다.');return;}
      const note=(kind==='sidenote'?$createSidenoteNode(crypto.randomUUID()):$createMarginnoteNode(crypto.randomUUID())).append($createTextNode('새 노트'));
      s.insertNodes([note]);note.selectStart();setStatus('새 노트를 삽입했습니다. Escape로 본문에 돌아갑니다.');
    },{tag:HISTORY_PUSH_TAG,discrete:true});editor.focus();
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
  function openNoteImageChooser(){
    let noteKey:string|null=null;
    const images:NoteImageChoice[]=[];
    editor.getEditorState().read(()=>{
      const selection=$getSelection();
      if(!$isRangeSelection(selection))return;
      const note=containingNote(selection.anchor.getNode());
      if(!note)return;
      noteKey=note.getKey();
      const inspect=(node:LexicalNode):void=>{
        if(node instanceof InlineImageNode){
          images.push({key:node.getKey(),...node.getImageProperties()});
        }else if($isElementNode(node))node.getChildren().forEach(inspect);
      };
      note.getChildren().forEach(inspect);
    });
    if(!noteKey){setStatus('먼저 노트 안으로 이동해 이미지를 선택하세요.');return;}
    if(!images.length){setStatus('현재 노트에 이미지가 없습니다. 이미지를 삽입한 후 다시 선택하세요.');return;}
    chooserNoteKey.current=noteKey;
    setNoteImages(images);setImageChooserOpen(true);
  }
  function closeNoteImageChooser(){
    setImageChooserOpen(false);
    chooserTrigger.current?.focus();
  }
  function saveNoteImage(imageKey:string,properties:ImagePresentation):boolean{
    const noteKey=chooserNoteKey.current;
    let valid=false;
    editor.getEditorState().read(()=>{
      const node=$getNodeByKey(imageKey),note=noteKey?$getNodeByKey(noteKey):null;
      valid=node instanceof InlineImageNode&&note instanceof NoteNode&&containingNote(node)?.is(note)===true;
    });
    if(!valid){setStatus('선택한 노트 또는 이미지가 변경되었습니다. 다시 선택하세요.');return false;}
    editor.update(()=>{
      const node=$getNodeByKey(imageKey),note=noteKey?$getNodeByKey(noteKey):null;
      if(!(node instanceof InlineImageNode)||!(note instanceof NoteNode)||!containingNote(node)?.is(note))return;
      node.setImagePresentation(properties.alt,properties.width,properties.height);
    },{tag:HISTORY_PUSH_TAG,discrete:true});
    setStatus('선택한 노트 이미지의 대체 텍스트와 표시 크기를 수정했습니다.');
    return true;
  }
  function exportDocument(){
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
      if(documentAssets.length===0&&existing===null){
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
      <IconButton name="sidenote" label="노트 삽입" onMouseDown={preserve} onClick={()=>insertNote()}/>
      <IconButton name="marginnote" label="여백 주석 삽입" onMouseDown={preserve} onClick={()=>insertNote('marginnote')}/>
      <button onMouseDown={preserve} onClick={()=>editor.update(()=>{if(!enterNote())setStatus('뒤에 있는 노트를 찾지 못했습니다.');})}>다음 노트로</button>
      <button onMouseDown={preserve} onClick={()=>editor.update(leaveNote)}>본문으로</button>
      {INLINE_ACTIONS.map(action=><IconButton key={action.id} name={action.icon} label={action.label} onMouseDown={preserve} onClick={()=>editor.update(()=>{editor.dispatchCommand(FORMAT_TEXT_COMMAND,action.id);},{tag:HISTORY_PUSH_TAG})}/>)}
      <button onMouseDown={preserve} onClick={()=>insertPayload('link')}>노트 링크 삽입</button>
      <button onMouseDown={preserve} onClick={()=>insertPayload('image')}>노트 이미지 삽입</button>
      <button ref={chooserTrigger} type="button" onMouseDown={preserve} onClick={openNoteImageChooser} aria-haspopup="dialog" aria-expanded={imageChooserOpen}>노트 이미지 선택</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('split')}>노트 나누기</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('merge')}>다음 노트와 합치기</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('previous')}>노트 앞으로 이동</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('next')}>노트 뒤로 이동</button>
      <IconButton name="undo" label="실행 취소" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(UNDO_COMMAND,undefined)}/>
      <IconButton name="redo" label="다시 실행" onMouseDown={preserve} onClick={()=>editor.dispatchCommand(REDO_COMMAND,undefined)}/>
    </div>
    {imageChooserOpen&&<NoteImagePanel images={noteImages} onClose={closeNoteImageChooser} onSave={saveNoteImage}/>}
    <p id="help">본문에서 Alt+↓: 다음 노트로 이동 · 노트에서 Escape: 본문으로 이동</p>
    <main>
      <RichTextPlugin contentEditable={<ContentEditable className="editor" aria-label="본문과 사이드노트 편집" aria-describedby="help"/>} ErrorBoundary={LexicalErrorBoundary}/>
      <HistoryPlugin/><TablePlugin/><SelectionToolbar/><BlockContextMenu/>
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
    {hostAssets.current&&<button type="button" disabled={refreshingHostAssets}
      onClick={()=>void refreshHostAssetURLs()}>{refreshingHostAssets?'외부 이미지 갱신 중…':'외부 이미지 URL 다시 확인'}</button>}
    <section role="group" aria-label="문서 이미지 자산">
      <button type="button" onClick={registerDocumentImage}>문서 이미지 자산 등록</button>
      <button ref={assetChooserTrigger} type="button" onClick={openAssetChooser}>이미지 라이브러리에서 선택</button>
      <p>문서 자산 {documentAssets.length}개</p>
      <ul>{documentAssets.map(asset=><li key={asset.id}>{asset.id} · {asset.mimeType} · {asset.width??'?'}×{asset.height??'?'} <button type="button" onClick={()=>connectDocumentAsset(asset)}>선택한 노트 이미지에 {asset.id} 연결</button></li>)}</ul>
    </section>
    <div className="actions"><button onClick={save}>저장</button><button onClick={restore}>불러오기</button><button onClick={restoreRecovery} disabled={!recoveryAvailable}>복구용 사본 열기</button><button onClick={exportRecovery} disabled={!recoveryAvailable}>복구본 JSON 내보내기</button><button onClick={deleteRecovery} disabled={!recoveryAvailable}>복구본 정리</button><button onClick={exportDocument}>JSON·HTML 확인</button><button onClick={()=>{editor.update($loadLayoutFixture,{tag:HISTORY_PUSH_TAG});setStatus('레이아웃 예제를 불러왔습니다. 실행 취소할 수 있습니다.');}}>레이아웃 예제 불러오기</button></div>
    <details><summary>JSON과 발행 HTML 검사</summary><label>JSON<textarea ref={textarea} aria-label="문서 JSON" value={json} readOnly/></label><label>HTML<textarea aria-label="발행 HTML" value={html} readOnly/></label></details>
    <p className="notice">프로토타입: 공개 발행·모바일 여백 배치·OS별 실제 IME와 다른 브라우저 검증은 후속 단계에서 진행합니다. 한글 웹폰트 자산 연결은 P4 대상입니다.</p>
  </>;
}
createRoot(document.getElementById('root')!).render(<LexicalComposer initialConfig={{namespace:'tufte-p1',nodes:TUFTE_NODES,editorState:seed,onError(error){throw error;},theme:{text:{bold:'text-bold',italic:'text-italic',code:'text-code',underline:'text-underline',strikethrough:'text-strike',underlineStrikethrough:'text-underline-strike',highlight:'text-highlight'}}}}><EditorUI/></LexicalComposer>);
