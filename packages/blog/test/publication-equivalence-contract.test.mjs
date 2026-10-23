import {test} from 'node:test';
import assert from 'node:assert/strict';

/**
 * Proposed semantic-equivalence contract fixture, independent of production.
 * It must NOT be confused with actual publication-store behavior.
 */
function projection({document,metadata,rendererProfile,assets,referenceManifest,policyVersion}){
 if(!Array.isArray(assets)||assets.some(a=>!a.id||!a.digest))return null;
 if(!Array.isArray(referenceManifest))return null;
 return {
  document,
  publicMetadata:{slug:metadata.slug,summary:metadata.summary,tags:metadata.tags,authors:metadata.authors},
  rendererProfile,
  assets:assets.map(({id,digest})=>({id,digest})),
  referenceManifest,
  policyVersion,
 };
}
function equal(a,b){
 const left=projection(a),right=projection(b);
 return left!==null&&right!==null&&JSON.stringify(left)===JSON.stringify(right);
}
const base={
 document:{id:'post-1',title:'Example',lexicalState:{root:{children:[{type:'paragraph',text:'Hello'}]}}},
 metadata:{slug:'example',summary:'public',tags:['a'],authors:['editor'],revision:1,updatedAt:'2026-10-23T01:00:00Z',status:'draft'},
 rendererProfile:'renderer-v1',
 assets:[{id:'image-1',digest:'sha256:111'}],
 referenceManifest:[{key:'ref-1',target:'post-2'}],
 policyVersion:'resolution-v1',
};
const changed=(mutate)=>{const next=structuredClone(base);mutate(next);return next;};
test('draft revision and updatedAt do not force a new public content revision',()=>{
 const next=changed(v=>{v.metadata.revision=10;v.metadata.updatedAt='2026-10-23T02:00:00Z';});
 assert.equal(equal(base,next),true);
});
test('public metadata changes force new published content',()=>{
 for(const field of ['slug','summary','tags','authors']){
  const next=changed(v=>{v.metadata[field]=field==='tags'?['b']:field==='authors'?['other']:'different';});
  assert.equal(equal(base,next),false,field);
 }
});
test('document, renderer, resolved links and policy changes are material',()=>{
 for(const mutate of [
  v=>{v.document.title='Other';},
  v=>{v.rendererProfile='renderer-v2';},
  v=>{v.referenceManifest[0].target='post-3';},
  v=>{v.policyVersion='resolution-v2';},
 ]){
  assert.equal(equal(base,changed(mutate)),false);
 }
});
test('same rendered HTML is insufficient when asset identity or bytes change',()=>{
 assert.equal(equal(base,changed(v=>{v.assets[0].id='image-2';})),false);
 assert.equal(equal(base,changed(v=>{v.assets[0].digest='sha256:222';})),false);
});
test('missing immutable asset identity is unknown, not equivalent',()=>{
 assert.equal(equal(base,changed(v=>{v.assets=[{src:'https://example.invalid/mutable.png'}];})),false);
});
