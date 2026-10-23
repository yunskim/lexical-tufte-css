import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode,UNDO_COMMAND,REDO_COMMAND} from 'lexical';
import {$createLinkNode} from '@lexical/link';
import {createEmptyHistoryState,registerHistory} from '@lexical/history';
import {validateDocument} from '@lexical-tufte/document';
import {renderArticle} from '../../render/dist/index.js';
import {TUFTE_NODES,$createSectionNode,$createSidenoteNode,
 $createInlineImageNode,registerNoteCommands,registerNoteAssetCommands,
 ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,DETACH_TUFTE_NOTE_IMAGE_ASSET_COMMAND,
 SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,UPDATE_TUFTE_NOTE_IMAGE_COMMAND
} from '../dist/index.js';

const ASSETS=[
 {id:'asset-a',src:'/managed-a.png',mimeType:'image/png',width:800,height:600},
 {id:'asset-b',src:'/managed-b.png',mimeType:'image/png',width:1024,height:768},
 {id:'asset-no-dimensions',src:'/vector.svg',mimeType:'image/svg+xml'}
];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(getAssets=()=>ASSETS){
 const editor=createHeadlessEditor({
  namespace:'note-asset-commands',nodes:TUFTE_NODES,onError(error){throw error;}
 });
 const diagnostics=[];
 const disposeAsset=registerNoteAssetCommands(editor,getAssets,d=>diagnostics.push(d));
 const disposeImage=registerNoteCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const emphasis=$createTextNode('important').setFormat(1);
  const link=$createLinkNode('https://example.org').append($createTextNode('reference'));
  const note=$createSidenoteNode('stable-note').append(
   emphasis,link,$createInlineImageNode('/original.png','kept alt')
  );
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTextNode('left '),note,$createTextNode(' right'))
  ));
  emphasis.selectEnd();
 },{discrete:true});
 return {editor,diagnostics,dispose(){
  disposeAsset();disposeImage();
 }};
}
const noteFrom=editor=>editor.getEditorState().toJSON()
 .root.children[0].children[0].children[1];
const imageFrom=editor=>noteFrom(editor).children.at(-1);
const docFrom=(editor,assets=ASSETS)=>({
 schemaVersion:1,id:'managed-notes',locale:'en-US',title:'Managed notes',
 lexicalState:editor.getEditorState().toJSON(),assets
});
const check=(editor,assets=ASSETS)=>{
 const doc=docFrom(editor,assets);
 const result=validateDocument(doc);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const html=renderArticle(doc);
 assert.equal(html.ok,true,JSON.stringify(html.diagnostics));
 return html.html;
};

test('atomically assign and replace managed asset: ID, URL, sizes, alt and other children',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  const before=noteFrom(editor);
  editor.dispatchCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,'asset-a');
  editor.update(()=>{},{discrete:true});
  assert.deepEqual(imageFrom(editor),{
   ...before.children.at(-1),
   src:'/managed-a.png',assetId:'asset-a',width:800,height:600
  });
  assert.deepEqual(noteFrom(editor).children.slice(0,-1),before.children.slice(0,-1));
  assert.equal(noteFrom(editor).noteId,'stable-note');
  assert.match(check(editor),/src="\/managed-a.png" alt="kept alt"/);
  editor.dispatchCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,'asset-b');
  editor.update(()=>{},{discrete:true});
  const updated=imageFrom(editor);
  assert.equal(updated.src,'/managed-b.png');
  assert.equal(updated.assetId,'asset-b');
  assert.equal(updated.width,1024);
  assert.equal(updated.height,768);
  assert.equal(updated.alt,'kept alt');
  assert.match(check(editor),/src="\/managed-b.png" alt="kept alt"/);
  assert.deepEqual(diagnostics,[]);
 }finally{dispose();}
});
test('detach is explicit: preserves visible image and metadata but clears reference',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  editor.dispatchCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,'asset-a');
  editor.update(()=>{},{discrete:true});
  const managed=imageFrom(editor);
  editor.dispatchCommand(DETACH_TUFTE_NOTE_IMAGE_ASSET_COMMAND,undefined);
  editor.update(()=>{},{discrete:true});
  const detached=imageFrom(editor);
  assert.deepEqual(detached,{...managed,assetId:undefined}.assetId===undefined
   ?Object.fromEntries(Object.entries(managed).filter(([key])=>key!=='assetId'))
   :null);
  assert.match(check(editor),/src="\/managed-a.png" alt="kept alt"/);
  assert.deepEqual(diagnostics,[]);
 }finally{dispose();}
});
test('unmanaged dimensions may be set, partially changed and explicitly cleared',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  editor.dispatchCommand(SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,{width:300,height:200});
  editor.update(()=>{},{discrete:true});
  assert.equal(imageFrom(editor).width,300);
  assert.equal(imageFrom(editor).height,200);
  editor.dispatchCommand(SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,{width:400});
  editor.update(()=>{},{discrete:true});
  assert.equal(imageFrom(editor).width,400);
  assert.equal(imageFrom(editor).height,200);
  editor.dispatchCommand(SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,{height:null});
  editor.update(()=>{},{discrete:true});
  assert.equal(imageFrom(editor).width,400);
  assert.equal(Object.hasOwn(imageFrom(editor),'height'),false);
  check(editor);
  assert.deepEqual(diagnostics,[]);
 }finally{dispose();}
});
test('managed image dimensions follow catalog; mismatches fail without mutation',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  editor.dispatchCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,'asset-a');
  editor.update(()=>{},{discrete:true});
  const before=JSON.stringify(editor.getEditorState().toJSON().root);
  for(const payload of [{width:801},{height:599},{width:-5},{height:NaN},
    {width:1.25},{width:undefined},{height:'600'},{unexpected:8},{}]){
   editor.dispatchCommand(SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,payload);
   editor.update(()=>{},{discrete:true});
   assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),before);
  }
  assert.deepEqual(diagnostics.map(d=>d.code),[
   'NOTE_ASSET_MISMATCH','NOTE_ASSET_MISMATCH',
   'INVALID_NOTE_IMAGE_DIMENSIONS','INVALID_NOTE_IMAGE_DIMENSIONS',
   'INVALID_NOTE_IMAGE_DIMENSIONS','INVALID_NOTE_IMAGE_DIMENSIONS',
   'INVALID_NOTE_IMAGE_DIMENSIONS','INVALID_NOTE_IMAGE_DIMENSIONS',
   'INVALID_NOTE_IMAGE_DIMENSIONS'
  ]);
  editor.dispatchCommand(SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,{width:null});
  editor.update(()=>{},{discrete:true});
  assert.equal(Object.hasOwn(imageFrom(editor),'width'),false,
   'Schema allows omitted image dimension even when asset declares one');
  assert.equal(imageFrom(editor).assetId,'asset-a');
  check(editor);
 }finally{dispose();}
});
test('missing assets, invalid catalog and invalid IDs do not change document',()=>{
 for(const getAssets of [()=>ASSETS,()=>[],()=>[ASSETS[0],ASSETS[0]],()=>{
  throw Error('catalog unavailable');
 },()=>[{id:'asset-a',src:'javascript:bad',mimeType:'image/png'}]]){
  const {editor,diagnostics,dispose}=setup(getAssets);
  try{
   const before=JSON.stringify(editor.getEditorState().toJSON().root);
   for(const assetId of ['invalid id','asset-absent']){
    editor.dispatchCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,assetId);
    editor.update(()=>{},{discrete:true});
    assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),before);
   }
   assert.equal(diagnostics[0]?.code,'INVALID_NOTE_ASSET_ID');
   assert.ok(['MISSING_NOTE_ASSET','INVALID_NOTE_ASSET_CATALOG'].includes(diagnostics[1]?.code));
  }finally{dispose();}
 }
});
test('managed asset without dimensions replaces stale image dimensions atomically',()=>{
 const {editor,dispose}=setup();
 try{
  editor.dispatchCommand(SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,{width:400,height:400});
  editor.update(()=>{},{discrete:true});
  editor.dispatchCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,'asset-no-dimensions');
  editor.update(()=>{},{discrete:true});
  const image=imageFrom(editor);
  assert.equal(image.src,'/vector.svg');
  assert.equal(image.assetId,'asset-no-dimensions');
  assert.equal(Object.hasOwn(image,'width'),false);
  assert.equal(Object.hasOwn(image,'height'),false);
  check(editor);
 }finally{dispose();}
});
test('managed asset assignment is one undoable history step',async()=>{
 const {editor,diagnostics,dispose}=setup();
 const unregister=registerHistory(editor,createEmptyHistoryState(),300);
 try{
  await flush();
  const before=imageFrom(editor);
  editor.dispatchCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,'asset-a');
  await flush();
  assert.equal(imageFrom(editor).assetId,'asset-a');
  editor.dispatchCommand(UNDO_COMMAND,undefined);await flush();
  assert.deepEqual(imageFrom(editor),before);
  editor.dispatchCommand(REDO_COMMAND,undefined);await flush();
  assert.equal(imageFrom(editor).assetId,'asset-a');
  assert.deepEqual(diagnostics,[]);
 }finally{unregister();dispose();}
});
test('missing catalog prevents managed dimension updates; detach retains full content',()=>{
 const assets=[ASSETS[0]];
 let available=true;
 const {editor,diagnostics,dispose}=setup(()=>available?assets:[]);
 try{
  editor.dispatchCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,'asset-a');
  editor.update(()=>{},{discrete:true});
  available=false;
  const before=JSON.stringify(editor.getEditorState().toJSON().root);
  editor.dispatchCommand(SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,{width:800});
  editor.update(()=>{},{discrete:true});
  assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),before);
  assert.deepEqual(diagnostics.map(d=>d.code),['MISSING_NOTE_ASSET']);
  editor.dispatchCommand(DETACH_TUFTE_NOTE_IMAGE_ASSET_COMMAND,undefined);
  editor.update(()=>{},{discrete:true});
  assert.equal(imageFrom(editor).assetId,undefined);
  assert.equal(imageFrom(editor).src,'/managed-a.png');
 }finally{dispose();}
});
