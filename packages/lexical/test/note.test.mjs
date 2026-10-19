import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode,$getSelection} from 'lexical';
import {LinkNode,$createLinkNode} from '@lexical/link';
import {SidenoteNode,MarginnoteNode,InlineImageNode,$createSidenoteNode,$createMarginnoteNode,$createInlineImageNode,$reidentifyPastedNotes,$prepareNoteComposition,TufteSpanNode,$createTufteSpanNode,$insertNotePhrasing} from '../dist/index.js';
function editor(){return createHeadlessEditor({namespace:'note-test',nodes:[SidenoteNode,MarginnoteNode,InlineImageNode,LinkNode,TufteSpanNode],onError(error){throw error;}});}
test('rich inline note survives JSON restore with type, identity and body position',()=>{
 const e=editor();
 e.update(()=>{
  const bold=$createTextNode('강조').toggleFormat('bold');
  const code=$createTextNode('x + 1').toggleFormat('code');
  const link=$createLinkNode('https://lexical.dev').append($createTextNode('문서'));
  const note=$createSidenoteNode('persistent-id').append(bold,code,link,$createInlineImageNode('/fixture.svg','그림'));
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
 e.update(()=>{$getRoot().append($createParagraphNode().append($createSidenoteNode('n').append($createTextNode('내용'))));},{discrete:true});
 const json=e.getEditorState().toJSON();json.root.children[0].children[0].version=2;
 assert.throws(()=>e.parseEditorState(JSON.stringify(json)),/Unsupported/);
 e.update(()=>assert.throws(()=>InlineImageNode.importJSON({version:1,src:'javascript:alert(1)',alt:''}),/Unsupported|Invalid/),{discrete:true});
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
  assert.throws(()=>$createSidenoteNode('-invalid'),/Invalid note/);
  assert.throws(()=>$createSidenoteNode('a'.repeat(129)),/Invalid note/);
 },{discrete:true});
});

test('shared JSON roundtrip harness: supported inline nodes',()=>{
 const cases=[
  {name:'note',build:()=>$createSidenoteNode('note-123').append($createTextNode('내용'))},
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

test('clipboard note IDs are unique across pasted duplicates and existing document',()=>{
 const e=editor();
 e.update(()=>{
  $getRoot().append($createParagraphNode().append($createSidenoteNode('existing').append($createTextNode('원본'))));
  const a=$createSidenoteNode('existing').append($createTextNode('복사1'));
  const b=$createSidenoteNode('existing').append($createTextNode('복사2'));
  const values=['new-1','new-1','new-2'];
  const changed=$reidentifyPastedNotes([a,b],new Set(),()=>values.shift()??'fallback');
  assert.equal(a.getNoteId(),'new-1');
  assert.equal(b.getNoteId(),'new-2');
  assert.deepEqual(changed.get('existing'),['new-1','new-2']);
 },{discrete:true});
});
test('IME preparation is a no-op without a collapsed note selection',()=>{
 const e=editor();
 e.update(()=>{
  $getRoot().append($createParagraphNode().append($createTextNode('본문')));
  assert.equal($prepareNoteComposition(),false);
 },{discrete:true});
});

test('cut payload with duplicate note IDs retains at most one identity',()=>{
 const e=editor();
 e.update(()=>{
  const a=$createSidenoteNode('moved').append($createTextNode('첫째'));
  const b=$createSidenoteNode('moved').append($createTextNode('둘째'));
  const ids=['replacement'];
  const changes=$reidentifyPastedNotes([a,b],new Set(['moved']),()=>ids.shift()??'other');
  assert.equal(a.getNoteId(),'moved');
  assert.equal(b.getNoteId(),'replacement');
  assert.deepEqual(changes.get('moved'),['replacement']);
 },{discrete:true});
});
test('clipboard helper does not mutate plain link targets when note IDs change',()=>{
 const e=editor();
 e.update(()=>{
  const note=$createSidenoteNode('note-old').append($createTextNode('노트'));
  const link=$createLinkNode('https://example.org/note-old').append($createTextNode('링크'));
  const changes=$reidentifyPastedNotes([note,link],new Set(),()=> 'note-new');
  assert.equal(note.getNoteId(),'note-new');
  assert.equal(link.getURL(),'https://example.org/note-old');
  assert.deepEqual(changes.get('note-old'),['note-new']);
 },{discrete:true});
});

test('F05 Tufte inline span kinds survive editor JSON restore',()=>{
 for(const kind of ['sans','newthought','numeral','danger']){
  const original=editor();
  original.update(()=>{
   $getRoot().append($createParagraphNode().append($createTufteSpanNode(kind).append($createTextNode('서식'))));
  },{discrete:true});
  const json=original.getEditorState().toJSON();
  const node=json.root.children[0].children[0];
  assert.equal(node.type,'tufte-span');
  assert.equal(node.kind,kind);
  const restored=editor();
  restored.setEditorState(restored.parseEditorState(JSON.stringify(json)));
  assert.deepEqual(restored.getEditorState().toJSON(),json,kind);
 }
});
test('F05 rejects unknown Tufte inline kind during import',()=>{
 const e=editor();
 e.update(()=>{
  assert.throws(()=>$createTufteSpanNode('unexpected'),/Invalid Tufte span kind/);
  assert.throws(()=>TufteSpanNode.importJSON({type:'tufte-span',version:1,kind:'unexpected',children:[]}),/Unsupported Tufte span/);
 },{discrete:true});
});

for(const backward of [false,true])test(`R10 full note payload paste retains identity and formats (${backward?'backward':'forward'})`,()=>{
 const e=editor();e.update(()=>{
  const old=$createTextNode('old payload'),note=$createMarginnoteNode('replace-payload').append(old);
  $getRoot().append($createParagraphNode().append($createTextNode('before'),note,$createTextNode('after')));
  old.select(backward?old.getTextContentSize():0,backward?0:old.getTextContentSize());
  $insertNotePhrasing($getSelection(),[$createTextNode('new payload').setFormat(140)]);
 },{discrete:true});
 const nodes=e.getEditorState().toJSON().root.children[0].children;assert.equal(nodes[1].noteId,'replace-payload');assert.equal(nodes[1].type,'tufte-marginnote');assert.equal(nodes[1].children[0].text,'new payload');assert.equal(nodes[1].children[0].format,140);assert.equal(nodes[0].text,'before');assert.equal(nodes[2].text,'after');
});
