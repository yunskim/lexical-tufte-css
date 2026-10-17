import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RecoveryHttpClient} from '../dist/recoveryClient.js';

const slot={postId:'post-1',sessionId:'session-1',sequence:1,baseRevision:0,savedAt:'2026-10-17T09:00:00Z',payload:'{"draft":true}'};
const ok=value=>new Response(JSON.stringify({ok:true,value,diagnostics:[]}),{status:200,headers:{'content-type':'application/json'}});
test('browser recovery client encodes routes, credentials, cache and CSRF header',async()=>{
 const calls=[];
 const client=new RecoveryHttpClient({baseUrl:'/api/',headers:()=>({'x-csrf-token':'token'}),fetcher:async(url,init)=>{
  calls.push({url,init});
  return ok(init.method==='GET'?[]:({...slot,checksum:'a'.repeat(64)}));
 }});
 assert.equal((await client.list('post-1')).ok,true);
 assert.equal((await client.save(slot,0)).ok,true);
 assert.equal((await client.remove('post-1','session-1',1)).ok,true);
 assert.deepEqual(calls.map(x=>x.url),[
  '/api/posts/post-1/recoveries','/api/posts/post-1/recoveries/session-1','/api/posts/post-1/recoveries/session-1'
 ]);
 assert.deepEqual(calls.map(x=>x.init.method),['GET','PUT','DELETE']);
 assert.equal(calls.every(x=>x.init.credentials==='same-origin'&&x.init.cache==='no-store'),true);
 assert.equal(calls[1].init.headers.get('x-csrf-token'),'token');
 assert.equal(JSON.parse(calls[1].init.body).expectedSequence,0);
});
test('browser recovery client returns diagnostics for invalid input, malformed response and network failure',async()=>{
 let count=0;
 const client=new RecoveryHttpClient({baseUrl:'',fetcher:async()=>{count++;return new Response('not-json');}});
 assert.equal((await client.list('bad id')).diagnostics[0].code,'INVALID_RECOVERY_INPUT');
 assert.equal(count,0);
 assert.equal((await client.list('post-1')).diagnostics[0].code,'RECOVERY_PROTOCOL_ERROR');
 const malformed=new RecoveryHttpClient({baseUrl:'',fetcher:async()=>new Response('{"ok":true,"diagnostics":[]}')});
 assert.equal((await malformed.list('post-1')).diagnostics[0].code,'RECOVERY_PROTOCOL_ERROR');
 const unavailable=new RecoveryHttpClient({baseUrl:'',fetcher:async()=>{throw Error('offline');}});
 assert.equal((await unavailable.read('post-1','session-1')).diagnostics[0].code,'RECOVERY_NETWORK_ERROR');
});
