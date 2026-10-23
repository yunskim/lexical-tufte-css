import assert from 'node:assert/strict';

/**
 * Proposed publish-as-revision transition contract.
 * Pure model only: does NOT exercise SqlitePublicationStore or production APIs.
 * Run explicitly: node tests/publish-revision-model.mjs
 */
const fresh=()=>({draftVersion:1,working:'A',generation:0,publicRevision:0,active:null,snapshots:[],status:'draft'});
const clone=s=>structuredClone(s);
const save=(s,working)=>({...s,draftVersion:s.draftVersion+1,working});
function publish(state,{expectedDraft,expectedGeneration,assetAvailable=true}){
 const s=clone(state);
 if(expectedDraft!==s.draftVersion||expectedGeneration!==s.generation)return {ok:false,reason:'conflict',state:s};
 if(!assetAvailable)return {ok:false,reason:'asset',state:s};
 if(s.active&&s.active.working===s.working)return {ok:true,noOp:true,state:s};
 const next=s.publicRevision+1;
 const snapshot={number:next,working:s.working,sourceDraftVersion:s.draftVersion};
 s.publicRevision=next;s.generation++;s.snapshots.push(snapshot);s.active=snapshot;
 return {ok:true,noOp:false,state:s};
}
function unpublish(state,expectedGeneration){
 const s=clone(state);
 if(s.generation!==expectedGeneration||s.active===null)return {ok:false,state:s};
 s.generation++;s.active=null;return {ok:true,state:s};
}
function restore(state,number,expectedGeneration,{authorized=true,assetAvailable=true}={}){
 const s=clone(state);
 if(s.generation!==expectedGeneration||!authorized||!assetAvailable)return {ok:false,state:s};
 const snapshot=s.snapshots.find(x=>x.number===number);
 if(!snapshot)return {ok:false,state:s};
 // Explicit restore is a visibility event, not a new content revision.
 s.generation++;s.active=snapshot;return {ok:true,state:s};
}
let s=fresh();
let r=publish(s,{expectedDraft:1,expectedGeneration:0});assert.equal(r.ok,true);s=r.state;
assert.equal(s.publicRevision,1);assert.equal(s.active.working,'A');
for(let i=0;i<6;i++)s=save(s,'B'+i);
assert.equal(s.draftVersion,7);assert.equal(s.active.working,'A');assert.equal(s.publicRevision,1);
const stale=publish(s,{expectedDraft:7,expectedGeneration:0});
assert.equal(stale.ok,false);assert.deepEqual(stale.state,s);
const missing=publish(s,{expectedDraft:7,expectedGeneration:1,assetAvailable:false});
assert.equal(missing.ok,false);assert.deepEqual(missing.state,s);
r=publish(s,{expectedDraft:7,expectedGeneration:1});assert.equal(r.ok,true);s=r.state;
assert.equal(s.publicRevision,2);assert.equal(s.active.working,'B5');assert.equal(s.snapshots[0].working,'A');
r=publish(s,{expectedDraft:7,expectedGeneration:2});assert.equal(r.noOp,true);assert.deepEqual(r.state,s);
const conflict=publish(s,{expectedDraft:7,expectedGeneration:1});assert.equal(conflict.ok,false);
r=unpublish(s,2);assert.equal(r.ok,true);s=r.state;
assert.equal(s.generation,3);assert.equal(s.publicRevision,2);assert.equal(s.active,null);
assert.equal(restore(s,1,3,{authorized:false}).ok,false);
assert.equal(restore(s,1,3,{assetAvailable:false}).ok,false);
r=restore(s,1,3);assert.equal(r.ok,true);s=r.state;
assert.equal(s.active.number,1);assert.equal(s.publicRevision,2);assert.equal(s.generation,4);
assert.equal(s.snapshots.length,2);
assert.equal(s.status,'draft'); // public visibility derives from active head, not metadata
const lostResponse=publish(s,{expectedDraft:7,expectedGeneration:4});
assert.equal(lostResponse.ok,true);
const after=lostResponse.state;
assert.equal(publish(after,{expectedDraft:7,expectedGeneration:4}).ok,false);
assert.equal(after.active.number,3);
console.log('Publish revision model: 12 assertions groups passed (pure proposal model, NOT production store).');
