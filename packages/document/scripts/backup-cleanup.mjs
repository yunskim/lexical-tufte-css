import {readdir,lstat,unlink} from 'node:fs/promises';
import {dirname,basename,join} from 'node:path';

/**
 * A crash before rename can leave hidden temporary files.
 * Cleanup is explicit and opt-in: never infer a backup from a temp file.
 * Only exact writer-generated names are considered; symlinks are ignored.
 */
export async function cleanupOrphanedBackupTemps(path,{dryRun=true}={}){
 const directory=dirname(path);
 const prefix='.'+basename(path)+'.';
 const names=await readdir(directory);
 const candidates=names.filter(name=>{
  if(!name.startsWith(prefix)||!name.endsWith('.tmp'))return false;
  const uuid=name.slice(prefix.length,-4);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
 });
 const removed=[];
 for(const name of candidates){
  const candidate=join(directory,name);
  const stat=await lstat(candidate);
  if(!stat.isFile()||stat.isSymbolicLink())continue;
  if(!dryRun){await unlink(candidate);removed.push(name);}
 }
 return {candidates,removed,dryRun};
}
