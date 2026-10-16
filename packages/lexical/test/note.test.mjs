import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {LinkNode,$createLinkNode} from '@lexical/link';
import {NoteNode,InlineImageNode,$createNoteNode,$createInlineImageNode} from '../dist/index.js';
function editor(){return createHeadlessEditor({namespace:'note-test',nodes:[NoteNode,InlineImageNode,LinkNode],onError(error){throw error;}});}
test('rich inline note survives JSON restore with type, identity and body position',()=>{
 const e=editor();
 e.update(()=>{
  const bold=$createTextNode('강조').toggleFormat('bold');
  const code=$createTextNode('x + 1').toggleFormat('code');
  const link=$createLinkNode('https://lexical.dev').append($createTextNode('문서'));
  const note=$createNoteNode('persistent-id').append(bold,code,link,$createInlineImageNode('/fixture.svg','그림'));
  $getRoot().append($createParagraphNode().append($createTextNode('앞'),note,$createTextNode('뒤')));
 },{discrete:true});
 const json=e.getEditorState().toJSON();
 const next=editor();next.setEditorState(next.parseEditorState(JSON.stringify(json)));
 assert.deepEqual(next.getEditorState().toJSON(),json);
 const children=json.root.children[0].children;
 assert.equal(children[1].noteId,'persistent-id');
 assert.equal(children[1].children[3].alt,'그림');
 assert.equal(children[2].text,'뒤');
});
test('future note schema and active image URL are rejected',()=>{
 const e=editor();
 e.update(()=>{$getRoot().append($createParagraphNode().append($createNoteNode('n').append($createTextNode('내용'))));},{discrete:true});
 const json=e.getEditorState().toJSON();json.root.children[0].children[0].version=2;
 assert.throws(()=>e.parseEditorState(JSON.stringify(json)),/Unsupported/);
 e.update(()=>assert.throws(()=>InlineImageNode.importJSON({version:1,src:'javascript:alert(1)',alt:''}),/Unsupported/),{discrete:true});
});

test('image metadata and relative URL survive Lexical JSON roundtrip',()=>{
 const e=editor();
 e.update(()=>{
  $getRoot().append($createParagraphNode().append($createInlineImageNode('./images/figure.png','설명','asset-1',640,480)));
 },{discrete:true});
 const json=e.getEditorState().toJSON();
 const image=json.root.children[0].children[0];
 assert.equal(image.src,'./images/figure.png');
 assert.equal(image.assetId,'asset-1');
 assert.equal(image.width,640);
 assert.equal(image.height,480);
 const restored=editor();
 restored.setEditorState(restored.parseEditorState(JSON.stringify(json)));
 assert.deepEqual(restored.getEditorState().toJSON(),json);
});
test('image and note validation share document constraints',()=>{
 const e=editor();
 e.update(()=>{
  assert.throws(()=>$createInlineImageNode('https://user:pass@example.com/x.png','x'),/Invalid image/);
  assert.throws(()=>$createInlineImageNode('/x.png','x','bad id'),/Invalid image/);
  assert.throws(()=>$createInlineImageNode('/x.png','x',undefined,0),/Invalid image/);
  assert.throws(()=>$createNoteNode('-invalid'),/Invalid note/);
  assert.throws(()=>$createNoteNode('a'.repeat(129)),/Invalid note/);
 },{discrete:true});
});

test('shared JSON roundtrip harness: supported inline nodes',()=>{
 const cases=[
  {name:'note',build:()=>$createNoteNode('note-123').append($createTextNode('내용'))},
  {name:'image',build:()=>$createInlineImageNode('../assets/photo.png','대체 텍스트','asset-123',320,240)},
  {name:'link',build:()=>$createLinkNode('https://example.com').append($createTextNode('링크'))},
 ];
 for(const {name,build} of cases){
  const original=editor();
  original.update(()=>{$getRoot().append($createParagraphNode().append(build()));},{discrete:true});
  const json=original.getEditorState().toJSON();
  const restored=editor();
  restored.setEditorState(restored.parseEditorState(JSON.stringify(json)));
  assert.deepEqual(restored.getEditorState().toJSON(),json,name);
 }
});
