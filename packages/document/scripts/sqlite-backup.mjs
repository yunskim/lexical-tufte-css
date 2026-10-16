import {readSqlitePostSnapshotV2} from '../dist/index.js';
import {writePostBackupSnapshotFile} from './backup-snapshot.mjs';

/**
 * Backup a SQLite/D1 post using a single-statement consistent snapshot.
 * The caller supplies an authorized destination and a revision observed earlier.
 */
export async function writeSqlitePostBackupFile(
 path,db,postId,expectedRevision,
){
 return writePostBackupSnapshotFile(
  path,async()=>{
   const snapshot=await readSqlitePostSnapshotV2(db,postId);
   if(!snapshot.ok)return snapshot;
   return snapshot.value;
  },expectedRevision,
 );
}
