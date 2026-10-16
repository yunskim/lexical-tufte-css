import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqlitePostRevisionStoreV2,InMemoryPostRevisionStoreV2} from '@lexical-tufte/document';
import {SqlitePublicationStore} from '../dist/index.js';
const document=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
const initial=()=>({document:document(),metadata:{slug:'publication',summary:'original',tags:[],authors:['editor'],status:'draft',createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1}});
const adapter=db=>({prepare(sql){return {bind(...values){return {async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}};}};}};}});
const options=(expectedRevision=1,expectedGeneration=0,publishedAt='2026-10-16T01:00:00Z')=>({expectedRevision,expectedGeneration,publishedAt,assetExists:async()=>true});
const ok=result=>{assert.equal(result.ok,true,JSON.stringify(result.diagnostics));return result.value;};
const error=(result,code)=>{assert.equal(result.ok,false);assert.ok(result.diagnostics.some(d=>d.code===code),JSON.stringify(result.diagnostics));};
async function setup(path=':memory:'){
 const db=new DatabaseSync(path);db.exec(readFileSync(new URL('../../document/sql/001_posts_v2.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../sql/001_publications_v1.sql',import.meta.url),'utf8'));
 const drafts=new SqlitePostRevisionStoreV2(adapter(db)),post=initial();ok(await drafts.insert(post));
 return {db,drafts,post,store:new SqlitePublicationStore(db),id:post.document.id};
}
test('R11 actual SQLite draft/publish/edit/update/unpublish/republish lifecycle',async()=>{
 const {db,drafts,post,store,id}=await setup();try{
  error(await store.readPublic(id),'NOT_PUBLISHED');assert.equal(ok(store.readState(id)).generation,0);
  const sources=[];const first=ok(await store.publish(id,{...options(),assetExists:async src=>{sources.push(src);return true;}}));
  assert.ok(sources.includes('/fixture.svg'));assert.equal(first.snapshot.firstPublishedAt,options().publishedAt);assert.equal(first.snapshot.publishedRevision,1);assert.equal(first.snapshot.post.metadata.status,'draft');
  const originalHTML=first.snapshot.html;
  first.snapshot.html='caller mutation';first.snapshot.post.document.title='caller mutation';
  const immutable=ok(await store.readPublic(id));assert.equal(immutable.snapshot.html,originalHTML);assert.notEqual(immutable.snapshot.post.document.title,'caller mutation');
  const next=structuredClone(post);next.metadata.revision=2;next.metadata.updatedAt='2026-10-16T01:30:00Z';next.document.title='edited draft';ok(await drafts.compareAndSwap(next,1));
  assert.equal(ok(await store.readPublic(id)).snapshotId,immutable.snapshotId);assert.equal(ok(await store.readPublic(id)).snapshot.html,originalHTML);
  const second=ok(await store.publish(id,options(2,1,'2026-10-16T02:00:00Z')));assert.notEqual(second.snapshotId,immutable.snapshotId);assert.equal(second.snapshot.firstPublishedAt,immutable.snapshot.firstPublishedAt);assert.equal(second.snapshot.publishedRevision,2);assert.match(second.snapshot.html,/edited draft/);
  const privateState=ok(store.unpublish(id,2));assert.equal(privateState.generation,3);assert.equal(privateState.snapshotId,null);assert.equal(privateState.firstPublishedAt,immutable.snapshot.firstPublishedAt);
  error(await store.readPublic(id),'NOT_PUBLISHED');assert.equal(ok(await store.readSnapshot(immutable.snapshotId)).snapshot.html,originalHTML);assert.equal(db.prepare('SELECT revision FROM posts_v2 WHERE id=?').get(id).revision,2);
  const third=ok(await store.publish(id,options(2,3,'2026-10-16T03:00:00Z')));assert.equal(third.snapshot.firstPublishedAt,immutable.snapshot.firstPublishedAt);assert.equal(third.snapshot.publishedRevision,2);assert.equal(third.snapshot.generation,4);assert.notEqual(third.snapshotId,second.snapshotId);
  assert.throws(()=>db.prepare('UPDATE publication_snapshots_v1 SET payload=payload WHERE snapshot_id=?').run(third.snapshotId),/immutable/);
  assert.throws(()=>db.prepare('DELETE FROM publication_snapshots_v1 WHERE snapshot_id=?').run(immutable.snapshotId),/retained/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,3);
 }finally{db.close();}
});
test('R11 render/missing asset/asset checker failure retain the previous public snapshot',async()=>{
 const {db,drafts,post,store,id}=await setup();try{
  const first=ok(await store.publish(id,options()));
  error(await store.publish(id,{...options(1,1,'2026-10-16T02:00:00Z'),assetExists:async()=>false}),'MISSING_PUBLICATION_ASSET');
  error(await store.publish(id,{...options(1,1,'2026-10-16T02:00:00Z'),assetExists:async()=>{throw Error('asset failure');}}),'PUBLICATION_STORAGE_ERROR');
  const next=structuredClone(post);next.metadata.revision=2;next.document.lexicalState.root.children[0].children.push({type:'tufte-code',version:1,width:'body',language:'js',children:[]});ok(await drafts.compareAndSwap(next,1));
  error(await store.publish(id,options(2,1,'2026-10-16T02:00:00Z')),'UNSUPPORTED_RENDER_PROPERTY');
  assert.equal(ok(await store.readPublic(id)).snapshotId,first.snapshotId);assert.equal(ok(store.readState(id)).generation,1);assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,1);
 }finally{db.close();}
});
test('R11 pointer write failure rolls back the new snapshot and preserves the previous pointer',async()=>{
 const {db,store,id}=await setup();try{
  const first=ok(await store.publish(id,options()));
  db.exec("CREATE TRIGGER inject_pointer_failure BEFORE UPDATE ON publication_heads_v1 BEGIN SELECT RAISE(ABORT,'injected pointer failure'); END");
  error(await store.publish(id,options(1,1,'2026-10-16T02:00:00Z')),'PUBLICATION_STORAGE_ERROR');
  assert.equal(ok(await store.readPublic(id)).snapshotId,first.snapshotId);assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,1);
  error(store.unpublish(id,1),'PUBLICATION_STORAGE_ERROR');assert.equal(ok(await store.readPublic(id)).snapshotId,first.snapshotId);
 }finally{db.close();}
});
test('R11 initial snapshot insert failure leaves publication private',async()=>{
 const {db,store,id}=await setup();try{
  db.exec("CREATE TRIGGER inject_snapshot_failure BEFORE INSERT ON publication_snapshots_v1 BEGIN SELECT RAISE(ABORT,'injected snapshot failure'); END");
  error(await store.publish(id,options()),'PUBLICATION_STORAGE_ERROR');error(await store.readPublic(id),'NOT_PUBLISHED');assert.equal(ok(store.readState(id)).generation,0);
 }finally{db.close();}
});
test('R11 competing publishers share a generation CAS boundary',async()=>{
 const {db,store,id}=await setup();try{
  const [a,b]=await Promise.all([store.publish(id,options()),store.publish(id,options(1,0,'2026-10-16T02:00:00Z'))]);
  assert.equal([a,b].filter(r=>r.ok).length,1);error([a,b].find(r=>!r.ok),'PUBLICATION_CONFLICT');assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,1);
 }finally{db.close();}
});
test('R11 draft changes while checking assets are rejected at transaction recheck',async()=>{
 const {db,drafts,post,store,id}=await setup();try{
  let changed=false;const next=structuredClone(post);next.metadata.revision=2;
  error(await store.publish(id,{...options(),assetExists:async()=>{if(!changed){changed=true;ok(await drafts.compareAndSwap(next,1));}return true;}}),'REVISION_CONFLICT');
  error(await store.readPublic(id),'NOT_PUBLISHED');assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,0);
 }finally{db.close();}
});
test('R11 invalid/stale inputs and backwards times do not advance publication',async()=>{
 const {db,store,id}=await setup();try{
  error(await store.publish(id,null),'INVALID_PUBLICATION_INPUT');error(await store.publish('../path',options()),'INVALID_PUBLICATION_INPUT');
  error(await store.publish(id,options(2)),'REVISION_CONFLICT');error(await store.publish(id,options(1,9)),'PUBLICATION_CONFLICT');error(await store.publish(id,options(1,0,'2026-10-15T23:00:00Z')),'INVALID_PUBLICATION_TIME');
  const first=ok(await store.publish(id,options()));error(await store.publish(id,options(1,1,'2026-10-16T01:00:00Z')),'INVALID_PUBLICATION_TIME');error(store.unpublish(id,8),'PUBLICATION_CONFLICT');assert.equal(ok(await store.readPublic(id)).snapshotId,first.snapshotId);
  error(await store.readSnapshot('bad'),'INVALID_SNAPSHOT_ID');error(await store.readSnapshot('a'.repeat(64)),'SNAPSHOT_NOT_FOUND');
 }finally{db.close();}
});
test('R11 immutable snapshot persists across close/reopen and checksum damage fails closed',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'tufte-publication-'));let db;
 try{
  const path=join(dir,'posts.sqlite'),created=await setup(path);db=created.db;const first=ok(await created.store.publish(created.id,options()));db.close();
  db=new DatabaseSync(path);const store=new SqlitePublicationStore(db);assert.deepEqual(ok(await store.readPublic(created.id)),first);
  db.exec('DROP TRIGGER publication_snapshot_no_update');const damaged=structuredClone(first.snapshot);damaged.html='damaged';db.prepare('UPDATE publication_snapshots_v1 SET payload=? WHERE snapshot_id=?').run(JSON.stringify(damaged),first.snapshotId);
  error(await store.readPublic(created.id),'SNAPSHOT_INTEGRITY_ERROR');
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});

test('R11 separate SQLite connections cannot both publish the same generation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'tufte-publication-cas-'));let first,second;
 try{
  const path=join(dir,'posts.sqlite'),created=await setup(path);first=created.db;second=new DatabaseSync(path);second.exec('PRAGMA foreign_keys=ON');
  const other=new SqlitePublicationStore(second);
  const results=await Promise.all([created.store.publish(created.id,options()),other.publish(created.id,options(1,0,'2026-10-16T02:00:00Z'))]);
  assert.equal(results.filter(r=>r.ok).length,1);error(results.find(r=>!r.ok),'PUBLICATION_CONFLICT');assert.deepEqual(ok(await created.store.readPublic(created.id)),ok(await other.readPublic(created.id)));
 }finally{first?.close();second?.close();rmSync(dir,{recursive:true,force:true});}
});
test('R11 publication options are detached before asynchronous asset preflight',async()=>{
 const {db,store,id}=await setup();try{
  let release;const gate=new Promise(resolve=>release=resolve);const request={...options(),assetExists:async()=>{await gate;return true;}};
  const publishing=store.publish(id,request);request.expectedRevision=88;request.expectedGeneration=99;request.publishedAt='invalid';release();
  const result=ok(await publishing);assert.equal(result.snapshot.publishedRevision,1);assert.equal(result.snapshot.generation,1);assert.equal(result.snapshot.publishedAt,options().publishedAt);
 }finally{db.close();}
});

test('R11 draft CAS preserves creation time and monotonic update time',async()=>{
 const {db,drafts,post,store,id}=await setup();try{
  const next=structuredClone(post);next.metadata.revision=2;next.metadata.updatedAt='2026-10-16T02:00:00Z';ok(await drafts.compareAndSwap(next,1));
  const changedCreation=structuredClone(next);changedCreation.metadata.revision=3;changedCreation.metadata.createdAt='2026-10-15T00:00:00Z';error(await drafts.compareAndSwap(changedCreation,2),'REVISION_CONFLICT');
  const backwards=structuredClone(next);backwards.metadata.revision=3;backwards.metadata.updatedAt='2026-10-16T01:00:00Z';error(await drafts.compareAndSwap(backwards,2),'REVISION_CONFLICT');
  assert.equal(db.prepare('SELECT revision FROM posts_v2 WHERE id=?').get(id).revision,2);
  ok(await store.publish(id,options(2,0,'2026-10-16T03:00:00Z')));
 }finally{db.close();}
});

test('R11 in-memory preflight also rejects creation changes and backwards updates',async()=>{
 const post=initial(),store=new InMemoryPostRevisionStoreV2(post),next=structuredClone(post);next.metadata.revision=2;next.metadata.updatedAt='2026-10-16T02:00:00Z';ok(await store.compareAndSwap(next,1));
 const creation=structuredClone(next);creation.metadata.revision=3;creation.metadata.createdAt='2026-10-15T00:00:00Z';error(await store.compareAndSwap(creation,2),'CREATED_AT_IMMUTABLE');
 const backwards=structuredClone(next);backwards.metadata.revision=3;backwards.metadata.updatedAt='2026-10-16T01:00:00Z';error(await store.compareAndSwap(backwards,2),'UPDATED_AT_REGRESSION');assert.equal(store.read().metadata.revision,2);
});
