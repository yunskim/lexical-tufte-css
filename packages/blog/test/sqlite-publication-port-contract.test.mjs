import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
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
