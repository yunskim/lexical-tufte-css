import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {SqlitePostRevisionStoreV2} from '../dist/index.js';
import {writeSqlitePostBackupFile} from '../scripts/sqlite-backup.mjs';
import {readPostBackupFile} from '../scripts/backup-file.mjs';

test('SQLite snapshot backup preserves previous file on conflict and missing post',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tufte-sqlite-backup-'));
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(readFileSync(new URL('../sql/001_posts_v2.sql',import.meta.url),'utf8'));
  const adapter={prepare(sql){return {bind(...args){return {
   async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};},
   async first(){return db.prepare(sql).get(...args)??null;}
  };}};}};
  const store=new SqlitePostRevisionStoreV2(adapter);
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'sqlite-backup',summary:'first',tags:[],authors:['editor'],status:'draft',
   createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  assert.equal((await store.insert({document,metadata})).ok,true);
  const path=join(dir,'post.json');
  assert.equal((await writeSqlitePostBackupFile(path,adapter,document.id,1)).ok,true);
  assert.equal((await store.compareAndSwap({document,metadata:{...metadata,revision:2,summary:'second'}},1)).ok,true);
  const conflict=await writeSqlitePostBackupFile(path,adapter,document.id,1);
  assert.equal(conflict.ok,false);
  assert.ok(conflict.diagnostics.some(d=>d.code==='BACKUP_REVISION_CONFLICT'));
  const missing=await writeSqlitePostBackupFile(path,adapter,'absent',1);
  assert.equal(missing.ok,false);
  assert.ok(missing.diagnostics.some(d=>d.code==='POST_NOT_FOUND'));
  const backup=await readPostBackupFile(path);
  assert.equal(backup.ok,true);
  assert.equal(backup.value.record.metadata.revision,1);
  assert.equal(backup.value.record.metadata.summary,'first');
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});
