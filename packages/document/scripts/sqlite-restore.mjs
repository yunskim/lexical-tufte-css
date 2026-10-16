import {readSqlitePostSnapshotV2,restorePostBackupV2,SqlitePostRevisionStoreV2} from '../dist/index.js';
import {readPostBackupFile} from './backup-file.mjs';

/**
 * Restore an existing post from a local backup. No upsert or silent overwrite:
 * CAS verifies the revision again at write time.
 */
export async function restoreSqlitePostBackupFile(path,db,postId,expectedRevision){
 const backup=await readPostBackupFile(path);
 if(!backup.ok)return backup;
 if(backup.value.record.document.id!==postId)
  return {ok:false,diagnostics:[{code:'BACKUP_IDENTITY_MISMATCH',path:'$.record.document.id',message:'Backup post ID differs'}]};
 const current=await readSqlitePostSnapshotV2(db,postId);
 if(!current.ok)return current;
 return restorePostBackupV2(
  new SqlitePostRevisionStoreV2(db),backup.value,current.value,expectedRevision,
 );
}
