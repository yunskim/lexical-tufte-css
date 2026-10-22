import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$getSelection,$isNodeSelection,$getNodeByKey,$createParagraphNode,
 $createTextNode} from 'lexical';
import {validateDocument} from '@lexical-tufte/document';
import {renderArticle} from '../../render/dist/index.js';
import {TUFTE_NODES,$createSectionNode,$createSidenoteNode,
 $createInlineImageNode,registerNoteCommands,SELECT_TUFTE_NOTE_IMAGE_COMMAND,
 UPDATE_TUFTE_NOTE_IMAGE_COMMAND,$listSelectedTufteNoteImages} from '../dist/index.js';

function setup(twoNotes=false){
 const editor=createHeadlessEditor({
  namespace:'note-image-selection',nodes:TUFTE_NODES,onError(error){throw error;}
 });
 const diagnostics=[];
 const dispose=registerNoteCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const first=$createTextNode('first');
  const note=$createSidenoteNode('note-a').append(
   first,$createInlineImageNode('/first.png','first image'),
   $createInlineImageNode('/second.png','second image')
  );
  const para=$createParagraphNode().append($createTextNode('before'),note,
   $createTextNode('after'));
  const section=$createSectionNode().append(para);
  if(twoNotes)section.append($createParagraphNode().append(
   $createSidenoteNode('note-b').append(
    $createTextNode('other'),$createInlineImageNode('/other.png','other image'))
  ));
  $getRoot().append(section);first.selectEnd();
 },{discrete:true});
 return {editor,diagnostics,dispose};
}
const choices=editor=>editor.getEditorState().read(()=>$listSelectedTufteNoteImages());
const documentFrom=editor=>({
 schemaVersion:1,id:'image-selection',locale:'en-US',title:'Notes',
 lexicalState:editor.getEditorState().toJSON(),assets:[]
});
const images=editor=>editor.getEditorState().toJSON()
 .root.children[0].children[0].children[1].children.filter(n=>n.type==='tufte-inline-image');

test('enumerate exact images in the note, select second, edit only second and publish',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  const available=choices(editor);
  assert.deepEqual(available.map(({noteId,src,alt})=>({noteId,src,alt})),[
   {noteId:'note-a',src:'/first.png',alt:'first image'},
   {noteId:'note-a',src:'/second.png',alt:'second image'}
  ]);
  const second=available[1];
  assert.equal(editor.dispatchCommand(SELECT_TUFTE_NOTE_IMAGE_COMMAND,{
   noteId:second.noteId,nodeKey:second.nodeKey
  }),true);
  editor.update(()=>{},{discrete:true});
  editor.getEditorState().read(()=>{
   const selected=$getSelection();
   assert.ok($isNodeSelection(selected));
   assert.deepEqual(selected.getNodes().map(n=>n.getKey()),[second.nodeKey]);
  });
  // Once selected, editing cannot accidentally choose the first image.
  editor.dispatchCommand(UPDATE_TUFTE_NOTE_IMAGE_COMMAND,{alt:'updated second'});
  editor.update(()=>{},{discrete:true});
  assert.deepEqual(images(editor).map(item=>[item.src,item.alt]),[
   ['/first.png','first image'],['/second.png','updated second']
  ]);
  const doc=documentFrom(editor);
  assert.equal(validateDocument(doc).ok,true);
  const published=renderArticle(doc);
  assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
  assert.match(published.html,/src="\/first.png" alt="first image"/);
  assert.match(published.html,/src="\/second.png" alt="updated second"/);
  assert.deepEqual(diagnostics,[]);
 }finally{dispose();}
});

test('stale or cross-note target cannot change selection or content',()=>{
 const {editor,diagnostics,dispose}=setup(true);
 try{
  const [first,second]=choices(editor);
  const snapshot=JSON.stringify(editor.getEditorState().toJSON().root);
  assert.equal(editor.dispatchCommand(SELECT_TUFTE_NOTE_IMAGE_COMMAND,{
   noteId:'note-b',nodeKey:second.nodeKey
  }),false,'same key with the wrong noteId is not accepted');
  assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),snapshot);
  // Move the selection to the other note, then attempt to use an old chooser key.
  editor.update(()=>{
   $getRoot().getFirstChild().getLastChild().getFirstChild().getFirstChild().selectEnd();
  },{discrete:true});
  assert.equal(editor.dispatchCommand(SELECT_TUFTE_NOTE_IMAGE_COMMAND,{
   noteId:first.noteId,nodeKey:first.nodeKey
  }),false);
  editor.update(()=>{
   $getRoot().getFirstChild().getFirstChild().getChildAtIndex(1)
    .getLastChild().remove();
   $getRoot().getFirstChild().getFirstChild().getChildAtIndex(1)
    .getFirstChild().selectEnd();
  },{discrete:true});
  assert.equal(editor.dispatchCommand(SELECT_TUFTE_NOTE_IMAGE_COMMAND,{
   noteId:second.noteId,nodeKey:second.nodeKey
  }),false,'removed image key must not resolve');
  assert.equal(JSON.stringify(editor.getEditorState().toJSON().root)
   .includes('"src":"/second.png"'),false);
  assert.deepEqual(diagnostics.map(d=>d.code),[
   'INVALID_NOTE_IMAGE_TARGET','INVALID_NOTE_IMAGE_TARGET','INVALID_NOTE_IMAGE_TARGET'
  ]);
 }finally{dispose();}
});
test('chooser refuses malformed targets and text outside notes',()=>{
 const {editor,diagnostics,dispose}=setup();
 try{
  const [first]=choices(editor);
  for(const payload of [null,{}, {noteId:'bad note',nodeKey:first.nodeKey},
   {noteId:first.noteId,nodeKey:42}, {...first,unexpected:true}
  ]){
   assert.equal(editor.dispatchCommand(SELECT_TUFTE_NOTE_IMAGE_COMMAND,payload),false);
  }
  editor.update(()=>{
   $getRoot().getFirstChild().getFirstChild().getFirstChild().selectEnd();
  },{discrete:true});
  assert.deepEqual(choices(editor),[],'outside a note has no editable candidates');
  assert.equal(editor.dispatchCommand(SELECT_TUFTE_NOTE_IMAGE_COMMAND,{
   noteId:first.noteId,nodeKey:first.nodeKey
  }),false);
  assert.deepEqual(diagnostics.map(d=>d.code),[
   'INVALID_NOTE_IMAGE_TARGET','INVALID_NOTE_IMAGE_TARGET',
   'INVALID_NOTE_IMAGE_TARGET','INVALID_NOTE_IMAGE_TARGET',
   'INVALID_NOTE_IMAGE_TARGET','INVALID_NOTE_IMAGE_TARGET'
  ]);
 }finally{dispose();}
});
