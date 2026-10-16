import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {SqlitePostRevisionStoreV2} from '../dist/index.js';

const schema=readFileSync(new URL('../sql/001_posts_v2.sql',import.meta.url),'utf8');
const document=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
const metadata=(revision=1,summary='original')=>({
 slug:'sqlite-real',summary,tags:[],authors:['editor'],status:'draft',
 createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision,
});
const adapter=db=>({
 prepare(sql){return {
  bind(...values){return {
   async run(){const result=db.prepare(sql).run(...values);return {meta:{changes:result.changes}};}
  };},
 };}
});

test('real SQLite schema, initial insert, competing CAS and JSON constraints',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(schema);
  const store=new SqlitePostRevisionStoreV2(adapter(db));
  const doc=document();
  const initial={document:doc,metadata:metadata()};
  const inserted=await store.insert(initial);
  assert.equal(inserted.ok,true,JSON.stringify(inserted.diagnostics));
  const duplicate=await store.insert(initial);
  assert.equal(duplicate.ok,false);
  assert.ok(duplicate.diagnostics.some(d=>d.code==='POST_ALREADY_EXISTS'));
  const [a,b]=await Promise.all([
   store.compareAndSwap({document:doc,metadata:metadata(2,'writer-a')},1),
   store.compareAndSwap({document:doc,metadata:metadata(2,'writer-b')},1),
  ]);
  assert.equal(a.ok,true,JSON.stringify(a.diagnostics));
  assert.equal(b.ok,false);
  assert.ok(b.diagnostics.some(d=>d.code==='REVISION_CONFLICT'));
  const row=db.prepare('SELECT revision,payload FROM posts_v2 WHERE id=?').get(doc.id);
  assert.equal(row.revision,2);
  assert.equal(JSON.parse(row.payload).metadata.summary,'writer-a');
  assert.throws(()=>db.prepare('UPDATE posts_v2 SET revision=3 WHERE id=?').run(doc.id));
  assert.equal(db.prepare('SELECT revision FROM posts_v2 WHERE id=?').get(doc.id).revision,2);
 }finally{db.close();}
});
