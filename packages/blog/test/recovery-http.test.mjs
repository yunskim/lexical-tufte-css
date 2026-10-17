import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {AuthorizedRecoveryService,SqliteEditorRecoveryStore,handleRecoveryRequest} from '../dist/index.js';

const setup=(authorize=()=>true)=>{
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../sql/002_editor_recovery_v1.sql',import.meta.url),'utf8'));
 return {db,service:new AuthorizedRecoveryService(new SqliteEditorRecoveryStore(db),authorize)};
};
const draft={postId:'post-1',sessionId:'session-1',sequence:1,baseRevision:0,savedAt:'2026-10-17T09:00:00Z',payload:'{"draft":true}'};
const call=(service,method,sessionId,body,postId='post-1')=>handleRecoveryRequest(service,{method,postId,sessionId,body});

test('HTTP dispatcher handles list, read, CAS save and delete',async()=>{
 const {db,service}=setup();try{
  assert.equal((await call(service,'PUT','session-1',{...draft,expectedSequence:0})).status,200);
  const listed=await call(service,'GET');
  assert.equal(listed.status,200);
  assert.equal(listed.body.value.length,1);
  assert.equal('payload' in listed.body.value[0],false);
  assert.equal((await call(service,'GET','session-1')).body.value.payload,draft.payload);
  assert.equal((await call(service,'PUT','session-1',{...draft,sequence:2,expectedSequence:0})).status,400);
  assert.equal((await call(service,'DELETE','session-1',{expectedSequence:2})).status,409);
  assert.equal((await call(service,'DELETE','session-1',{expectedSequence:1})).status,200);
  assert.equal((await call(service,'GET')).body.value.length,0);
 }finally{db.close();}
});

test('HTTP dispatcher rejects mismatched identities, malformed body and unsupported method',async()=>{
 const {db,service}=setup();try{
  assert.equal((await call(service,'PUT','session-1',{...draft,postId:'post-2',expectedSequence:0})).status,400);
  assert.equal((await call(service,'PUT','session-2',{...draft,expectedSequence:0})).status,400);
  assert.equal((await call(service,'PUT','session-1',{...draft,checksum:'0'.repeat(64),expectedSequence:0})).status,400);
  assert.equal((await call(service,'DELETE','session-1',{})).status,400);
  assert.equal((await call(service,'PATCH','session-1',{})).status,405);
  assert.equal((await call(service,'GET')).body.value.length,0);
 }finally{db.close();}
});

test('HTTP dispatcher denies unauthorized requests before data access',async()=>{
 const {db,service}=setup(()=>false);try{
  assert.equal((await call(service,'GET')).status,403);
  assert.equal((await call(service,'PUT','session-1',{...draft,expectedSequence:0})).status,403);
  assert.equal((await call(service,'DELETE','session-1',{expectedSequence:1})).status,403);
 }finally{db.close();}
});

test('host request guard denies mutations before SQLite access and fails closed',async()=>{
 const {db,service}=setup();try{
  const request={method:'PUT',postId:'post-1',sessionId:'session-1',body:{...draft,expectedSequence:0}};
  const denied=await handleRecoveryRequest(service,request,()=>false);
  assert.equal(denied.status,403);
  assert.equal(denied.body.diagnostics[0].code,'RECOVERY_REQUEST_DENIED');
  assert.equal((await call(service,'GET')).body.value.length,0);
  const errored=await handleRecoveryRequest(service,request,()=>{throw Error('CSRF unavailable');});
  assert.equal(errored.status,403);
  assert.equal((await call(service,'GET')).body.value.length,0);
  assert.equal((await handleRecoveryRequest(service,request,()=>true)).status,200);
 }finally{db.close();}
});
