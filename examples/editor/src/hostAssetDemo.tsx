import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {AssetProvider,AssetLocator,ResolvedAsset} from '@lexical-tufte/editor-ports';
import type {JsonNode,TufteDocument} from '@lexical-tufte/document';
import {TufteEditor} from '@lexical-tufte/editor-react';
import fixture from '../../../fixtures/tufte/server-document.json';
import '@lexical-tufte/editor-react/styles.css';
import './style.css';

type Mode='normal'|'invalid'|'expired'|'mismatch'|'deferred'|'throw';
type Deferred={locator:AssetLocator;respond:(result:ResolvedAsset|null)=>void};
const harness={
 mode:'normal' as Mode,
 calls:{search:[] as Array<{namespace:string;text:string}>,revisions:[] as string[],resolve:[] as Array<{namespace:string;locator:AssetLocator}>},
 deferred:[] as Deferred[]
};
(window as Window&{__hostAssetHarness:typeof harness}).__hostAssetHarness=harness;

function provider(namespace:string):AssetProvider{
 return {
  async search(query,signal){
   harness.calls.search.push({namespace,text:query.text});
   if(signal?.aborted)throw Error('cancelled');
   return {items:query.text==='absent'?[]:[
    {id:'atlas',title:'Atlas image',mediaType:'image/svg+xml',currentRevision:'rev-2'},
    {id:'photo',title:'Photo image',mediaType:'image/png',currentRevision:'rev-2'},
    {id:'non-image',title:'Ignore PDF',mediaType:'application/pdf'}
   ],nextCursor:null};
  },
  async revisions(assetId,_query,signal){
   harness.calls.revisions.push(namespace+':'+assetId);
   if(signal?.aborted)throw Error('cancelled');
   return {items:[{id:'rev-1',assetId},{id:'rev-2',assetId}],nextCursor:null};
  },
  async resolve(locator,_signal){
   harness.calls.resolve.push({namespace,locator});
   if(harness.mode==='deferred')return new Promise<ResolvedAsset|null>(resolve=>{
    harness.deferred.push({locator,respond:resolve});
   });
   if(harness.mode==='throw')throw Error('provider failed');
   return {
    assetId:locator.assetId,
    revisionId:harness.mode==='mismatch'?'wrong-revision':locator.revisionId??'rev-2',
    mediaType:'image/svg+xml',
    url:harness.mode==='invalid'?'javascript:alert(1)':'/fixture.svg',
    expiresAt:new Date(Date.now()+(harness.mode==='expired'?-1000:3600_000)).toISOString()
   };
  }
 };
}
const firstAdapter=provider('alpha');
const secondAdapter=provider('beta');

function documentFor(namespace:string):TufteDocument{
 const doc=structuredClone(fixture) as unknown as TufteDocument;
 doc.id='host-demo-'+namespace;
 const walk=(node:JsonNode):void=>{
  if(node.type==='tufte-sidenote'||node.type==='tufte-marginnote')node.noteId=namespace+'-'+node.noteId;
  if('children' in node)node.children.forEach(walk);
 };
 walk(doc.lexicalState.root);
 return doc;
}
function Demo(){
 const [first,setFirst]=useState(()=>documentFor('alpha'));
 const [second,setSecond]=useState(()=>documentFor('beta'));
 const [errors,setErrors]=useState<string[]>([]);
 return <main>
  <h1>호스트 중립 이미지 자산 연결 예제</h1>
  <section data-testid="host-first">
   <h2>Alpha 편집기</h2>
   <TufteEditor value={first} onChange={setFirst} onError={error=>setErrors(values=>[...values,error.message])}
    assetAdapter={firstAdapter} assetNamespace="alpha" ariaLabel="Alpha 편집기"/>
   <pre data-testid="host-first-json" hidden>{JSON.stringify(first)}</pre>
  </section>
  <section data-testid="host-second">
   <h2>Beta 편집기</h2>
   <TufteEditor value={second} onChange={setSecond} onError={error=>setErrors(values=>[...values,error.message])}
    assetAdapter={secondAdapter} assetNamespace="beta" ariaLabel="Beta 편집기"/>
   <pre data-testid="host-second-json" hidden>{JSON.stringify(second)}</pre>
  </section>
  <p role="alert" data-testid="host-errors">{errors.join(' | ')}</p>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
