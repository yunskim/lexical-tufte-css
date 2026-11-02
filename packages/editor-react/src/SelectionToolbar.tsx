import {useEffect,useRef,useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection,$isRangeSelection,FORMAT_TEXT_COMMAND} from 'lexical';
import {ToolbarIcon} from './toolbar.js';
import {INLINE_ACTIONS,EDITOR_SHORTCUTS} from './inlineActions.js';

export function SelectionToolbar(){
 const [editor]=useLexicalComposerContext();

 const [position,setPosition]=useState<{top:number;left:number}|null>(null);
 const dismissed=useRef(false);
 const toolbarRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  const update=()=>{
   if(editor.isComposing()){setPosition(null);return;}
   if(toolbarRef.current?.contains(document.activeElement))return;
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
  {INLINE_ACTIONS.map(action=><button key={action.id} type="button" aria-label={action.label} title={EDITOR_SHORTCUTS[action.label]?`${action.label} (${EDITOR_SHORTCUTS[action.label]})`:action.label} onMouseDown={e=>e.preventDefault()} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,action.id)}><ToolbarIcon name={action.icon}/></button>)}
 </div>;
}

