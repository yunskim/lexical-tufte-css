import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {JsonNode,TufteDocument} from '@lexical-tufte/document';
import {TufteEditor} from '@lexical-tufte/editor-react';
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
 const [first,setFirst]=useState(()=>withText('첫 번째 편집기','first'));
 const [second,setSecond]=useState(()=>withText('두 번째 편집기','second'));
 const [readonly,setReadonly]=useState(false);
 const [showFirst,setShowFirst]=useState(true);
 const [showSecond,setShowSecond]=useState(true);
 const [firstChanges,setFirstChanges]=useState(0);
 const [secondChanges,setSecondChanges]=useState(0);
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
   <p data-testid="first-changes">변경 알림 {firstChanges}회</p>
   <p data-testid="first-notice" role="status">{firstNotice}</p>
   <p data-testid="first-notice-count">노트 명령 알림 {firstNoticeCount}회</p>
   <p data-testid="first-title">문서 제목: {first.title}</p>
   <pre data-testid="first-document-json" hidden>{JSON.stringify(first)}</pre>
   <p data-testid="first-readonly">읽기 전용 {readonly?'예':'아니오'}</p>
   {showFirst&&<TufteEditor value={first} onChange={document=>{setFirst(document);setFirstChanges(n=>n+1);}} onError={report} onNotice={reportFirstNotice}
    readonly={readonly} ariaLabel="첫 번째 Tufte 편집기"/>}
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
