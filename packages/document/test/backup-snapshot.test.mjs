import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writePostBackupSnapshotFile} from '../scripts/backup-snapshot.mjs';
import {readPostBackupFile} from '../scripts/backup-file.mjs';

test('snapshot backup refuses revision mismatch without changing destination',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tufte-snapshot-'));
 try{
  const path=join(dir,'post.json');
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'snapshot-test',summary:'original',tags:[],authors:['editor'],status:'draft',createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  const record={document,metadata};
  const success=await writePostBackupSnapshotFile(path,async()=>record,1);
  assert.equal(success.ok,true,JSON.stringify(success.diagnostics));
  const mismatch=await writePostBackupSnapshotFile(path,async()=>({...record,metadata:{...metadata,revision:2,summary:'stale'}}),1);
  assert.equal(mismatch.ok,false);
  assert.ok(mismatch.diagnostics.some(d=>d.code==='BACKUP_REVISION_CONFLICT'));
  const stored=await readPostBackupFile(path);
  assert.equal(stored.ok,true);
  assert.equal(stored.value.record.metadata.revision,1);
  assert.deepEqual(await readdir(dir),['post.json']);
 }finally{await rm(dir,{recursive:true,force:true});}
});
