import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RecoveryHttpClient} from '../dist/recoveryClient.js';

const fixture=JSON.parse(readFileSync(new URL('../../../apps/recovery-server/tests/fixtures/recovery_v1.json',import.meta.url),'utf8'));
const success=value=>new Response(JSON.stringify({ok:true,value,diagnostics:[]}),{status:200,headers:{'content-type':'application/json'}});
test('TypeScript client follows shared recovery HTTP v1 fixture',async()=>{
 const seen=[];
 const client=new RecoveryHttpClient({baseUrl:'/api',fetcher:async(url,init)=>{
  seen.push({url,method:init.method,body:init.body?JSON.parse(init.body):null});
  return success(init.method==='DELETE'?true:{...fixture.save,checksum:'a'.repeat(64)});
 }});
 const {expectedSequence,...save}=fixture.save;
 assert.equal((await client.save(save,expectedSequence)).ok,true);
 assert.equal((await client.remove(fixture.postId,fixture.sessionId,fixture.delete.expectedSequence)).ok,true);
 assert.equal(seen[0].url,'/api/posts/'+fixture.postId+'/recoveries/'+fixture.sessionId);
 assert.deepEqual(seen[0].body,fixture.save);
 assert.deepEqual(seen[1].body,fixture.delete);
});
test('TypeScript client preserves shared conflict diagnostics',async()=>{
 const expected=fixture.errors.conflict;
 const client=new RecoveryHttpClient({baseUrl:'/api',fetcher:async()=>new Response(JSON.stringify({
  ok:false,diagnostics:[{code:expected.code,path:'$.recovery',message:expected.code}]
 }),{status:expected.status})});
 const result=await client.remove(fixture.postId,fixture.sessionId,fixture.delete.expectedSequence);
 assert.equal(result.ok,false);
 assert.equal(result.diagnostics[0].code,expected.code);
});
