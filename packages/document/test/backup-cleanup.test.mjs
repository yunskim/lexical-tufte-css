import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cleanupOrphanedBackupTemps} from '../scripts/backup-cleanup.mjs';

test('crash leftovers are inspected without touching valid backups',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tufte-orphan-'));
 try{
  const path=join(dir,'post.json');
  const orphan='.post.json.123e4567-e89b-42d3-a456-426614174000.tmp';
  const unrelated='.other.json.123e4567-e89b-42d3-a456-426614174000.tmp';
  await writeFile(path,'stable');
  await writeFile(join(dir,orphan),'partial');
  await writeFile(join(dir,unrelated),'unrelated');
  await writeFile(join(dir,'.post.json.fake.tmp'),'unrelated');
  const preview=await cleanupOrphanedBackupTemps(path,{minAgeMs:0});
  assert.deepEqual(preview.candidates,[orphan]);
  assert.deepEqual(preview.removed,[]);
  assert.equal((await readdir(dir)).includes(orphan),true);
  const cleaned=await cleanupOrphanedBackupTemps(path,{dryRun:false,minAgeMs:0});
  assert.deepEqual(cleaned.removed,[orphan]);
  const names=await readdir(dir);
  assert.equal(names.includes(orphan),false);
  assert.equal(names.includes('post.json'),true);
  assert.equal(names.includes(unrelated),true);
  assert.equal(names.includes('.post.json.fake.tmp'),true);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('recent temporary backup is excluded by default age threshold',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tufte-active-temp-'));
 try{
  const path=join(dir,'post.json');
  const name='.post.json.123e4567-e89b-42d3-a456-426614174000.tmp';
  await writeFile(join(dir,name),'in-progress');
  const result=await cleanupOrphanedBackupTemps(path,{dryRun:false});
  assert.deepEqual(result.candidates,[]);
  assert.deepEqual(result.removed,[]);
  assert.equal((await readdir(dir)).includes(name),true);
 }finally{await rm(dir,{recursive:true,force:true});}
});
