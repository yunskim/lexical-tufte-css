import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {TableNode,TableRowNode,TableCellNode} from '@lexical/table';
import {$loadLayoutFixture} from './layoutFixture.js';
import {LinkNode, $createLinkNode} from '@lexical/link';
import {$generateHtmlFromNodes} from '@lexical/html';
import {
  $getRoot, $getSelection, $isRangeSelection, $isElementNode, $isTextNode,
  $createParagraphNode, $createTextNode, $createLineBreakNode, $isParagraphNode,
  FORMAT_TEXT_COMMAND, KEY_ESCAPE_COMMAND, KEY_ARROW_DOWN_COMMAND, KEY_ENTER_COMMAND,
  COMPOSITION_START_COMMAND, SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, CUT_COMMAND, PASTE_COMMAND, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND, HISTORY_PUSH_TAG, UNDO_COMMAND, REDO_COMMAND,
  COMMAND_PRIORITY_HIGH, type LexicalNode,
} from 'lexical';
import {NoteNode, InlineImageNode, $createNoteNode, $createInlineImageNode, $splitNoteAtSelection, $mergeNoteWithNext, $moveNote, $insertNotePhrasing, type NoteKind, SectionNode,FigureNode,CaptionNode,TableLayoutNode} from '@lexical-tufte/lexical';
import './style.css';

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
    const cutting=editor.registerCommand(CUT_COMMAND,()=>{
      cutIds.clear();const s=$getSelection();
      if($isRangeSelection(s))for(const node of s.getNodes()){
        const note=containingNote(node);if(note)cutIds.add(note.getNoteId());
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
      const existing=new Set<string>();
      function ids(n:LexicalNode){if(n instanceof NoteNode)existing.add(n.getNoteId());if($isElementNode(n))n.getChildren().forEach(ids);}
      ids($getRoot());
      for(const note of notes){
        if(!cutIds.has(note.getNoteId())||existing.has(note.getNoteId()))note.setNoteId(crypto.randomUUID());
      }
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
    const composing=editor.registerCommand(COMPOSITION_START_COMMAND,()=>{
      const s=$getSelection();if(!$isRangeSelection(s)||!s.isCollapsed())return false;
      const node=s.anchor.getNode();
      if(!$isTextNode(node)||!(node.getParent() instanceof NoteNode))return false;
      const offset=s.anchor.offset;
      if(offset===0||offset===node.getTextContentSize()){
        // Let Lexical own composition, but provide an interior text position
        // before its default edge heuristic runs. Lexical removes this marker.
        node.spliceText(offset,0,'\u200b',false);
        const point=offset===0?1:offset;node.select(point,point);
      }
      return false;
    },COMMAND_PRIORITY_HIGH);
    const enter=editor.registerCommand(KEY_ENTER_COMMAND,event=>{
      const s=$getSelection();if(!$isRangeSelection(s)||!containingNote(s.anchor.getNode()))return false;
      if(event?.isComposing)return false;
      event?.preventDefault();s.insertLineBreak();return true;
    },COMMAND_PRIORITY_HIGH);
    // Prototype boundary guard: intercept native edge insertion before Lexical
    // normalizes an inline boundary into the surrounding paragraph.
    const beforeInput=(event:InputEvent)=>{
      if(event.inputType!=='insertText'||event.isComposing||event.data===null)return;
      editor.update(()=>{
        const s=$getSelection();
        if(!$isRangeSelection(s)||!s.isCollapsed())return;
        const node=s.anchor.getNode();
        if(!$isTextNode(node)||!(node.getParent() instanceof NoteNode))return;
        const offset=s.anchor.offset;
        if(offset!==0&&offset!==node.getTextContentSize())return;
        event.preventDefault();event.stopImmediatePropagation();
        if(node.getFormat()===s.format&&node.getStyle()===s.style)node.spliceText(offset,0,event.data!,true);
        else{
          const inserted=$createTextNode(event.data!).setFormat(s.format).setStyle(s.style);
          if(offset===0)node.insertBefore(inserted);else node.insertAfter(inserted);
          inserted.selectEnd();
        }
      });
    };
    const typing=editor.registerRootListener((root,previous)=>{
      previous?.removeEventListener('beforeinput',beforeInput as EventListener,true);
      root?.addEventListener('beforeinput',beforeInput as EventListener,true);
    });
    return()=>{escape();down();typing();cutting();pasting();plainPaste();backspace();forwardDelete();composing();enter();};
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
    editor.getEditorState().read(()=>setHtml($generateHtmlFromNodes(editor)));
    setJson(JSON.stringify(editor.getEditorState().toJSON(),null,2));setStatus('JSON과 HTML을 생성했습니다.');
  }
  function save(){
    try{localStorage.setItem('lexical-tufte-p1',JSON.stringify(editor.getEditorState().toJSON()));setStatus('이 브라우저에 저장했습니다.');}
    catch{setStatus('저장 실패: 저장 공간을 확인하세요.');}
  }
  function restore(){
    try{
      const raw=localStorage.getItem('lexical-tufte-p1');if(!raw){setStatus('저장한 문서가 없습니다.');return;}
      editor.setEditorState(editor.parseEditorState(raw));setStatus('저장한 문서를 불러왔습니다.');
    }catch{setStatus('문서를 불러오지 못했습니다.');}
  }
  const preserve=(e:React.MouseEvent)=>e.preventDefault();
  return <>
    <header><h1>사이드노트 편집 프로토타입</h1><p>P1.2 · 본문과 노트를 한 편집 상태에서 작성합니다.</p></header>
    <div className="toolbar" role="toolbar" aria-label="노트 편집">
      <button onMouseDown={preserve} onClick={()=>insertNote()}>노트 삽입</button>
      <button onMouseDown={preserve} onClick={()=>insertNote('marginnote')}>여백 주석 삽입</button>
      <button onMouseDown={preserve} onClick={()=>editor.update(()=>{if(!enterNote())setStatus('뒤에 있는 노트를 찾지 못했습니다.');})}>다음 노트로</button>
      <button onMouseDown={preserve} onClick={()=>editor.update(leaveNote)}>본문으로</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'bold')}>굵게</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'italic')}>기울임</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'code')}>코드</button>
      <button onMouseDown={preserve} onClick={()=>insertPayload('link')}>노트 링크 삽입</button>
      <button onMouseDown={preserve} onClick={()=>insertPayload('image')}>노트 이미지 삽입</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('split')}>노트 나누기</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('merge')}>다음 노트와 합치기</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('previous')}>노트 앞으로 이동</button>
      <button onMouseDown={preserve} onClick={()=>noteOperation('next')}>노트 뒤로 이동</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(UNDO_COMMAND,undefined)}>실행 취소</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(REDO_COMMAND,undefined)}>다시 실행</button>
    </div>
    <p id="help">본문에서 Alt+↓: 다음 노트로 이동 · 노트에서 Escape: 본문으로 이동</p>
    <main>
      <RichTextPlugin contentEditable={<ContentEditable className="editor" aria-label="본문과 사이드노트 편집" aria-describedby="help"/>} ErrorBoundary={LexicalErrorBoundary}/>
      <HistoryPlugin/><TablePlugin/>
    </main>
    <p role="status">{status}</p>
    <div className="actions"><button onClick={save}>저장</button><button onClick={restore}>불러오기</button><button onClick={exportDocument}>JSON·HTML 확인</button><button onClick={()=>{editor.update($loadLayoutFixture,{tag:HISTORY_PUSH_TAG});setStatus('레이아웃 예제를 불러왔습니다. 실행 취소할 수 있습니다.');}}>레이아웃 예제 불러오기</button></div>
    <details><summary>JSON과 발행 HTML 검사</summary><label>JSON<textarea ref={textarea} aria-label="문서 JSON" value={json} readOnly/></label><label>HTML<textarea aria-label="발행 HTML" value={html} readOnly/></label></details>
    <p className="notice">프로토타입: 공개 발행·모바일 여백 배치·OS별 실제 IME와 다른 브라우저 검증은 후속 단계에서 진행합니다. 한글 웹폰트 자산 연결은 P4 대상입니다.</p>
  </>;
}
createRoot(document.getElementById('root')!).render(<LexicalComposer initialConfig={{namespace:'tufte-p1',nodes:[NoteNode,InlineImageNode,LinkNode,SectionNode,FigureNode,CaptionNode,TableLayoutNode,TableNode,TableRowNode,TableCellNode],editorState:seed,onError(error){throw error;},theme:{text:{bold:'text-bold',italic:'text-italic',code:'text-code'}}}}><EditorUI/></LexicalComposer>);
