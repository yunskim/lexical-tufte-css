import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {SqlitePostRevisionStoreV2,readSqlitePostSnapshotV2} from '../dist/index.js';
import {writeSqlitePostBackupFile} from '../scripts/sqlite-backup.mjs';
import {restoreSqlitePostBackupFile} from '../scripts/sqlite-restore.mjs';

test('file-to-SQLite restore advances revision and rejects stale or invalid backup',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tufte-restore-'));
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(readFileSync(new URL('../sql/001_posts_v2.sql',import.meta.url),'utf8'));
  const adapter={prepare(sql){return {bind(...args){return {
   async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};},
   async first(){return db.prepare(sql).get(...args)??null;}
  };}};}};
  const store=new SqlitePostRevisionStoreV2(adapter);
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'restore-test',summary:'backup',tags:[],authors:['editor'],status:'draft',
   createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  const id=document.id,path=join(dir,'backup.json');
  assert.equal((await store.insert({document,metadata})).ok,true);
  assert.equal((await writeSqlitePostBackupFile(path,adapter,id,1)).ok,true);
  assert.equal((await store.compareAndSwap({document,metadata:{...metadata,revision:2,summary:'newer'}},1)).ok,true);
  const restored=await restoreSqlitePostBackupFile(path,adapter,id,2);
  assert.equal(restored.ok,true,JSON.stringify(restored.diagnostics));
  const latest=await readSqlitePostSnapshotV2(adapter,id);
  assert.equal(latest.ok,true);
  assert.equal(latest.value.metadata.revision,3);
  assert.equal(latest.value.metadata.summary,'backup');
  const stale=await restoreSqlitePostBackupFile(path,adapter,id,2);
  assert.equal(stale.ok,false);
  assert.equal((await readSqlitePostSnapshotV2(adapter,id)).value.metadata.revision,3);
  await writeFile(path,'{broken','utf8');
  const invalid=await restoreSqlitePostBackupFile(path,adapter,id,3);
  assert.equal(invalid.ok,false);
  assert.equal((await readSqlitePostSnapshotV2(adapter,id)).value.metadata.revision,3);
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});

test('restore conflict injected between read and CAS preserves competing update',async()=>{
 const db=new DatabaseSync(':memory:');
 const dir=await mkdtemp(join(tmpdir(),'tufte-conflict-'));
 try{
  db.exec(readFileSync(new URL('../sql/001_posts_v2.sql',import.meta.url),'utf8'));
  const adapter={prepare(sql){return {bind(...args){return {
   async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};},
   async first(){return db.prepare(sql).get(...args)??null;}
  };}};}};
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'race-restore',summary:'original',tags:[],authors:['editor'],status:'draft',
   createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  const store=new SqlitePostRevisionStoreV2(adapter);
  assert.equal((await store.insert({document,metadata})).ok,true);
  const path=join(dir,'backup.json');
  assert.equal((await writeSqlitePostBackupFile(path,adapter,document.id,1)).ok,true);
  assert.equal((await store.compareAndSwap({document,metadata:{...metadata,revision:2,summary:'edited'}},1)).ok,true);
  let injected=false;
  const racing={prepare(sql){return {bind(...args){return {
   async first(){return db.prepare(sql).get(...args)??null;},
   async run(){
    if(!injected&&sql.startsWith('UPDATE posts_v2')){
     injected=true;
     assert.equal((await store.compareAndSwap({document,metadata:{...metadata,revision:3,summary:'winner'}},2)).ok,true);
    }
    return {meta:{changes:db.prepare(sql).run(...args).changes}};
   }
  };}};}};
  const result=await restoreSqlitePostBackupFile(path,racing,document.id,2);
  assert.equal(injected,true);
  assert.equal(result.ok,false);
  assert.ok(result.diagnostics.some(d=>d.code==='REVISION_CONFLICT'));
  const latest=await readSqlitePostSnapshotV2(adapter,document.id);
  assert.equal(latest.value.metadata.revision,3);
  assert.equal(latest.value.metadata.summary,'winner');
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});

test('injected SQLite write failure does not modify stored revision',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(readFileSync(new URL('../sql/001_posts_v2.sql',import.meta.url),'utf8'));
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'failure-restore',summary:'safe',tags:[],authors:['editor'],status:'draft',
   createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  const base={prepare(sql){return {bind(...args){return {
   async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};},
   async first(){return db.prepare(sql).get(...args)??null;}
  };}};}};
  assert.equal((await new SqlitePostRevisionStoreV2(base).insert({document,metadata})).ok,true);
  const failing={prepare(sql){return {bind(...args){return {
   async run(){
    if(sql.startsWith('UPDATE posts_v2'))throw new Error('injected write failure');
    return {meta:{changes:db.prepare(sql).run(...args).changes}};
   }
  };}};}};
  await assert.rejects(
   new SqlitePostRevisionStoreV2(failing).compareAndSwap(
    {document,metadata:{...metadata,revision:2,summary:'should-not-persist'}},1
   ),/injected write failure/,
  );
  const current=await readSqlitePostSnapshotV2(base,document.id);
  assert.equal(current.ok,true);
  assert.equal(current.value.metadata.revision,1);
  assert.equal(current.value.metadata.summary,'safe');
 }finally{db.close();}
});
