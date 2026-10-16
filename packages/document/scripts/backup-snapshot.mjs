import {createPostBackupV2} from '../dist/index.js';
import {writePostBackupFile} from './backup-file.mjs';

/** The supplied reader must return revision and payload from one consistent snapshot. */
export async function writePostBackupSnapshotFile(path,readSnapshot,expectedRevision){
 const snapshot=await readSnapshot();
 const checked=createPostBackupV2(snapshot);
 if(!checked.ok)return checked;
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1||checked.value.record.metadata.revision!==expectedRevision)
  return {ok:false,diagnostics:[{code:'BACKUP_REVISION_CONFLICT',path:'$.expectedRevision',message:'Snapshot revision differs'}]};
 return writePostBackupFile(path,checked.value.record);
}
