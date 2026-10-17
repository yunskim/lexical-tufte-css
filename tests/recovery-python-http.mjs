import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout} from 'node:timers/promises';
import {once} from 'node:events';
import {RecoveryHttpClient} from '../packages/blog/dist/recoveryClient.js';
// Local-only test process and temporary DB; these test credentials are not an operating host.
const folder=await mkdtemp(join(tmpdir(),'tufte-python-http-'));
const fixture=JSON.parse(await readFile(new URL('../apps/recovery-server/tests/fixtures/recovery_v1.json',import.meta.url),'utf8'));
const program=`import sqlite3,sys,uvicorn,socket
from app import create_app
from pathlib import Path
db=sys.argv[1]
with sqlite3.connect(db) as connection:
 connection.executescript(Path('packages/blog/sql/002_editor_recovery_v1.sql').read_text())
def authorize(request,post_id):
 return post_id=='${fixture.postId}' and request.headers.get('x-test-access')=='local-test' and (request.method=='GET' or request.headers.get('x-test-csrf')=='local-csrf')
sock=socket.socket()
sock.bind(('127.0.0.1',0))
print(sock.getsockname()[1],flush=True)
uvicorn.Server(uvicorn.Config(create_app(db,authorize),log_level='error')).run(sockets=[sock])
`;
const child=spawn(process.env.RECOVERY_PYTHON??'python',['-c',program,join(folder,'recovery.sqlite')],{stdio:['ignore','pipe','pipe']});
let output='',stderr='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>stderr+=data);
try{
 let base;
 for(let i=0;i<200;i++){
  if(child.exitCode!==null)throw Error(stderr);
  const port=output.trim().split('\n')[0];
  if(/^\d+$/.test(port)){
   base='http://127.0.0.1:'+port;
   try{if((await fetch(base+'/posts/'+fixture.postId+'/recoveries')).status===403)break;}catch{}
  }
  if(i===199)throw Error('Python server not ready: '+stderr);
  await setTimeout(50);
 }
 const headers=()=>({'x-test-access':'local-test','x-test-csrf':'local-csrf'});
 const client=new RecoveryHttpClient({baseUrl:base,headers});
 const {expectedSequence,...slot}=fixture.save;
 const saved=await client.save(slot,expectedSequence);assert.equal(saved.ok,true,JSON.stringify(saved));
 assert.match(saved.value.checksum,/^[a-f0-9]{64}$/);
 const read=await client.read(fixture.postId,fixture.sessionId);assert.deepEqual(read.value,saved.value);
 const list=await client.list(fixture.postId);assert.equal(list.value.length,1);assert.equal('payload' in list.value[0],false);
 const stale=await client.save(slot,expectedSequence);assert.equal(stale.ok,false);assert.equal(stale.diagnostics[0].code,fixture.errors.conflict.code);
 const denied=await new RecoveryHttpClient({baseUrl:base}).read(fixture.postId,fixture.sessionId);assert.equal(denied.ok,false);assert.equal(denied.diagnostics[0].code,'RECOVERY_ACCESS_DENIED');
 const csrf=await new RecoveryHttpClient({baseUrl:base,headers:()=>({'x-test-access':'local-test'})}).remove(fixture.postId,fixture.sessionId,1);assert.equal(csrf.ok,false);assert.equal(csrf.diagnostics[0].code,'RECOVERY_ACCESS_DENIED');
 assert.equal((await client.remove(fixture.postId,fixture.sessionId,fixture.delete.expectedSequence)).value,true);
 assert.equal((await client.read(fixture.postId,fixture.sessionId)).value,null);
 console.log('Actual TypeScript client -> Python HTTP -> SQLite: save/read/list/checksum/CAS/denied access/CSRF/delete PASS.');
}finally{
 if(child.exitCode===null){const ended=once(child,'exit');child.kill();await ended;}
 await rm(folder,{recursive:true,force:true});
}
