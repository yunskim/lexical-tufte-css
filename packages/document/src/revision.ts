import type {Diagnostic,Result} from './types.js';
import {validatePostRecordV2,type PostRecordV2} from './metadata.js';

export type RevisionDecision={record:PostRecordV2;expectedRevision:number};

/**
 * Pure optimistic-concurrency preflight, not an atomic storage transaction.
 * The adapter must compare expectedRevision again within its write transaction.
 */
export function preparePostRevisionV2(
 current:unknown,next:unknown,expectedRevision:unknown,
):Result<RevisionDecision>{
 const diagnostics:Diagnostic[]=[];
 const old=validatePostRecordV2(current);
 const proposed=validatePostRecordV2(next);
 if(!old.ok)diagnostics.push(...old.diagnostics.map(d=>({...d,path:'$.current'+d.path.slice(1)})));
 if(!proposed.ok)diagnostics.push(...proposed.diagnostics.map(d=>({...d,path:'$.next'+d.path.slice(1)})));
 if(!Number.isSafeInteger(expectedRevision)||Number(expectedRevision)<1)
  diagnostics.push({code:'INVALID_EXPECTED_REVISION',path:'$.expectedRevision',message:'Expected a positive safe integer'});
 if(diagnostics.length)return {ok:false,diagnostics};
 if(!old.ok||!proposed.ok||typeof expectedRevision!=='number')
  return {ok:false,diagnostics:[{code:'INVALID_REVISION_INPUT',path:'$',message:'Invalid revision preflight input'}]};
 if(old.value.document.id!==proposed.value.document.id)
  return {ok:false,diagnostics:[{code:'DOCUMENT_ID_MISMATCH',path:'$.next.document.id',message:'Cannot replace a different document'}]};
 if(old.value.metadata.slug!==proposed.value.metadata.slug)
  return {ok:false,diagnostics:[{code:'POST_SLUG_MISMATCH',path:'$.next.metadata.slug',message:'Slug change requires a separate rename operation'}]};
 if(old.value.metadata.revision!==expectedRevision)
  return {ok:false,diagnostics:[{code:'REVISION_CONFLICT',path:'$.expectedRevision',message:'Stored revision differs from expected revision'}]};
 if(expectedRevision===Number.MAX_SAFE_INTEGER||proposed.value.metadata.revision!==expectedRevision+1)
  return {ok:false,diagnostics:[{code:'INVALID_NEXT_REVISION',path:'$.next.metadata.revision',message:'Next revision must increment exactly once'}]};
 return {ok:true,value:{record:proposed.value,expectedRevision},diagnostics:[]};
}
