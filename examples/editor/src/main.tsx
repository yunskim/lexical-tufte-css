import {useEffect, useRef, useState} from 'react';
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
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, CUT_COMMAND, PASTE_COMMAND, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND, HISTORY_PUSH_TAG, UNDO_COMMAND, REDO_COMMAND,
  COMMAND_PRIORITY_HIGH, type LexicalNode, type EditorState,
} from 'lexical';
import {registerFigureCommands,INSERT_TUFTE_FIGURE_COMMAND,SET_TUFTE_FIGURE_WIDTH_COMMAND,INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,registerQuotationCommands,INSERT_TUFTE_QUOTATION_COMMAND,APPEND_TUFTE_ATTRIBUTION_COMMAND,registerListCommands,INSERT_TUFTE_LIST_COMMAND,APPEND_TUFTE_LIST_ITEM_COMMAND,registerInlineCommands,SET_TUFTE_SPAN_KIND_COMMAND,registerDefinitionCommands,INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,registerSectionCommands,WRAP_TUFTE_ROOT_COMMAND,INSERT_TUFTE_SECTION_COMMAND,SPLIT_TUFTE_SECTION_COMMAND,MERGE_TUFTE_SECTION_COMMAND,SET_TUFTE_BLOCK_COMMAND,inspectEditorStructure,focusStructureIssue,type StructureIssue,replaceEditorDocumentState,TUFTE_NODES,NoteNode, $createNoteNode, $createInlineImageNode, $splitNoteAtSelection, $mergeNoteWithNext, $moveNote, $insertNotePhrasing, $reidentifyPastedNotes, registerNoteCompositionGuard, registerNoteEdgeTypingGuard, type NoteKind} from '@lexical-tufte/lexical';
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
  const preserve=(e:React.MouseEvent)=>e.preventDefault();
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
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,'bullet')}>글머리표 목록 삽입</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,'number')}>번호 목록 삽입</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_LIST_ITEM_COMMAND,undefined)}>목록 항목 추가</button>
      {([['quote','인용문 삽입'],['epigraph','Epigraph 삽입'],['section-footer','섹션 출처 삽입']] as const).map(([kind,label])=><button key={kind} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,kind)}>{label}</button>)}
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined)}>인용문 출처 추가</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(INSERT_TUFTE_DEFINITION_LIST_COMMAND,undefined)}>정의목록 삽입</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(APPEND_TUFTE_DEFINITION_PAIR_COMMAND,undefined)}>정의목록 항목 추가</button>
      {(['sans','newthought','numeral','danger'] as const).map(kind=><button key={kind} onMouseDown={preserve} onClick={()=>editor.dispatchCommand(SET_TUFTE_SPAN_KIND_COMMAND,kind)}>인라인 {kind}</button>)}
      <button onMouseDown={preserve} onClick={()=>insertNote()}>노트 삽입</button>
      <button onMouseDown={preserve} onClick={()=>insertNote('marginnote')}>여백 주석 삽입</button>
      <button onMouseDown={preserve} onClick={()=>editor.update(()=>{if(!enterNote())setStatus('뒤에 있는 노트를 찾지 못했습니다.');})}>다음 노트로</button>
      <button onMouseDown={preserve} onClick={()=>editor.update(leaveNote)}>본문으로</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'bold')}>굵게</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'italic')}>기울임</button>
      <button onMouseDown={preserve} onClick={()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'code')}>코드</button>
      {([['underline','밑줄'],['strikethrough','취소선'],['highlight','마크']] as const).map(([format,label])=><button key={format} onMouseDown={preserve} onClick={()=>editor.update(()=>{editor.dispatchCommand(FORMAT_TEXT_COMMAND,format);},{tag:HISTORY_PUSH_TAG})}>{label}</button>)}
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
    {structureIssues.length>0&&<aside role="alert" aria-label="문서 구조 복구"><p>문서 구조를 수정하세요. 내용은 자동 삭제하지 않으며 HTML 생성은 차단됩니다.</p><ul>{structureIssues.map((issue,i)=><li key={`${issue.key}-${i}`}><button onClick={()=>focusStructureIssue(editor,issue.key)}>{issue.message}</button> <code>{issue.path}</code></li>)}</ul><button onClick={()=>editor.dispatchCommand(UNDO_COMMAND,undefined)}>구조 변경 실행 취소</button><button onClick={recoverStructure} disabled={!checkpoint.current}>마지막 정상 구조로 복구</button></aside>}
    <div className="actions"><button onClick={save}>저장</button><button onClick={restore}>불러오기</button><button onClick={()=>{try{const raw=localStorage.getItem('lexical-tufte-recovery-v1');if(!raw){setStatus('복구용 사본이 없습니다.');return;}replaceEditorDocumentState(editor,editor.parseEditorState(raw));setStatus('복구용 사본을 열었습니다. 구조를 수정하세요.');}catch{setStatus('복구용 사본을 열지 못했습니다.');}}}>복구용 사본 열기</button><button onClick={exportDocument}>JSON·HTML 확인</button><button onClick={()=>{editor.update($loadLayoutFixture,{tag:HISTORY_PUSH_TAG});setStatus('레이아웃 예제를 불러왔습니다. 실행 취소할 수 있습니다.');}}>레이아웃 예제 불러오기</button></div>
    <details><summary>JSON과 발행 HTML 검사</summary><label>JSON<textarea ref={textarea} aria-label="문서 JSON" value={json} readOnly/></label><label>HTML<textarea aria-label="발행 HTML" value={html} readOnly/></label></details>
    <p className="notice">프로토타입: 공개 발행·모바일 여백 배치·OS별 실제 IME와 다른 브라우저 검증은 후속 단계에서 진행합니다. 한글 웹폰트 자산 연결은 P4 대상입니다.</p>
  </>;
}
createRoot(document.getElementById('root')!).render(<LexicalComposer initialConfig={{namespace:'tufte-p1',nodes:TUFTE_NODES,editorState:seed,onError(error){throw error;},theme:{text:{bold:'text-bold',italic:'text-italic',code:'text-code',underline:'text-underline',strikethrough:'text-strike',underlineStrikethrough:'text-underline-strike',highlight:'text-highlight'}}}}><EditorUI/></LexicalComposer>);
