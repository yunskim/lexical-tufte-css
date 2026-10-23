import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicationService} from '../src/publicationService.ts';

const ok=value=>({ok:true,value,diagnostics:[]});
const state={generation:2,snapshotId:null,lastSnapshotId:'a'.repeat(64),firstPublishedAt:'2026-10-01T00:00:00Z',publishedAt:'2026-10-02T00:00:00Z',publishedRevision:1};
const id='test-post';
const snapshotId='b'.repeat(64);
function fixture(){
 const calls=[];
 const post={document:{id},metadata:{createdAt:'2026-09-01T00:00:00Z',slug:'test',revision:3}};
 const snapshot={post:{document:{id},metadata:{createdAt:post.metadata.createdAt,slug:'test'}},assetSources:['/image.svg']};
 const store={
  readState:async()=>ok(state),
  readDraft:async()=>ok(post),
  readSnapshot:async()=>ok({snapshotId,snapshot}),
  restorePublication:async cmd=>{calls.push(['restore',cmd]);return ok({...state,generation:3,snapshotId});},
  unpublishPublication:async cmd=>{calls.push(['unpublish',cmd]);return ok({...state,generation:3,snapshotId:null});}
 };
 return {service:new PublicationService(store),calls};
}
test('neutral restore validates host authorization and assets before atomic port call',async()=>{
 const {service,calls}=fixture();
 const result=await service.restore(id,snapshotId,{expectedGeneration:2,authorize:async()=>true,assetExists:async src=>src==='/image.svg'});
 assert.equal(result.ok,true);
 assert.deepEqual(calls,[['restore',{postId:id,snapshotId,expectedGeneration:2}]]);
});
test('neutral restore denies access without touching storage transition',async()=>{
 const {service,calls}=fixture();
 const result=await service.restore(id,snapshotId,{expectedGeneration:2,authorize:async()=>false,assetExists:async()=>true});
 assert.equal(result.ok,false);
 assert.equal(result.diagnostics[0].code,'PUBLICATION_FORBIDDEN');
 assert.deepEqual(calls,[]);
});
test('neutral restore rejects missing asset before transition',async()=>{
 const {service,calls}=fixture();
 const result=await service.restore(id,snapshotId,{expectedGeneration:2,authorize:async()=>true,assetExists:async()=>false});
 assert.equal(result.ok,false);
 assert.equal(result.diagnostics[0].code,'MISSING_PUBLICATION_ASSET');
 assert.deepEqual(calls,[]);
});
test('neutral unpublish requires authorization and passes generation to port',async()=>{
 const {service,calls}=fixture();
 const denied=await service.unpublish(id,{expectedGeneration:2,authorize:async()=>false});
 assert.equal(denied.ok,false);
 assert.deepEqual(calls,[]);
 const result=await service.unpublish(id,{expectedGeneration:2,authorize:async()=>true});
 assert.equal(result.ok,true);
 assert.deepEqual(calls,[['unpublish',{postId:id,expectedGeneration:2}]]);
});
