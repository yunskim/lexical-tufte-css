import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {AuthorizedRecoveryService,SqliteEditorRecoveryStore} from '../dist/index.js';

const setup=(authorize)=>{
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../sql/002_editor_recovery_v1.sql',import.meta.url),'utf8'));
 const store=new SqliteEditorRecoveryStore(db);
 return {db,store,service:new AuthorizedRecoveryService(store,authorize)};
};
const draft={postId:'post-1',sessionId:'session-1',sequence:1,baseRevision:0,savedAt:'2026-10-17T09:00:00Z',payload:'{"incomplete":true}'};

test('authorized recovery service checks every operation before accessing SQLite',async()=>{
 const calls=[];
 const {db,service}=setup(request=>{calls.push(request);return true;});
 try{
  assert.equal((await service.save(draft,0)).ok,true);
  assert.equal((await service.list('post-1')).value.length,1);
  assert.equal((await service.read('post-1','session-1')).value.payload,draft.payload);
  assert.equal((await service.remove('post-1','session-1',1)).ok,true);
  assert.deepEqual(calls.map(x=>x.operation),['save','list','read','remove']);
 }finally{db.close();}
});

test('denied recovery operations cannot read or mutate a session',async()=>{
 const {db,store,service}=setup(()=>false);
 try{
  assert.equal((await store.save(draft,0)).ok,true);
  for(const result of [
   await service.list('post-1'),
   await service.read('post-1','session-1'),
   await service.save({...draft,sequence:2},1),
   await service.remove('post-1','session-1',1)
  ]){assert.equal(result.ok,false);assert.equal(result.diagnostics[0].code,'RECOVERY_ACCESS_DENIED');}
  assert.equal((await store.read('post-1','session-1')).value.sequence,1);
 }finally{db.close();}
});

test('authorization exception fails closed and invalid identity skips callback',async()=>{
 let calls=0;
 const {db,service}=setup(()=>{calls++;throw Error('unavailable');});
 try{
  assert.equal((await service.list('bad id')).diagnostics[0].code,'INVALID_RECOVERY_INPUT');
  assert.equal(calls,0);
  assert.equal((await service.list('post-1')).diagnostics[0].code,'RECOVERY_ACCESS_DENIED');
  assert.equal(calls,1);
 }finally{db.close();}
});

test('host authorization can restrict a caller to a single post and session',async()=>{
 const {db,store,service}=setup(({postId,sessionId})=>postId==='post-1'&&(sessionId===undefined||sessionId==='session-1'));
 try{
  assert.equal((await store.save(draft,0)).ok,true);
  assert.equal((await store.save({...draft,sessionId:'session-2'},0)).ok,true);
  assert.equal((await service.read('post-1','session-1')).ok,true);
  assert.equal((await service.read('post-1','session-2')).diagnostics[0].code,'RECOVERY_ACCESS_DENIED');
  assert.equal((await service.list('post-2')).diagnostics[0].code,'RECOVERY_ACCESS_DENIED');
 }finally{db.close();}
});
