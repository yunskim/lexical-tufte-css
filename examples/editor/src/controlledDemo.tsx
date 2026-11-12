import {useRef,useState} from 'react';
import {UNDO_COMMAND,REDO_COMMAND,type LexicalEditor} from 'lexical';
import {createRoot} from 'react-dom/client';
import type {JsonNode,TufteDocument} from '@lexical-tufte/document';
import {TufteEditor,INSERT_TUFTE_NOTE_COMMAND,SPLIT_TUFTE_NOTE_COMMAND,MERGE_TUFTE_NOTE_COMMAND,MOVE_TUFTE_NOTE_COMMAND,OPEN_TUFTE_NOTE_IMAGE_EDITOR_COMMAND} from '@lexical-tufte/editor-react';
import fixture from '../../../fixtures/tufte/server-document.json';
import '@lexical-tufte/editor-react/styles.css';
import './style.css';

const source=fixture as unknown as TufteDocument;
function withText(text:string,identity:'first'|'second'):TufteDocument{
 const document=structuredClone(source);
 document.id='controlled-'+identity;
 let changed=false;
 const update=(node:JsonNode):void=>{
  if(node.type==='text'&&!changed){node.text=text;changed=true;}
  // Labels and toggles must not share the same HTML IDs between editor instances.
  if(node.type==='tufte-sidenote'||node.type==='tufte-marginnote')node.noteId=identity+'-'+node.noteId;
  if('children' in node)for(const child of node.children)update(child);
 };
 update(document.lexicalState.root);
 if(!changed)throw new Error('Fixture has no editable text');
 return document;
}

function ControlledExample(){
 const firstEditorRef=useRef<LexicalEditor|null>(null);
 const [first,setFirst]=useState(()=>withText('첫 번째 편집기','first'));
 const [second,setSecond]=useState(()=>withText('두 번째 편집기','second'));
 const [readonly,setReadonly]=useState(false);
 const [showFirst,setShowFirst]=useState(true);
 const [showSecond,setShowSecond]=useState(true);
 const [firstChanges,setFirstChanges]=useState(0);
 const [secondChanges,setSecondChanges]=useState(0);
 const [firstImageOpen,setFirstImageOpen]=useState(false);
 const [firstNotice,setFirstNotice]=useState('');
 const [secondNotice,setSecondNotice]=useState('');
 const [firstNoticeCount,setFirstNoticeCount]=useState(0);
 const [secondNoticeCount,setSecondNoticeCount]=useState(0);
 const [errors,setErrors]=useState<string[]>([]);
 const report=(error:Error)=>setErrors(previous=>[...previous,error.message]);
 const reportFirstNotice=(message:string)=>{setFirstNotice(message);setFirstNoticeCount(n=>n+1);};
 const reportSecondNotice=(message:string)=>{setSecondNotice(message);setSecondNoticeCount(n=>n+1);};
 return <main>
  <h1>재사용 TufteEditor — 두 인스턴스 검증</h1>
  <div className="actions">
   <button type="button" onClick={()=>setFirst(withText('외부에서 교체한 문서','first'))}>첫 번째 문서 교체</button>
   <button type="button" onClick={()=>setFirst(previous=>({...previous,schemaVersion:2} as unknown as TufteDocument))}>첫 번째 잘못된 문서 주입</button>
   <button type="button" onClick={()=>setFirst(document=>({...document,title:'갱신된 제목'}))}>첫 번째 제목 수정</button>
   <button type="button" onClick={()=>setReadonly(value=>!value)}>첫 번째 읽기 전용 전환</button>
   <button type="button" onClick={()=>setShowFirst(value=>!value)}>첫 번째 편집기 마운트 전환</button>
   <button type="button" onClick={()=>setShowSecond(value=>!value)}>두 번째 편집기 마운트 전환</button>
  </div>
  <section data-testid="first-editor">
   <h2>첫 번째</h2>
   <div className="actions" role="toolbar" aria-label="첫 번째 편집기 노트 구조 명령">
    <button type="button" onMouseDown={event=>event.preventDefault()} onClick={event=>firstEditorRef.current?.dispatchCommand(OPEN_TUFTE_NOTE_IMAGE_EDITOR_COMMAND,event.currentTarget)} aria-haspopup="dialog" aria-expanded={firstImageOpen}>첫 번째 노트 이미지 속성</button>
    <button onMouseDown={event=>event.preventDefault()} onClick={()=>firstEditorRef.current?.dispatchCommand(INSERT_TUFTE_NOTE_COMMAND,'sidenote')}>첫 번째 노트 삽입</button>
    <button onMouseDown={event=>event.preventDefault()} onClick={()=>firstEditorRef.current?.dispatchCommand(INSERT_TUFTE_NOTE_COMMAND,'marginnote')}>첫 번째 여백 주석 삽입</button>
    <button onMouseDown={event=>event.preventDefault()} onClick={()=>firstEditorRef.current?.dispatchCommand(SPLIT_TUFTE_NOTE_COMMAND,undefined)}>첫 번째 노트 나누기</button>
    <button onMouseDown={event=>event.preventDefault()} onClick={()=>firstEditorRef.current?.dispatchCommand(MERGE_TUFTE_NOTE_COMMAND,undefined)}>첫 번째 노트 합치기</button>
    <button onMouseDown={event=>event.preventDefault()} onClick={()=>firstEditorRef.current?.dispatchCommand(MOVE_TUFTE_NOTE_COMMAND,'previous')}>첫 번째 노트 앞으로</button>
    <button onMouseDown={event=>event.preventDefault()} onClick={()=>firstEditorRef.current?.dispatchCommand(MOVE_TUFTE_NOTE_COMMAND,'next')}>첫 번째 노트 뒤로</button>
    <button onMouseDown={event=>event.preventDefault()} onClick={()=>firstEditorRef.current?.dispatchCommand(UNDO_COMMAND,undefined)}>첫 번째 실행 취소</button>
    <button onMouseDown={event=>event.preventDefault()} onClick={()=>firstEditorRef.current?.dispatchCommand(REDO_COMMAND,undefined)}>첫 번째 다시 실행</button>
   </div>
   <p data-testid="first-changes">변경 알림 {firstChanges}회</p>
   <p data-testid="first-notice" role="status">{firstNotice}</p>
   <p data-testid="first-notice-count">노트 명령 알림 {firstNoticeCount}회</p>
   <p data-testid="first-title">문서 제목: {first.title}</p>
   <pre data-testid="first-document-json" hidden>{JSON.stringify(first)}</pre>
   <p data-testid="first-readonly">읽기 전용 {readonly?'예':'아니오'}</p>
   {showFirst&&<TufteEditor value={first} onChange={document=>{setFirst(document);setFirstChanges(n=>n+1);}} onError={report} onNotice={reportFirstNotice}
    readonly={readonly} editorRef={firstEditorRef} onNoteImageEditorOpenChange={setFirstImageOpen} ariaLabel="첫 번째 Tufte 편집기"/>}
  </section>
  <section data-testid="second-editor">
   <h2>두 번째</h2>
   <p data-testid="second-changes">변경 알림 {secondChanges}회</p>
   <p data-testid="second-notice" role="status">{secondNotice}</p>
   <p data-testid="second-notice-count">노트 명령 알림 {secondNoticeCount}회</p>
   <pre data-testid="second-document-json" hidden>{JSON.stringify(second)}</pre>
   {showSecond&&<TufteEditor value={second} onChange={document=>{setSecond(document);setSecondChanges(n=>n+1);}} onNotice={reportSecondNotice}
    onError={report} ariaLabel="두 번째 Tufte 편집기"/>}
  </section>
  <p role="alert" data-testid="errors">{errors.join(' | ')}</p>
 </main>;
}

createRoot(document.getElementById('root')!).render(<ControlledExample/>);
