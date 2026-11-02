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
 const [errors,setErrors]=useState<string[]>([]);
 const report=(error:Error)=>setErrors(previous=>[...previous,error.message]);
 return <main>
  <h1>재사용 TufteEditor — 두 인스턴스 검증</h1>
  <div className="actions">
   <button type="button" onClick={()=>setFirst(withText('외부에서 교체한 문서','first'))}>첫 번째 문서 교체</button>
   <button type="button" onClick={()=>setReadonly(value=>!value)}>첫 번째 읽기 전용 전환</button>
   <button type="button" onClick={()=>setShowFirst(value=>!value)}>첫 번째 편집기 마운트 전환</button>
   <button type="button" onClick={()=>setShowSecond(value=>!value)}>두 번째 편집기 마운트 전환</button>
  </div>
  <section data-testid="first-editor">
   <h2>첫 번째</h2>
   <p data-testid="first-changes">변경 알림 {firstChanges}회</p>
   <p data-testid="first-readonly">읽기 전용 {readonly?'예':'아니오'}</p>
   {showFirst&&<TufteEditor value={first} onChange={document=>{setFirst(document);setFirstChanges(n=>n+1);}} onError={report}
    readonly={readonly} ariaLabel="첫 번째 Tufte 편집기"/>}
  </section>
  <section data-testid="second-editor">
   <h2>두 번째</h2>
   <p data-testid="second-changes">변경 알림 {secondChanges}회</p>
   {showSecond&&<TufteEditor value={second} onChange={document=>{setSecond(document);setSecondChanges(n=>n+1);}}
    onError={report} ariaLabel="두 번째 Tufte 편집기"/>}
  </section>
  <p role="alert" data-testid="errors">{errors.join(' | ')}</p>
 </main>;
}

createRoot(document.getElementById('root')!).render(<ControlledExample/>);
