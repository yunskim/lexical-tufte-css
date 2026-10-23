import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {SqlitePostRevisionStoreV2} from '@lexical-tufte/document';
import {SqlitePublicationStore} from '../dist/index.js';

/** Real SQLite characterization tests. These deliberately assert CURRENT API behavior,
 * not the future no-op/restore/ordinal contract. Run after package build. */
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
const initial=()=>({document:fixture(),metadata:{slug:'publication',summary:'original',tags:[],authors:['editor'],status:'draft',createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1}});
const adapter=db=>({prepare(sql){return {bind(...values){return {async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}};}};}};}});
const ok=r=>{assert.equal(r.ok,true,JSON.stringify(r.diagnostics));return r.value;};
const opts=(revision,generation,time)=>({expectedRevision:revision,expectedGeneration:generation,publishedAt:time,assetExists:async()=>true});
async function setup(){
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(readFileSync(new URL('../../document/sql/001_posts_v2.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../sql/001_publications_v1.sql',import.meta.url),'utf8'));
  const post=initial(),drafts=new SqlitePostRevisionStoreV2(adapter(db));
  ok(await drafts.insert(post));
  return {db,post,drafts,store:new SqlitePublicationStore(db),id:post.document.id};
 }catch(error){db.close();throw error;}
}
test('publish contract: draft saves never mutate the currently public immutable snapshot',async()=>{
 const {db,post,drafts,store,id}=await setup();
 try{
  const p1=ok(await store.publish(id,opts(1,0,'2026-10-16T01:00:00Z')));
  let current=post;
  for(let revision=2;revision<=4;revision++){
   const next=structuredClone(current);next.metadata.revision=revision;
   next.metadata.updatedAt=`2026-10-16T0${revision}:00:00Z`;
   next.document.title=`draft ${revision}`;
   ok(await drafts.compareAndSwap(next,revision-1));current=next;
   assert.equal(ok(await store.readPublic(id)).snapshotId,p1.snapshotId);
  }
  assert.equal(ok(store.readState(id)).generation,1);
  assert.equal(ok(await store.readSnapshot(p1.snapshotId)).snapshot.html,p1.snapshot.html);
 }finally{db.close();}
});
test('publish contract: generation is not a public revision ordinal; unpublish retains history',async()=>{
 const {db,store,id}=await setup();
 try{
  const p1=ok(await store.publish(id,opts(1,0,'2026-10-16T01:00:00Z')));
  assert.equal(p1.snapshot.publishedRevision,1);
  assert.equal(ok(store.unpublish(id,1)).generation,2);
  assert.equal(ok(store.readState(id)).snapshotId,null);
  assert.equal(ok(await store.readSnapshot(p1.snapshotId)).snapshotId,p1.snapshotId);
  const p2=ok(await store.publish(id,opts(1,2,'2026-10-16T02:00:00Z')));
  assert.equal(p2.snapshot.publishedRevision,1); // source draft version, not public ordinal
  assert.equal(p2.snapshot.generation,3); // includes unpublish
  assert.notEqual(p2.snapshotId,p1.snapshotId);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,2);
 }finally{db.close();}
});
test('publish contract: unchanged Publish currently creates another snapshot (migration gap)',async()=>{
 const {db,store,id}=await setup();
 try{
  const p1=ok(await store.publish(id,opts(1,0,'2026-10-16T01:00:00Z')));
  const p2=ok(await store.publish(id,opts(1,1,'2026-10-16T02:00:00Z')));
  assert.notEqual(p1.snapshotId,p2.snapshotId);
  assert.equal(p2.snapshot.publishedRevision,p1.snapshot.publishedRevision);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,2);
 }finally{db.close();}
});
test('publish contract: public visibility derives from publication head, not draft metadata.status',async()=>{
 const {db,store,id}=await setup();
 try{
  const p1=ok(await store.publish(id,opts(1,0,'2026-10-16T01:00:00Z')));
  assert.equal(p1.snapshot.post.metadata.status,'draft');
  assert.equal(ok(await store.readPublic(id)).snapshotId,p1.snapshotId);
  ok(store.unpublish(id,1));
  const missing=await store.readPublic(id);
  assert.equal(missing.ok,false);
  assert.ok(missing.diagnostics.some(x=>x.code==='NOT_PUBLISHED'));
 }finally{db.close();}
});
