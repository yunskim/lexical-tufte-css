import {readdir,lstat,unlink} from 'node:fs/promises';
import {dirname,basename,join} from 'node:path';

/**
 * Explicit recovery after stopping backup writers. Dry-run by default.
 * Age gating reduces accidental deletion of recently active temporary files,
 * but cannot replace an exclusive maintenance lock.
 */
export async function cleanupOrphanedBackupTemps(path,{dryRun=true,minAgeMs=60*60*1000,now=Date.now()}={}){
 if(!Number.isFinite(minAgeMs)||minAgeMs<0)throw new RangeError('Invalid minimum age');
 const directory=dirname(path);
 const prefix='.'+basename(path)+'.';
 const names=await readdir(directory);
 const candidates=[];
 const removed=[];
 for(const name of names){
  if(!name.startsWith(prefix)||!name.endsWith('.tmp'))continue;
  const uuid=name.slice(prefix.length,-4);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid))continue;
  const candidate=join(directory,name);
  let stat;
  try{stat=await lstat(candidate);}catch(error){
   if(error?.code==='ENOENT')continue;
   throw error;
  }
  if(!stat.isFile()||stat.isSymbolicLink()||now-stat.mtimeMs<minAgeMs)continue;
  candidates.push(name);
  if(!dryRun){
   // Recheck age and inode to reduce (not eliminate) time-of-check/time-of-use races.
   let latest;
   try{latest=await lstat(candidate);}catch(error){
    if(error?.code==='ENOENT')continue;
    throw error;
   }
   if(!latest.isFile()||latest.isSymbolicLink()||
    latest.ino!==stat.ino||latest.dev!==stat.dev||now-latest.mtimeMs<minAgeMs)continue;
   await unlink(candidate);
   removed.push(name);
  }
 }
 return {candidates,removed,dryRun};
}
