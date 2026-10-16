import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {LinkNode, $createLinkNode} from '@lexical/link';
import {$generateHtmlFromNodes} from '@lexical/html';
import {
  $getRoot, $getSelection, $isRangeSelection, $isElementNode, $isTextNode,
  $createParagraphNode, $createTextNode,
  FORMAT_TEXT_COMMAND, KEY_ESCAPE_COMMAND, KEY_ARROW_DOWN_COMMAND,
  COMMAND_PRIORITY_HIGH, type LexicalNode,
} from 'lexical';
import {NoteNode, InlineImageNode, $createNoteNode, $createInlineImageNode} from '@lexical-tufte/lexical';
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
    return()=>{escape();down();typing();};
  },[editor]);
  function insertNote(){
    editor.update(()=>{
      const s=$getSelection();
      if(!$isRangeSelection(s)||!s.isCollapsed()){setStatus('본문의 삽입 위치 한 곳을 선택하세요.');return;}
      if(containingNote(s.anchor.getNode())){setStatus('노트 안에 노트를 넣을 수 없습니다.');return;}
      const note=$createNoteNode(crypto.randomUUID()).append($createTextNode('새 노트'));
      s.insertNodes([note]);note.selectStart();setStatus('새 노트를 삽입했습니다. Escape로 본문에 돌아갑니다.');
    });editor.focus();
  }
  function insertPayload(kind:'link'|'image'){
    editor.update(()=>{
      const s=$getSelection();if(!$isRangeSelection(s))return;
      if(!containingNote(s.anchor.getNode())){setStatus('먼저 노트 안으로 이동하세요.');return;}
      if(kind==='link'){
        const link=$createLinkNode('https://lexical.dev').append($createTextNode('Lexical 문서'));
        s.insertNodes([link,$createTextNode(' ')]);
      }else s.insertNodes([$createInlineImageNode('/fixture.svg','프로토타입의 파란 막대 그림'),$createTextNode(' ')]);
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
    <header><h1>사이드노트 편집 프로토타입</h1><p>P1.1 · 본문과 노트를 한 편집 상태에서 작성합니다.</p></header>
    <div className="toolbar" role="toolbar" aria-label="노트 편집">
      <button onMouseDown={preserve} onClick={insertNote}>노트 삽입</button>
      <button onMouseDown={preserve} onClick={()=>editor.update(()=>{if(!enterNote())setStatus('뒤에 있는 노트를 찾지 못했습니다.');})}>다음 노트로</button>
      <button onMouseDown={preserve} onClick={()=>editor.update(leaveNote)}>본문으로</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'bold')}>굵게</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'italic')}>기울임</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'code')}>코드</button>
      <button onMouseDown={preserve} onClick={()=>insertPayload('link')}>노트 링크 삽입</button>
      <button onMouseDown={preserve} onClick={()=>insertPayload('image')}>노트 이미지 삽입</button>
    </div>
    <p id="help">본문에서 Alt+↓: 다음 노트로 이동 · 노트에서 Escape: 본문으로 이동</p>
    <main>
      <RichTextPlugin contentEditable={<ContentEditable className="editor" aria-label="본문과 사이드노트 편집" aria-describedby="help"/>} ErrorBoundary={LexicalErrorBoundary}/>
      <HistoryPlugin/>
    </main>
    <p role="status">{status}</p>
    <div className="actions"><button onClick={save}>저장</button><button onClick={restore}>불러오기</button><button onClick={exportDocument}>JSON·HTML 확인</button></div>
    <details><summary>JSON과 발행 HTML 검사</summary><label>JSON<textarea ref={textarea} aria-label="문서 JSON" value={json} readOnly/></label><label>HTML<textarea aria-label="발행 HTML" value={html} readOnly/></label></details>
    <p className="notice">프로토타입: 공개 발행·모바일 여백 배치·클립보드 및 IME 검증은 후속 단계에서 진행합니다. 한글 웹폰트 자산 연결은 P4 대상입니다.</p>
  </>;
}
createRoot(document.getElementById('root')!).render(<LexicalComposer initialConfig={{namespace:'tufte-p1',nodes:[NoteNode,InlineImageNode,LinkNode],editorState:seed,onError(error){throw error;},theme:{text:{bold:'text-bold',italic:'text-italic',code:'text-code'}}}}><EditorUI/></LexicalComposer>);
