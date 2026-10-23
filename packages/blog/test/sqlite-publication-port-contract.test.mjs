import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqlitePostRevisionStoreV2} from '@lexical-tufte/document';
import {PublicationService} from '../src/publicationService.ts';
import {SqlitePublicationAdapter} from '../src/sqlitePublicationAdapter.ts';

const ok=result=>{assert.equal(result.ok,true,JSON.stringify(result.diagnostics));return result.value;};
const notOk=(result,code)=>{assert.equal(result.ok,false);assert.ok(result.diagnostics.some(d=>d.code===code),JSON.stringify(result.diagnostics));};
const schema=`
 CREATE TABLE posts_v2(id TEXT PRIMARY KEY,slug TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE publication_snapshots_v1(snapshot_id TEXT PRIMARY KEY,post_id TEXT NOT NULL,source_revision INTEGER NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE publication_heads_v1(post_id TEXT PRIMARY KEY,generation INTEGER NOT NULL,snapshot_id TEXT,last_snapshot_id TEXT,first_published_at TEXT NOT NULL,last_published_at TEXT NOT NULL,published_revision INTEGER NOT NULL);
`;
test('SQLite adapter port: empty head and unpublished read',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(schema);
  const store=new SqlitePublicationAdapter(db);
  const state=ok(await store.readState('example-post'));
  assert.equal(state.generation,0);
  assert.equal(state.snapshotId,null);
  notOk(await store.readPublic('example-post'),'NOT_PUBLISHED');
  notOk(await store.readSnapshot('f'.repeat(64)),'SNAPSHOT_NOT_FOUND');
 }finally{db.close();}
});
test('SQLite adapter port: stale unpublish generation never mutates head',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(schema);
  db.prepare('INSERT INTO publication_heads_v1(post_id,generation,snapshot_id,last_snapshot_id,first_published_at,last_published_at,published_revision) VALUES(?,?,?,?,?,?,?)')
   .run('example-post',2,'a'.repeat(64),'a'.repeat(64),'2026-10-01T00:00:00Z','2026-10-02T00:00:00Z',1);
  const store=new SqlitePublicationAdapter(db);
  notOk(await store.unpublishPublication({postId:'example-post',expectedGeneration:1}),'PUBLICATION_CONFLICT');
  assert.equal(ok(await store.readState('example-post')).generation,2);
  assert.equal(ok(await store.readState('example-post')).snapshotId,'a'.repeat(64));
  const unpublished=ok(await store.unpublishPublication({postId:'example-post',expectedGeneration:2}));
  assert.equal(unpublished.generation,3);
  assert.equal(unpublished.snapshotId,null);
  assert.equal(unpublished.lastSnapshotId,'a'.repeat(64));
  notOk(await store.unpublishPublication({postId:'example-post',expectedGeneration:3}),'NOT_PUBLISHED');
 }finally{db.close();}
});

const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
const initial=()=>({document:fixture(),metadata:{slug:'publication',summary:'original',tags:[],authors:['editor'],status:'draft',createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1}});
const revisionDb=db=>({prepare(sql){return {bind(...values){return {async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}};}};}};}});
async function integrated(){
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(readFileSync(new URL('../../document/sql/001_posts_v2.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../sql/001_publications_v1.sql',import.meta.url),'utf8'));
  const post=initial(),drafts=new SqlitePostRevisionStoreV2(revisionDb(db));
  ok(await drafts.insert(post));
  const store=new SqlitePublicationAdapter(db);
  return {db,post,drafts,store,service:new PublicationService(store),id:post.document.id};
 }catch(e){db.close();throw e;}
}
const publishOptions=(revision,generation,time)=>({expectedRevision:revision,expectedGeneration:generation,publishedAt:time,assetExists:async()=>true});
test('neutral service + SQLite adapter: publish, restore, unpublish preserve immutable history',async()=>{
 const {db,post,drafts,store,service,id}=await integrated();
 try{
  const first=ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  assert.equal(ok(await store.readPublic(id)).snapshotId,first.snapshotId);
  const next=structuredClone(post);
  next.metadata.revision=2;next.metadata.updatedAt='2026-10-16T02:00:00Z';next.document.title='revised draft';
  ok(await drafts.compareAndSwap(next,1));
  assert.equal(ok(await store.readPublic(id)).snapshotId,first.snapshotId);
  const second=ok(await service.publish(id,publishOptions(2,1,'2026-10-16T03:00:00Z')));
  assert.notEqual(second.snapshotId,first.snapshotId);
  const restored=ok(await service.restore(id,first.snapshotId,{expectedGeneration:2,authorize:async()=>true,assetExists:async()=>true}));
  assert.equal(restored.generation,3);
  assert.equal(restored.publishedRevision,1);
  assert.equal(ok(await store.readPublic(id)).snapshotId,first.snapshotId);
  assert.equal(ok(await store.readDraft(id)).metadata.revision,2);
  assert.equal(ok(await store.readSnapshot(second.snapshotId)).snapshotId,second.snapshotId);
  const unpublished=ok(await service.unpublish(id,{expectedGeneration:3,authorize:async()=>true}));
  assert.equal(unpublished.generation,4);
  assert.equal(unpublished.snapshotId,null);
  notOk(await store.readPublic(id),'NOT_PUBLISHED');
  assert.equal(ok(await store.readSnapshot(first.snapshotId)).snapshotId,first.snapshotId);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,2);
 }finally{db.close();}
});
test('neutral service + SQLite adapter: stale restore and unpublish are rejected without side effects',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  const first=ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  const staleRestore=await service.restore(id,first.snapshotId,{expectedGeneration:0,authorize:async()=>true,assetExists:async()=>true});
  notOk(staleRestore,'PUBLICATION_CONFLICT');
  const staleUnpublish=await service.unpublish(id,{expectedGeneration:0,authorize:async()=>true});
  notOk(staleUnpublish,'PUBLICATION_CONFLICT');
  assert.equal(ok(await store.readState(id)).generation,1);
  assert.equal(ok(await store.readPublic(id)).snapshotId,first.snapshotId);
 }finally{db.close();}
});
test('neutral service + SQLite adapter: draft update during asset preflight rejects publication',async()=>{
 const {db,post,drafts,store,service,id}=await integrated();
 try{
  const next=structuredClone(post);
  next.metadata.revision=2;next.metadata.updatedAt='2026-10-16T00:30:00Z';next.document.title='concurrent edit';
  let changed=false;
  const result=await service.publish(id,{...publishOptions(1,0,'2026-10-16T01:00:00Z'),assetExists:async()=>{
   if(!changed){changed=true;ok(await drafts.compareAndSwap(next,1));}
   return true;
  }});
  assert.equal(changed,true);
  notOk(result,'REVISION_CONFLICT');
  assert.equal(ok(await store.readState(id)).generation,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,0);
 }finally{db.close();}
});

test('neutral service + SQLite adapter: competing publish attempts cannot both commit',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  const [first,second]=await Promise.all([
   service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')),
   service.publish(id,publishOptions(1,0,'2026-10-16T01:01:00Z'))
  ]);
  const outcomes=[first,second];
  assert.equal(outcomes.filter(r=>r.ok).length,1);
  assert.equal(outcomes.filter(r=>!r.ok).length,1);
  assert.ok(outcomes.find(r=>!r.ok).diagnostics.some(d=>d.code==='PUBLICATION_CONFLICT'));
  assert.equal(ok(await store.readState(id)).generation,1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,1);
 }finally{db.close();}
});
test('neutral service + SQLite adapter: restore rejects a changed head after async asset check',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  const first=ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  let changed=false;
  const result=await service.restore(id,first.snapshotId,{
   expectedGeneration:1,authorize:async()=>true,assetExists:async()=>{
    if(!changed){changed=true;ok(await store.unpublishPublication({postId:id,expectedGeneration:1}));}
    return true;
   }
  });
  assert.equal(changed,true);
  notOk(result,'PUBLICATION_CONFLICT');
  const head=ok(await store.readState(id));
  assert.equal(head.generation,2);
  assert.equal(head.snapshotId,null);
  assert.equal(ok(await store.readSnapshot(first.snapshotId)).snapshotId,first.snapshotId);
 }finally{db.close();}
});
test('SQLite adapter: snapshot payload tampering fails checksum and cannot restore',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  const first=ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  db.prepare('UPDATE publication_snapshots_v1 SET payload=? WHERE snapshot_id=?').run('{"tampered":true}',first.snapshotId);
  notOk(await store.readSnapshot(first.snapshotId),'SNAPSHOT_INTEGRITY_ERROR');
  notOk(await store.readPublic(id),'SNAPSHOT_INTEGRITY_ERROR');
  notOk(await service.restore(id,first.snapshotId,{expectedGeneration:1,authorize:async()=>true,assetExists:async()=>true}),'SNAPSHOT_INTEGRITY_ERROR');
  assert.equal(ok(await store.readState(id)).generation,1);
  assert.equal(ok(await store.readState(id)).snapshotId,first.snapshotId);
 }finally{db.close();}
});

test('SQLite adapter: separate database connections reject a stale publication generation',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'lexical-publication-cas-'));
 const filename=join(directory,'publication.sqlite');
 const firstDb=new DatabaseSync(filename),secondDb=new DatabaseSync(filename);
 try{
  firstDb.exec(readFileSync(new URL('../../document/sql/001_posts_v2.sql',import.meta.url),'utf8'));
  firstDb.exec(readFileSync(new URL('../sql/001_publications_v1.sql',import.meta.url),'utf8'));
  const post=initial();
  ok(await new SqlitePostRevisionStoreV2(revisionDb(firstDb)).insert(post));
  const first=new PublicationService(new SqlitePublicationAdapter(firstDb));
  const second=new PublicationService(new SqlitePublicationAdapter(secondDb));
  const id=post.document.id;
  const [a,b]=await Promise.all([
   first.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')),
   second.publish(id,publishOptions(1,0,'2026-10-16T01:01:00Z'))
  ]);
  assert.equal([a,b].filter(r=>r.ok).length,1);
  assert.equal([a,b].filter(r=>!r.ok).length,1);
  assert.ok([a,b].find(r=>!r.ok).diagnostics.some(d=>d.code==='PUBLICATION_CONFLICT'));
  const store=new SqlitePublicationAdapter(firstDb);
  assert.equal(ok(await store.readState(id)).generation,1);
  assert.equal(firstDb.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,1);
 }finally{secondDb.close();firstDb.close();rmSync(directory,{recursive:true,force:true});}
});
test('SQLite adapter: snapshot insert failure rolls back head transition',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  db.exec(`CREATE TRIGGER reject_publication_snapshot BEFORE INSERT ON publication_snapshots_v1
   BEGIN SELECT RAISE(ABORT,'simulated snapshot insert failure'); END;`);
  const result=await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z'));
  notOk(result,'PUBLICATION_STORAGE_ERROR');
  assert.equal(ok(await store.readState(id)).generation,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,0);
  db.exec('DROP TRIGGER reject_publication_snapshot');
  ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  assert.equal(ok(await store.readState(id)).generation,1);
 }finally{db.close();}
});
test('SQLite adapter: publication head insert failure rolls back newly inserted snapshot',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  db.exec(`CREATE TRIGGER reject_publication_head BEFORE INSERT ON publication_heads_v1
   BEGIN SELECT RAISE(ABORT,'simulated head insert failure'); END;`);
  const result=await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z'));
  notOk(result,'PUBLICATION_STORAGE_ERROR');
  assert.equal(ok(await store.readState(id)).generation,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,0);
  db.exec('DROP TRIGGER reject_publication_head');
  ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,1);
 }finally{db.close();}
});
test('SQLite adapter: unpublish update failure leaves active head intact',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  const published=ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  db.exec(`CREATE TRIGGER reject_unpublish BEFORE UPDATE ON publication_heads_v1
   BEGIN SELECT RAISE(ABORT,'simulated unpublish failure'); END;`);
  notOk(await store.unpublishPublication({postId:id,expectedGeneration:1}),'PUBLICATION_STORAGE_ERROR');
  const head=ok(await store.readState(id));
  assert.equal(head.generation,1);
  assert.equal(head.snapshotId,published.snapshotId);
  assert.equal(ok(await store.readPublic(id)).snapshotId,published.snapshotId);
 }finally{db.close();}
});

test('SQLite adapter: restore update failure rolls back without changing publication head',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  const first=ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  const second=ok(await service.publish(id,publishOptions(1,1,'2026-10-16T02:00:00Z')));
  db.exec(`CREATE TRIGGER reject_restore BEFORE UPDATE ON publication_heads_v1
   BEGIN SELECT RAISE(ABORT,'simulated restore failure'); END;`);
  notOk(await service.restore(id,first.snapshotId,{expectedGeneration:2,authorize:async()=>true,assetExists:async()=>true}),'PUBLICATION_STORAGE_ERROR');
  const head=ok(await store.readState(id));
  assert.equal(head.generation,2);
  assert.equal(head.snapshotId,second.snapshotId);
  assert.equal(head.lastSnapshotId,second.snapshotId);
  assert.equal(ok(await store.readPublic(id)).snapshotId,second.snapshotId);
  assert.equal(db.prepare('SELECT count(*) AS n FROM publication_snapshots_v1').get().n,2);
  db.exec('DROP TRIGGER reject_restore');
  const restored=ok(await service.restore(id,first.snapshotId,{expectedGeneration:2,authorize:async()=>true,assetExists:async()=>true}));
  assert.equal(restored.generation,3);
  assert.equal(restored.snapshotId,first.snapshotId);
 }finally{db.close();}
});
test('SQLite adapter: invalid restore snapshot cannot change head',async()=>{
 const {db,store,service,id}=await integrated();
 try{
  const first=ok(await service.publish(id,publishOptions(1,0,'2026-10-16T01:00:00Z')));
  notOk(await store.restorePublication({postId:id,snapshotId:'f'.repeat(64),expectedGeneration:1}),'SNAPSHOT_NOT_FOUND');
  const head=ok(await store.readState(id));
  assert.equal(head.generation,1);
  assert.equal(head.snapshotId,first.snapshotId);
 }finally{db.close();}
});
