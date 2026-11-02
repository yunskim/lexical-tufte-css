import {useEffect,useId,useRef,useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isHeadingNode} from '@lexical/rich-text';
import {$getNodeByKey,$setSelection,$getSelection,$isRangeSelection,$createRangeSelection,HISTORY_PUSH_TAG,type RangeSelection,type LexicalNode} from 'lexical';
import {canonicalBlockType,SET_TUFTE_BLOCK_COMMAND,INSERT_TUFTE_LIST_COMMAND,INSERT_TUFTE_DEFINITION_LIST_COMMAND,INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,INSERT_TUFTE_QUOTATION_COMMAND} from '@lexical-tufte/lexical';
import {canOpenBlockMenu,blockMenuCapabilities,NO_BLOCK_MENU_ACTIONS,type BlockMenuCapabilities} from './blockMenuCapabilities.js';

export function BlockContextMenu(){
 const [editor]=useLexicalComposerContext();
 const menuId=useId();
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
   requestAnimationFrame(()=>menuRef.current?.querySelector<HTMLButtonElement>('[role="menu"] button')?.focus());
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
   requestAnimationFrame(()=>menuRef.current?.querySelector<HTMLButtonElement>('[role="menu"] button')?.focus());
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
 return <div ref={menuRef} className={point&&open?'block-context-menu is-floating':'block-context-menu'} style={point&&open?{left:point.x,top:point.y}:undefined} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();restoreTarget();}else if(open&&event.key==='Tab'){event.preventDefault();moveFocusPastMenu(event.shiftKey);}else if(open&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){const buttons=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menu"] button')??[]);const index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(buttons.length){event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}}}}>
  <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onMouseDown={event=>event.preventDefault()} onClick={()=>{if(open){closeMenu();return;}let valid=false;editor.getEditorState().read(()=>{const selection=$getSelection();if($isRangeSelection(selection)&&selection.isCollapsed()&&canOpenBlockMenu(selection.anchor.getNode())){captureTarget(selection);valid=true;}});if(!valid)return;menuOpenRef.current=true;setPoint(null);setOpen(true);requestAnimationFrame(()=>menuRef.current?.querySelector<HTMLButtonElement>('[role="menu"] button')?.focus());}}>블록 유형: {blockType} ▾</button>
  {open&&<div id={menuId} role="menu" aria-label="블록 유형" aria-orientation="vertical">
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

