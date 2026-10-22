import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode,$createNodeSelection,$setSelection,UNDO_COMMAND,REDO_COMMAND} from 'lexical';
import {$createLinkNode} from '@lexical/link';
import {createEmptyHistoryState,registerHistory} from '@lexical/history';
import {validateDocument} from '@lexical-tufte/document';
import {renderArticle} from '../../render/dist/index.js';
import {TUFTE_NODES,$createSectionNode,$createFigureNode,$createInlineImageNode,
 $createSidenoteNode,$createMarginnoteNode,registerNoteCommands,
 SET_TUFTE_NOTE_KIND_COMMAND,REMOVE_TUFTE_NOTE_COMMAND,UPDATE_TUFTE_NOTE_IMAGE_COMMAND} from '../dist/index.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const editor=createHeadlessEditor({
  namespace:'note-commands',nodes:TUFTE_NODES,onError(error){throw error;}
 });
 const diagnostics=[];
 const dispose=registerNoteCommands(editor,d=>diagnostics.push(d));
 return {editor,diagnostics,dispose};
}
function build(editor){
 editor.update(()=>{
  const marked=$createTextNode('emphasized');
  marked.setFormat(1);
  const link=$createLinkNode('https://example.org').append($createTextNode('linked'));
  const note=$createSidenoteNode('same-id').append(marked,link,
   $createInlineImageNode('/note.png','an image'));
  const paragraph=$createParagraphNode().append(
   $createTextNode('Before '),note,$createTextNode(' after'));
  $getRoot().append($createSectionNode().append(paragraph));
  marked.select(3,3);
 },{discrete:true});
}
const documentFrom=editor=>({
 schemaVersion:1,id:'note-commands',locale:'en-US',title:'Notes',
 lexicalState:editor.getEditorState().toJSON(),assets:[]
});
const noteFrom=editor=>editor.getEditorState().toJSON()
 .root.children[0].children[0].children[1];
test('switch note kind twice without changing noteId or rich children; save and publish',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  build(editor);
  const before=noteFrom(editor);
  assert.equal(before.type,'tufte-sidenote');
  assert.deepEqual(before.children.map(n=>n.type),['text','link','tufte-inline-image']);
  assert.equal(editor.dispatchCommand(SET_TUFTE_NOTE_KIND_COMMAND,'marginnote'),true);
  editor.update(()=>{},{discrete:true});
  const after=noteFrom(editor);
  assert.equal(after.type,'tufte-marginnote');
  assert.equal(after.noteId,before.noteId);
  assert.deepEqual(after.children,before.children);
  const doc=documentFrom(editor);
  assert.equal(validateDocument(doc).ok,true);
  const html=renderArticle(doc);
  assert.equal(html.ok,true,JSON.stringify(html.diagnostics));
  assert.match(html.html,/class="marginnote"/);
  assert.match(html.html,/aria-label="Toggle margin note"/);
  assert.match(html.html,/id="tufte-13-note-commands-same-id"/);
  assert.match(html.html,/src="\/note.png" alt="an image"/);
  assert.equal(editor.dispatchCommand(SET_TUFTE_NOTE_KIND_COMMAND,'sidenote'),true);
  editor.update(()=>{},{discrete:true});
  assert.deepEqual(noteFrom(editor),before);
  assert.deepEqual(diagnostics,[]);
 }finally{dispose();}
});
test('delete removes only selected note; surrounding paragraph and publication remain valid',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  build(editor);
  assert.equal(editor.dispatchCommand(REMOVE_TUFTE_NOTE_COMMAND,undefined),true);
  editor.update(()=>{},{discrete:true});
  const children=editor.getEditorState().toJSON().root.children[0].children[0].children;
  assert.ok(children.every(node=>node.type==='text'),
   'Deleting a note must leave only surrounding text');
  assert.equal(children.map(node=>node.text).join(''),'Before  after');
  const doc=documentFrom(editor);
  assert.equal(validateDocument(doc).ok,true);
  const published=renderArticle(doc);
  assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
  assert.doesNotMatch(published.html,/margin-toggle/);
  assert.deepEqual(diagnostics,[]);
 }finally{dispose();}
});
test('invalid kinds, wrong selection and figure notes are rejected without any mutation',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  build(editor);
  const original=JSON.stringify(editor.getEditorState().toJSON().root);
  assert.equal(editor.dispatchCommand(SET_TUFTE_NOTE_KIND_COMMAND,'unsupported-kind'),true);
  editor.update(()=>{},{discrete:true});
  assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),original);
  editor.update(()=>{
   $getRoot().getFirstChild().getFirstChild().getFirstChild().selectEnd();
  },{discrete:true});
  editor.dispatchCommand(REMOVE_TUFTE_NOTE_COMMAND,undefined);
  editor.update(()=>{},{discrete:true});
  assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),original);
  editor.update(()=>{
   const figure=$createFigureNode().append(
    $createInlineImageNode('/figure.png','figure'),
    $createMarginnoteNode('figure-note').append($createTextNode('separate')))
   $getRoot().getFirstChild().append(figure);
   figure.getLastChild().getFirstChild().selectEnd();
  },{discrete:true});
  const withFigure=JSON.stringify(editor.getEditorState().toJSON().root);
  editor.dispatchCommand(SET_TUFTE_NOTE_KIND_COMMAND,'sidenote');
  editor.update(()=>{},{discrete:true});
  assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),withFigure);
  assert.deepEqual(diagnostics.map(item=>item.code),[
   'INVALID_NOTE_KIND','INVALID_NOTE_SELECTION','INVALID_NOTE_SELECTION'
  ]);
 }finally{dispose();}
});
test('separate command updates are undoable and redoable with real HistoryPlugin state',async()=>{
 const {editor,dispose}=setup(),history=createEmptyHistoryState();
 const unregister=registerHistory(editor,history,300);
 try{
  build(editor);await flush();
  const initial=noteFrom(editor);
  editor.dispatchCommand(SET_TUFTE_NOTE_KIND_COMMAND,'marginnote');
  await flush();
  assert.equal(noteFrom(editor).type,'tufte-marginnote');
  editor.dispatchCommand(UNDO_COMMAND,undefined);await flush();
  assert.deepEqual(noteFrom(editor),initial);
  editor.dispatchCommand(REDO_COMMAND,undefined);await flush();
  assert.equal(noteFrom(editor).type,'tufte-marginnote');
  editor.dispatchCommand(REMOVE_TUFTE_NOTE_COMMAND,undefined);await flush();
  assert.equal(editor.getEditorState().toJSON().root.children[0].children[0].children.length,2);
  editor.dispatchCommand(UNDO_COMMAND,undefined);await flush();
  assert.equal(noteFrom(editor).type,'tufte-marginnote');
 }finally{unregister();dispose();}
});

test('note image alt is edited without changing its URL, note ID, sibling link or format',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  build(editor);
  const before=noteFrom(editor);
  editor.dispatchCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,{alt:'a "quoted" & descriptive image'});
  editor.update(()=>{},{discrete:true});
  const after=noteFrom(editor);
  assert.equal(after.noteId,before.noteId);
  assert.deepEqual(after.children.slice(0,-1),before.children.slice(0,-1));
  assert.equal(after.children.at(-1).src,'/note.png');
  assert.equal(after.children.at(-1).alt,'a "quoted" & descriptive image');
  const doc=documentFrom(editor);
  assert.equal(validateDocument(doc).ok,true);
  const published=renderArticle(doc);
  assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
  assert.match(published.html,/alt="a &quot;quoted&quot; &amp; descriptive image"/);
  assert.deepEqual(diagnostics,[]);
 }finally{dispose();}
});
test('unmanaged note image URL update is published and does not affect note identity',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  build(editor);
  const before=noteFrom(editor);
  editor.dispatchCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,{src:'/new-image.png'});
  editor.update(()=>{},{discrete:true});
  const after=noteFrom(editor);
  assert.equal(after.noteId,before.noteId);
  assert.deepEqual(after.children.slice(0,-1),before.children.slice(0,-1));
  assert.equal(after.children.at(-1).src,'/new-image.png');
  assert.equal(after.children.at(-1).alt,'an image');
  assert.equal(validateDocument(documentFrom(editor)).ok,true);
  const result=renderArticle(documentFrom(editor));
  assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
  assert.match(result.html,/src="\/new-image.png" alt="an image"/);
  assert.deepEqual(diagnostics,[]);
 }finally{dispose();}
});
test('unsafe URL and malformed payload do not mutate note contents',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  build(editor);
  const before=JSON.stringify(editor.getEditorState().toJSON().root);
  for(const payload of [
   {src:'javascript:alert(1)'},{src:'//bad.example/image.png'},
   {alt:42},{src:'/ok.png',unrecognized:'discarded'},{}
  ]){
   editor.dispatchCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,payload);
   editor.update(()=>{},{discrete:true});
   assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),before);
  }
  assert.deepEqual(diagnostics.map(d=>d.code),[
   'INVALID_NOTE_IMAGE_PAYLOAD','INVALID_NOTE_IMAGE_PAYLOAD',
   'INVALID_NOTE_IMAGE_PAYLOAD','INVALID_NOTE_IMAGE_PAYLOAD',
   'INVALID_NOTE_IMAGE_PAYLOAD'
  ]);
 }finally{dispose();}
});
test('multiple note images require an explicit image selection',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  build(editor);
  editor.update(()=>{
   const note=$getRoot().getFirstChild().getFirstChild().getChildAtIndex(1);
   note.append($createInlineImageNode('/second.png','second'));
   note.getFirstChild().select(2,2);
  },{discrete:true});
  const before=JSON.stringify(editor.getEditorState().toJSON().root);
  editor.dispatchCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,{alt:'only second'});
  editor.update(()=>{},{discrete:true});
  assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),before);
  editor.update(()=>{
   const note=$getRoot().getFirstChild().getFirstChild().getChildAtIndex(1);
   const image=note.getLastChild(),selection=$createNodeSelection();
   selection.add(image.getKey());$setSelection(selection);
  },{discrete:true});
  editor.dispatchCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,{alt:'only second'});
  editor.update(()=>{},{discrete:true});
  const after=noteFrom(editor);
  assert.equal(after.children.at(-2).alt,'an image');
  assert.equal(after.children.at(-1).alt,'only second');
  assert.equal(after.noteId,'same-id');
  assert.equal(validateDocument(documentFrom(editor)).ok,true);
  assert.deepEqual(diagnostics.map(d=>d.code),['INVALID_NOTE_IMAGE_SELECTION']);
 }finally{dispose();}
});
test('managed and intrinsic-sized note images reject source changes but accept alt updates',()=>{
 for(const variant of ['managed','sized']){
  const {editor,diagnostics,dispose}=setup();
  try{
   build(editor);
   editor.update(()=>{
    const note=$getRoot().getFirstChild().getFirstChild().getChildAtIndex(1);
    const original=note.getLastChild();
    original.replace(variant==='managed'
     ?$createInlineImageNode('/note.png','original','image-1')
     :$createInlineImageNode('/note.png','original',undefined,640,480));
    note.getFirstChild().select(2,2);
   },{discrete:true});
   const before=JSON.stringify(editor.getEditorState().toJSON().root);
   editor.dispatchCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,{src:'/new.png'});
   editor.update(()=>{},{discrete:true});
   assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),before);
   editor.dispatchCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,{alt:'edited'});
   editor.update(()=>{},{discrete:true});
   const image=noteFrom(editor).children.at(-1);
   assert.equal(image.src,'/note.png');
   assert.equal(image.alt,'edited');
   assert.deepEqual(diagnostics.map(d=>d.code),[
    variant==='managed'?'MANAGED_NOTE_IMAGE_SOURCE':'SIZED_NOTE_IMAGE_SOURCE'
   ]);
  }finally{dispose();}
 }
});
