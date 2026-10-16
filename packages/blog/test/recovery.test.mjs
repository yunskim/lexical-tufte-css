import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {SqliteEditorRecoveryStore} from '../dist/index.js';

const setup=()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../sql/002_editor_recovery_v1.sql',import.meta.url),'utf8'));
 return {db,store:new SqliteEditorRecoveryStore(db)};
};
const input=(sequence=1,payload='{"root":{"children":[{"type":"incomplete"}]}}')=>({
 postId:'post-1',sessionId:'session-1',sequence,baseRevision:1,savedAt:'2026-10-16T09:00:00Z',payload
});
test('raw structurally invalid Lexical JSON survives recovery save and read',async()=>{
 const {db,store}=setup();try{
  const saved=await store.save(input(),0);assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
  const loaded=await store.read('post-1','session-1');assert.equal(loaded.ok,true);assert.equal(loaded.value.payload,input().payload);
 }finally{db.close();}
});
test('recovery compare-and-swap rejects stale sequence without changing saved state',async()=>{
 const {db,store}=setup();try{
  assert.equal((await store.save(input(),0)).ok,true);
  const conflict=await store.save(input(2,'{"other":true}'),0);
  assert.equal(conflict.ok,false);assert.equal(conflict.diagnostics[0].code,'INVALID_RECOVERY_INPUT');
  const stale=await store.save(input(1,'{"other":true}'),0);
  assert.equal(stale.ok,false);assert.equal(stale.diagnostics[0].code,'RECOVERY_CONFLICT');
  assert.equal((await store.read('post-1','session-1')).value.payload,input().payload);
 }finally{db.close();}
});
test('recovery checksum detects tampering',async()=>{
 const {db,store}=setup();try{
  assert.equal((await store.save(input(),0)).ok,true);
  db.prepare('UPDATE editor_recovery_v1 SET payload=? WHERE post_id=?').run('{"tampered":true}','post-1');
  const loaded=await store.read('post-1','session-1');
  assert.equal(loaded.ok,false);assert.equal(loaded.diagnostics[0].code,'RECOVERY_INTEGRITY_ERROR');
 }finally{db.close();}
});
test('recovery rejects malformed JSON and oversized payload',async()=>{
 const {db,store}=setup();try{
  assert.equal((await store.save(input(1,'{'),0)).diagnostics[0].code,'INVALID_RECOVERY_JSON');
  assert.equal((await store.save(input(1,JSON.stringify({text:'a'.repeat(2_000_001)})),0)).diagnostics[0].code,'INVALID_RECOVERY_INPUT');
 }finally{db.close();}
});
