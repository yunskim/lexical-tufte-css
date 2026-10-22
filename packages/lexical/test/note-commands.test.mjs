import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode,UNDO_COMMAND,REDO_COMMAND} from 'lexical';
import {$createLinkNode} from '@lexical/link';
import {createEmptyHistoryState,registerHistory} from '@lexical/history';
import {validateDocument} from '@lexical-tufte/document';
import {renderArticle} from '@lexical-tufte/render';
import {TUFTE_NODES,$createSectionNode,$createFigureNode,$createInlineImageNode,
 $createSidenoteNode,$createMarginnoteNode,registerNoteCommands,
 SET_TUFTE_NOTE_KIND_COMMAND,REMOVE_TUFTE_NOTE_COMMAND} from '../dist/index.js';

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
  assert.deepEqual(children.map(node=>node.type),['text','text']);
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
