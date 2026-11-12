import {test} from 'node:test';
import assert from 'node:assert/strict';
import {$getRoot,$getNodeByKey,$createParagraphNode,$createTextNode} from 'lexical';
import {createFixtureEditor} from '../packages/lexical/test/all-nodes-fixture.mjs';
import {$createSectionNode,$createSidenoteNode,$createInlineImageNode,
 exportCanonicalEditorState} from '../packages/lexical/dist/index.js';
import {connectHostImage} from '../packages/editor-react/dist/index.js';

function setup(){
 const editor=createFixtureEditor();
 let imageKey='',noteKey='',expectedImage='';
 editor.update(()=>{
  const image=$createInlineImageNode('/before.svg','before');
  const note=$createSidenoteNode('note-a').append($createTextNode('note text'),image);
  $getRoot().append($createSectionNode().append($createParagraphNode().append(
   $createTextNode('before '),note,$createTextNode(' after')
  )));
  imageKey=image.getKey();noteKey=note.getKey();
  expectedImage=JSON.stringify(image.getImageProperties());
 },{discrete:true});
 const read=()=>exportCanonicalEditorState(editor.getEditorState());
 const images=()=>read().root.children[0].children[0].children
  .find(n=>n.noteId==='note-a').children.filter(n=>n.type==='tufte-inline-image');
 const replacement={kind:'replace',imageKey,noteId:'note-a',expectedImage};
 const append={kind:'append',noteKey,noteId:'note-a'};
 return {editor,read,images,imageKey,replacement,append};
}
const valid=(locator={assetId:'remote',revisionId:'v1'})=>({
 assetId:locator.assetId,revisionId:locator.revisionId??'v2',url:'/resolved.svg',
 mediaType:'image/svg+xml',expiresAt:new Date(Date.now()+3600_000).toISOString()
});
const provider=(reply=valid())=>({resolve:async()=>reply});
const opts=(scenario,extra={})=>({
 editor:scenario.editor,adapter:provider(),namespace:'test-host',
 locator:{assetId:'remote',revisionId:'v1'},target:scenario.replacement,alt:'remote alt',
 ...extra
});
const sleepTick=()=>new Promise(resolve=>setImmediate(resolve));

test('pinned replacement connects one image and preserves the note and URL metadata',async()=>{
 const s=setup(),response=valid();
 const outcome=await connectHostImage(opts(s,{adapter:provider(response)}));
 assert.equal(outcome.ok,true);
 assert.equal(outcome.expiresAt,response.expiresAt);
 const [image]=s.images();
 assert.equal(image.alt,'remote alt');
 assert.equal(image.src,'/resolved.svg');
 assert.deepEqual(image.hostAsset,{namespace:'test-host',assetId:'remote',revisionId:'v1'});
 assert.equal(image.assetId,undefined);
 assert.equal(s.images().length,1);
});

test('latest revision remains unpinned and can append into the captured note',async()=>{
 const s=setup();
 const result=await connectHostImage(opts(s,{
  locator:{assetId:'remote'},target:s.append,adapter:provider(valid({assetId:'remote'}))
 }));
 assert.equal(result.ok,true);
 assert.equal(s.images().length,2);
 assert.deepEqual(s.images()[1].hostAsset,{namespace:'test-host',assetId:'remote'});
 assert.equal(s.images()[0].src,'/before.svg');
});

test('malformed provider outputs fail closed without any Lexical mutation',async()=>{
 const invalid=[
  null,{...valid(),assetId:'different'}, {...valid(),revisionId:'v2'},
  {...valid(),mediaType:'text/plain'},{...valid(),url:'javascript:alert(1)'},
  {...valid(),expiresAt:new Date(Date.now()-1000).toISOString()},
  {...valid(),expiresAt:'invalid'},(()=>{const {revisionId,...missing}=valid();return missing;})()
 ];
 for(const reply of invalid){
  const s=setup(),before=s.read();
  const result=await connectHostImage(opts(s,{adapter:provider(reply)}));
  assert.deepEqual(result,{ok:false,reason:'invalid'});
  assert.deepEqual(s.read(),before);
 }
});

test('stale image fingerprint, moved note or missing target cannot change contents',async()=>{
 for(const adjustment of [
  target=>({...target,expectedImage:'outdated'}),
  target=>({...target,noteId:'other-note'}),
  target=>({...target,imageKey:'not-a-node'})
 ]){
  const s=setup(),before=s.read();
  const result=await connectHostImage(opts(s,{target:adjustment(s.replacement)}));
  assert.deepEqual(result,{ok:false,reason:'stale'});
  assert.deepEqual(s.read(),before);
 }
});

test('a changed image during an outstanding provider request is not overwritten',async()=>{
 const s=setup(),before=s.read();
 let release;
 const slow={resolve:()=>new Promise(resolve=>{release=resolve;})};
 const pending=connectHostImage(opts(s,{adapter:slow}));
 await sleepTick();
 s.editor.update(()=>{
  $getNodeByKey(s.imageKey).setImagePresentation('updated locally');
 },{discrete:true});
 release(valid());
 assert.deepEqual(await pending,{ok:false,reason:'stale'});
 assert.equal(s.images()[0].alt,'updated locally');
 assert.notDeepEqual(s.read(),before);
});

test('aborted, superseded and rejected requests never write to the editor',async()=>{
 const s=setup(),before=s.read();
 let release;
 const slow={resolve:()=>new Promise(resolve=>{release=resolve;})};
 const controller=new AbortController();
 const pending=connectHostImage(opts(s,{adapter:slow,signal:controller.signal}));
 await sleepTick();
 controller.abort();release(valid());
 assert.deepEqual(await pending,{ok:false,reason:'cancelled'});
 assert.deepEqual(s.read(),before);
 const rejected=await connectHostImage(opts(s,{adapter:{resolve:async()=>{throw Error('offline');}}}));
 assert.deepEqual(rejected,{ok:false,reason:'unavailable'});
 const superseded=await connectHostImage(opts(s,{isCurrent:()=>false}));
 assert.deepEqual(superseded,{ok:false,reason:'cancelled'});
 assert.deepEqual(s.read(),before);
});

test('readonly and invalid namespace reject without changing the document',async()=>{
 const s=setup(),before=s.read();
 s.editor.setEditable(false);
 assert.deepEqual(await connectHostImage(opts(s)),{ok:false,reason:'stale'});
 s.editor.setEditable(true);
 assert.deepEqual(await connectHostImage(opts(s,{namespace:' '})),{ok:false,reason:'invalid'});
 assert.deepEqual(s.read(),before);
});
