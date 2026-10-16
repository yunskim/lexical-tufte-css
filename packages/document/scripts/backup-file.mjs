import {open,rename,rm,mkdir} from 'node:fs/promises';
import {dirname,basename,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createPostBackupV2,inspectPostBackupV2} from '../dist/index.js';

/**
 * Host-controlled destination only. Caller must supply an authorized path.
 * Never derive destination from untrusted slug or document ID.
 */
export async function writePostBackupFile(path,record,{filesystem}={}){
 const fs=filesystem??{open,rename,rm,mkdir};
 const checked=createPostBackupV2(record);
 if(!checked.ok)return checked;
 const directory=dirname(path);
 await fs.mkdir(directory,{recursive:true});
 const temporary=join(directory,'.'+basename(path)+'.'+randomUUID()+'.tmp');
 let handle;
 try{
  handle=await fs.open(temporary,'wx',0o600);
  await handle.writeFile(JSON.stringify(checked.value)+'\n','utf8');
  await handle.sync();
  await handle.close();handle=undefined;
  // Same-directory rename is atomic on supported local filesystems.
  await fs.rename(temporary,path);
  // Durability of directory metadata varies by platform/filesystem.
  try{const dir=await fs.open(directory,'r');try{await dir.sync();}finally{await dir.close();}}
  catch{/* directory fsync unsupported: caller must assess durability */}
  return {ok:true,value:{path},diagnostics:[]};
 }finally{
  if(handle)await handle.close();
  await fs.rm(temporary,{force:true});
 }
}

export async function readPostBackupFile(path,{maxBytes=16*1024*1024}={}){
 const handle=await open(path,'r');
 try{
  const stat=await handle.stat();
  if(stat.size>maxBytes)return {ok:false,diagnostics:[{code:'BACKUP_TOO_LARGE',path:'$',message:'Backup exceeds size limit'}]};
  const raw=await handle.readFile('utf8');
  let parsed;
  try{parsed=JSON.parse(raw);}catch{
   return {ok:false,diagnostics:[{code:'INVALID_BACKUP_JSON',path:'$',message:'Invalid backup JSON'}]};
  }
  return inspectPostBackupV2(parsed);
 }finally{await handle.close();}
}
