import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writePostBackupFile,readPostBackupFile} from '../scripts/backup-file.mjs';

test('durable backup writer replaces atomically and reader rejects corruption',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'lexical-tufte-backup-'));
 try{
  const path=join(directory,'post.backup.json');
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'backup-file',summary:'test',tags:[],authors:['editor'],status:'draft',
   createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  const record={document,metadata};
  const written=await writePostBackupFile(path,record);
  assert.equal(written.ok,true,JSON.stringify(written.diagnostics));
  const loaded=await readPostBackupFile(path);
  assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
  assert.deepEqual(loaded.value.record,record);
  assert.equal((await readPostBackupFile(path,{maxBytes:1})).ok,false);
  await writeFile(path,'{bad-json','utf8');
  const invalid=await readPostBackupFile(path);
  assert.equal(invalid.ok,false);
  assert.ok(invalid.diagnostics.some(d=>d.code==='INVALID_BACKUP_JSON'));
  const leftovers=await readFile(path,'utf8');
  assert.equal(leftovers,'{bad-json');
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('failed rename preserves previous backup and removes temporary file',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'lexical-tufte-failure-'));
 try{
  const path=join(directory,'post.json');
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'failure-backup',summary:'original',tags:[],authors:['editor'],status:'draft',
   createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  assert.equal((await writePostBackupFile(path,{document,metadata})).ok,true);
  const before=await readFile(path,'utf8');
  const filesystem={
   mkdir:(...args)=>import('node:fs/promises').then(fs=>fs.mkdir(...args)),
   open:(...args)=>import('node:fs/promises').then(fs=>fs.open(...args)),
   rm:(...args)=>import('node:fs/promises').then(fs=>fs.rm(...args)),
   async rename(){throw new Error('injected rename failure');},
  };
  await assert.rejects(
   writePostBackupFile(path,{document,metadata:{...metadata,summary:'new'}},{filesystem}),
   /injected rename failure/,
  );
  assert.equal(await readFile(path,'utf8'),before);
  const {readdir}=await import('node:fs/promises');
  assert.deepEqual(await readdir(directory),['post.json']);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('failed temp write preserves prior backup and removes temp file',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'lexical-tufte-write-failure-'));
 try{
  const path=join(directory,'post.json');
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'write-failure',summary:'original',tags:[],authors:['editor'],status:'draft',
   createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  assert.equal((await writePostBackupFile(path,{document,metadata})).ok,true);
  const before=await readFile(path,'utf8');
  const real=await import('node:fs/promises');
  const filesystem={
   mkdir:real.mkdir,rename:real.rename,rm:real.rm,
   async open(target,...args){
    const handle=await real.open(target,...args);
    if(target===directory)return handle;
    return {
     async writeFile(){await handle.writeFile('partial');throw new Error('injected disk full');},
     sync:()=>handle.sync(),close:()=>handle.close(),
    };
   },
  };
  await assert.rejects(
   writePostBackupFile(path,{document,metadata:{...metadata,summary:'new'}},{filesystem}),
   /injected disk full/,
  );
  assert.equal(await readFile(path,'utf8'),before);
  const {readdir}=await import('node:fs/promises');
  assert.deepEqual(await readdir(directory),['post.json']);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('failed file sync preserves old backup and removes temporary file',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'lexical-tufte-sync-failure-'));
 try{
  const path=join(directory,'post.json');
  const document=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
  const metadata={slug:'sync-failure',summary:'original',tags:[],authors:['editor'],status:'draft',
   createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',revision:1};
  assert.equal((await writePostBackupFile(path,{document,metadata})).ok,true);
  const before=await readFile(path,'utf8');
  const real=await import('node:fs/promises');
  const filesystem={
   mkdir:real.mkdir,rename:real.rename,rm:real.rm,
   async open(target,...args){
    const handle=await real.open(target,...args);
    return {
     writeFile:(...values)=>handle.writeFile(...values),
     async sync(){throw new Error('injected fsync failure');},
     close:()=>handle.close(),
    };
   },
  };
  await assert.rejects(
   writePostBackupFile(path,{document,metadata:{...metadata,summary:'new'}},{filesystem}),
   /injected fsync failure/,
  );
  assert.equal(await readFile(path,'utf8'),before);
  const {readdir}=await import('node:fs/promises');
  assert.deepEqual(await readdir(directory),['post.json']);
 }finally{await rm(directory,{recursive:true,force:true});}
});
