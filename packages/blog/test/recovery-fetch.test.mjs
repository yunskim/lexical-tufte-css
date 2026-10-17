import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {AuthorizedRecoveryService,SqliteEditorRecoveryStore,handleRecoveryFetch} from '../dist/index.js';
const setup=()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../sql/002_editor_recovery_v1.sql',import.meta.url),'utf8'));
 return {db,service:new AuthorizedRecoveryService(new SqliteEditorRecoveryStore(db),()=>true)};
};
const url='https://example.test/posts/post-1/recoveries';
const draft={postId:'post-1',sessionId:'session-1',sequence:1,baseRevision:0,savedAt:'2026-10-17T09:00:00Z',payload:'{"draft":true}',expectedSequence:0};
const req=(method,path=url,body)=>new Request(path,{method,...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
test('Fetch adapter rejects missing or failed authentication before route work',async()=>{
 const {db,service}=setup();try{
  assert.equal((await handleRecoveryFetch(service,req('GET'),undefined)).status,403);
  assert.equal((await handleRecoveryFetch(service,req('GET'),{authorizeRequest:()=>false})).status,403);
  assert.equal((await handleRecoveryFetch(service,req('GET'),{authorizeRequest:()=>{throw Error('auth');}})).status,403);
 }finally{db.close();}
});
test('Fetch adapter serves authorized recovery with no-store response',async()=>{
 const {db,service}=setup();const security={authorizeRequest:()=>true};try{
  const saved=await handleRecoveryFetch(service,req('PUT',url+'/session-1',draft),security);
  assert.equal(saved.status,200);
  assert.equal(saved.headers.get('cache-control'),'no-store');
  const listed=await handleRecoveryFetch(service,req('GET'),security);
  assert.equal(listed.status,200);
  assert.equal((await listed.json()).value.length,1);
  const loaded=await handleRecoveryFetch(service,req('GET',url+'/session-1'),security);
  assert.equal((await loaded.json()).value.payload,draft.payload);
  const deleted=await handleRecoveryFetch(service,req('DELETE',url+'/session-1',{expectedSequence:1}),security);
  assert.equal(deleted.status,200);
 }finally{db.close();}
});
test('Fetch adapter rejects invalid path, content type and collection writes',async()=>{
 const {db,service}=setup();const security={authorizeRequest:()=>true};try{
  assert.equal((await handleRecoveryFetch(service,req('GET','https://example.test/other'),security)).status,404);
  assert.equal((await handleRecoveryFetch(service,req('PUT',url,draft),security)).status,405);
  assert.equal((await handleRecoveryFetch(service,new Request(url+'/session-1',{method:'PUT',body:'{}'}),security)).status,415);
 }finally{db.close();}
});
