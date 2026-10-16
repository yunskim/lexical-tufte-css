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
