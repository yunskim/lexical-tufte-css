import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 $getRoot,$createParagraphNode,$createTextNode,UNDO_COMMAND,REDO_COMMAND
} from 'lexical';
import {registerHistory,createEmptyHistoryState} from '@lexical/history';
import {createFixtureEditor} from './all-nodes-fixture.mjs';
import {
 $createSectionNode,$createSidenoteNode,$createInlineImageNode,
 registerDocumentAssetCommands,CONNECT_TUFTE_DOCUMENT_ASSET_COMMAND,
 exportCanonicalEditorState
} from '../dist/index.js';

const asset={id:'local-chart',src:'/fixture.svg',mimeType:'image/svg+xml',width:320,height:240};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const snapshot=editor=>exportCanonicalEditorState(editor.getEditorState());
const image=editor=>snapshot(editor).root.children[0].children[0].children.find(child=>child.type==='tufte-sidenote').children.find(child=>child.type==='tufte-inline-image');
const run=(editor,payload)=>editor.update(()=>editor.dispatchCommand(CONNECT_TUFTE_DOCUMENT_ASSET_COMMAND,payload),{discrete:true});

function setup(hostAsset=false){
 const editor=createFixtureEditor(),notices=[];
 const catalog={current:[asset]};
 const dispose=registerDocumentAssetCommands(editor,()=>catalog.current,message=>notices.push(message));
 let key,expectedImage;
 editor.update(()=>{
  const noteImage=hostAsset?
   $createInlineImageNode('/remote.svg','original',undefined,undefined,undefined,{namespace:'test-host',assetId:'remote-image'}):
   $createInlineImageNode('/old.svg','original');
  key=noteImage.getKey();
  expectedImage=JSON.stringify(noteImage.getImageProperties());
  $getRoot().append($createSectionNode().append($createParagraphNode().append(
   $createTextNode('text'),$createSidenoteNode('note-a').append($createTextNode('caption'),noteImage)
  )));
 },{discrete:true});
 return {editor,notices,catalog,dispose,payload:{assetId:asset.id,imageKey:key,noteId:'note-a',expectedImage}};
}

test('canonical document catalog connects an image without changing note identity',()=>{
 const {editor,payload,notices,dispose}=setup();
 let applied=null;
 run(editor,{...payload,alt:'대체 텍스트',onResult:success=>{applied=success;}});
 const changed=image(editor);
 assert.equal(applied,true);
 assert.equal(changed.src,asset.src);
 assert.equal(changed.assetId,'local-chart');
 assert.equal(changed.alt,'대체 텍스트');
 assert.equal(changed.width,320);assert.equal(changed.height,240);
 assert.equal(changed.hostAsset,undefined);
 assert.match(notices.at(-1),/문서 자산을 연결했습니다/);
 dispose();
});

test('local asset replaces a host locator but preserves alt when omitted',()=>{
 const {editor,payload,dispose}=setup(true);
 run(editor,payload);
 const updated=image(editor);
 assert.equal(updated.assetId,'local-chart');
 assert.equal(updated.hostAsset,undefined);
 assert.equal(updated.alt,'original');
 assert.equal(updated.src,'/fixture.svg');
 dispose();
});

test('missing, unsafe and non-image catalog entries reject without mutation',()=>{
 const {editor,payload,catalog,dispose,notices}=setup();
 const original=snapshot(editor),results=[];
 catalog.current=[];
 run(editor,{...payload,onResult:value=>results.push(value)});
 catalog.current=[{...asset,mimeType:'text/html'}];
 run(editor,{...payload,onResult:value=>results.push(value)});
 catalog.current=[{...asset,src:'javascript:alert(1)'}];
 run(editor,{...payload,onResult:value=>results.push(value)});
 catalog.current=[{...asset,width:0}];
 run(editor,{...payload,onResult:value=>results.push(value)});
 assert.deepEqual(results,[false,false,false,false]);
 assert.deepEqual(snapshot(editor),original);
 assert.equal(notices.length,4);
 dispose();
});

test('stale image snapshot or changed note identity cannot be retargeted',()=>{
 const {editor,payload,dispose}=setup();
 const original=snapshot(editor);
 let accepted=true;
 run(editor,{...payload,noteId:'not-this-note',onResult:value=>{accepted=value;}});
 assert.equal(accepted,false);
 run(editor,{...payload,expectedImage:'stale',onResult:value=>{accepted=value;}});
 assert.equal(accepted,false);
 run(editor,{...payload,imageKey:'missing-key',onResult:value=>{accepted=value;}});
 assert.equal(accepted,false);
 assert.deepEqual(snapshot(editor),original);
 dispose();
});

test('readonly rejects host commands, and registered catalog follows changes',()=>{
 const {editor,payload,catalog,dispose,notices}=setup();
 const before=snapshot(editor);
 editor.setEditable(false);
 let applied=true;
 run(editor,{...payload,onResult:value=>{applied=value;}});
 assert.equal(applied,false);
 assert.match(notices.at(-1),/읽기 전용/);
 assert.deepEqual(snapshot(editor),before);
 editor.setEditable(true);
 catalog.current=[{...asset,src:'/latest.svg',width:400,height:300}];
 run(editor,payload);
 assert.equal(image(editor).src,'/latest.svg');
 assert.equal(image(editor).width,400);
 dispose();
});

test('unregistered document asset commands cannot mutate state',()=>{
 const {editor,payload,dispose}=setup();
 const original=snapshot(editor);
 dispose();
 let handled=true;
 editor.update(()=>{handled=editor.dispatchCommand(CONNECT_TUFTE_DOCUMENT_ASSET_COMMAND,payload);},{discrete:true});
 assert.equal(handled,false);
 assert.deepEqual(snapshot(editor),original);
});

test('document asset connection is undoable and redoable as one edit',async()=>{
 const {editor,payload,dispose}=setup();
 const history=createEmptyHistoryState(),disposeHistory=registerHistory(editor,history,300);
 try{
  await tick();
  const before=snapshot(editor);
  run(editor,payload);await tick();
  const after=snapshot(editor);
  assert.notDeepEqual(after,before);
  editor.dispatchCommand(UNDO_COMMAND,undefined);await tick();
  assert.deepEqual(snapshot(editor),before);
  editor.dispatchCommand(REDO_COMMAND,undefined);await tick();
  assert.deepEqual(snapshot(editor),after);
 }finally{dispose();disposeHistory();}
});
