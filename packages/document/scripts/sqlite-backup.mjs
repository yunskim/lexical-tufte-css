import {readSqlitePostSnapshotV2} from '../dist/index.js';
import {writePostBackupFile} from './backup-file.mjs';

/** Single-row snapshot and revision guard before writing a local backup file. */
export async function writeSqlitePostBackupFile(path,db,postId,expectedRevision){
 const snapshot=await readSqlitePostSnapshotV2(db,postId);
 if(!snapshot.ok)return snapshot;
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1||
  snapshot.value.metadata.revision!==expectedRevision)
  return {ok:false,diagnostics:[{code:'BACKUP_REVISION_CONFLICT',path:'$.expectedRevision',message:'Snapshot revision differs'}]};
 return writePostBackupFile(path,snapshot.value);
}
