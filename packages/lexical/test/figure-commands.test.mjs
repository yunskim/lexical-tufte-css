import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode,$createNodeSelection,$setSelection,$getSelection,$isRangeSelection} from 'lexical';
import {TUFTE_NODES,$createSectionNode,registerFigureCommands,INSERT_TUFTE_FIGURE_COMMAND,SET_TUFTE_FIGURE_WIDTH_COMMAND,INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,$createFigureNode,$createInlineImageNode,$createCaptionNode,$createNoteNode,$reidentifyPastedNotes} from '../dist/index.js';

function setup(){
 const diagnostics=[];
 const editor=createHeadlessEditor({namespace:'figure-command-test',nodes:TUFTE_NODES,onError(error){throw error;}});
 const dispose=registerFigureCommands(editor,d=>diagnostics.push(d));
 return {editor,diagnostics,dispose};
}
test('figure insertion preserves paragraph and image/caption properties',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('original');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 assert.equal(editor.dispatchCommand(INSERT_TUFTE_FIGURE_COMMAND,{src:'/image.png',alt:'diagram',assetId:'image_01',imageWidth:640,imageHeight:480,caption:'caption',width:'fullwidth'}),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const section=$getRoot().getFirstChild(),figure=section.getLastChild();
  assert.equal(section.getFirstChild().getTextContent(),'original');
  assert.equal(figure.getType(),'tufte-figure');
  assert.equal(figure.getWidth(),'fullwidth');
  assert.deepEqual(figure.getChildren().map(n=>n.getType()),['tufte-inline-image','tufte-caption']);
  assert.equal(figure.getFirstChild().exportJSON().alt,'diagram');
  assert.equal(figure.getFirstChild().exportJSON().assetId,'image_01');
  assert.equal(figure.getFirstChild().exportJSON().width,640);
  assert.equal(figure.getFirstChild().exportJSON().height,480);
  assert.equal(figure.getLastChild().getTextContent(),'caption');
 });
 assert.equal(diagnostics.length,0);
 dispose();
});
test('invalid figure URL and missing selection do not mutate document',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  $getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('original'))));
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(INSERT_TUFTE_FIGURE_COMMAND,{src:'javascript:alert(1)',alt:'bad'});
 editor.update(()=>{},{discrete:true});
 editor.dispatchCommand(SET_TUFTE_FIGURE_WIDTH_COMMAND,'fullwidth');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.deepEqual(diagnostics.map(d=>d.code),['INVALID_FIGURE_PAYLOAD','INVALID_FIGURE_SELECTION']);
 dispose();
});

test('invalid asset identity and image dimensions are rejected before mutation',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('original');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(INSERT_TUFTE_FIGURE_COMMAND,{src:'/image.png',alt:'diagram',assetId:'not valid'});
 editor.update(()=>{},{discrete:true});
 editor.dispatchCommand(INSERT_TUFTE_FIGURE_COMMAND,{src:'/image.png',alt:'diagram',imageWidth:-1});
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.deepEqual(diagnostics.map(d=>d.code),['INVALID_FIGURE_PAYLOAD','INVALID_FIGURE_PAYLOAD']);
 dispose();
});

test('figure marginnote is inserted before caption and rejects duplicate IDs',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const figure=$createFigureNode('body').append($createInlineImageNode('/image.png','diagram'),$createCaptionNode().append($createTextNode('caption')));
  $getRoot().append($createSectionNode().append(figure));
  const selection=$createNodeSelection();selection.add(figure.getKey());$setSelection(selection);
 },{discrete:true});
 editor.dispatchCommand(INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,{noteId:'figure-note-1',text:'margin annotation'});
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const figure=$getRoot().getFirstChild().getFirstChild();
  assert.deepEqual(figure.getChildren().map(n=>n.getType()),['tufte-inline-image','tufte-note','tufte-caption']);
  const note=figure.getChildAtIndex(1);
  assert.equal(note.getNoteId(),'figure-note-1');
  assert.equal(note.getKind(),'marginnote');
  assert.equal(note.getTextContent(),'margin annotation');
 });
 editor.update(()=>{
  const figure=$getRoot().getFirstChild().getFirstChild();
  const selection=$createNodeSelection();selection.add(figure.getKey());$setSelection(selection);
 },{discrete:true});
 editor.dispatchCommand(INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,{noteId:'figure-note-1',text:'duplicate'});
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>assert.equal($getRoot().getFirstChild().getFirstChild().getChildren().length,3));
 assert.deepEqual(diagnostics.map(d=>d.code),['DUPLICATE_NOTE_ID']);
 dispose();
});

test('clipboard note reidentification traverses notes nested inside figures',()=>{
 const {editor,dispose}=setup();
 editor.update(()=>{
  const existing=$createNoteNode('figure-note-1','marginnote').append($createTextNode('original'));
  const original=$createFigureNode().append($createInlineImageNode('/original.png','original'),existing);
  const pasted=$createFigureNode().append($createInlineImageNode('/copy.png','copy'),$createNoteNode('figure-note-1','marginnote').append($createTextNode('copied')));
  $getRoot().append($createSectionNode().append(original,pasted));
  const changes=$reidentifyPastedNotes([pasted],new Set(),()=> 'figure-note-2');
  assert.deepEqual(changes.get('figure-note-1'),['figure-note-2']);
  assert.equal(existing.getNoteId(),'figure-note-1');
  assert.equal(pasted.getLastChild().getNoteId(),'figure-note-2');
 },{discrete:true});
 dispose();
});

test('attached cut payload with colliding note IDs renews both copies',()=>{
 const {editor,dispose}=setup();
 editor.update(()=>{
  const first=$createFigureNode().append($createInlineImageNode('/a.png','a'),$createNoteNode('shared-cut','marginnote').append($createTextNode('a')));
  const second=$createFigureNode().append($createInlineImageNode('/b.png','b'),$createNoteNode('shared-cut','marginnote').append($createTextNode('b')));
  $getRoot().append($createSectionNode().append(first,second));
  let nextId=0;
  const changes=$reidentifyPastedNotes([first,second],new Set(['shared-cut']),()=> 'renewed-copy-'+(++nextId));
  assert.equal(first.getLastChild().getNoteId(),'renewed-copy-1');
  assert.equal(second.getLastChild().getNoteId(),'renewed-copy-2');
  assert.equal(changes.get('shared-cut')?.length,2);
 },{discrete:true});
 dispose();
});

test('figure marginnote update and removal preserve sibling caption',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const figure=$createFigureNode().append($createInlineImageNode('/figure.png','figure'),$createNoteNode('figure-note','marginnote').append($createTextNode('before')),$createCaptionNode().append($createTextNode('caption')));
  $getRoot().append($createSectionNode().append(figure));
  const selection=$createNodeSelection();selection.add(figure.getKey());$setSelection(selection);
 },{discrete:true});
 editor.dispatchCommand(UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,{noteId:'figure-note',text:'after'});
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const figure=$getRoot().getFirstChild().getFirstChild();
  assert.equal(figure.getChildAtIndex(1).getTextContent(),'after');
  assert.equal(figure.getLastChild().getTextContent(),'caption');
 });
 editor.update(()=>{
  const figure=$getRoot().getFirstChild().getFirstChild();
  const selection=$createNodeSelection();selection.add(figure.getKey());$setSelection(selection);
 },{discrete:true});
 editor.dispatchCommand(REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,'figure-note');
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const figure=$getRoot().getFirstChild().getFirstChild();
  assert.deepEqual(figure.getChildren().map(n=>n.getType()),['tufte-inline-image','tufte-caption']);
  assert.equal(figure.getLastChild().getTextContent(),'caption');
 });
 assert.deepEqual(diagnostics,[]);
 dispose();
});

test('figure note commands reject invalid content and missing IDs without changing figure',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const figure=$createFigureNode().append($createInlineImageNode('/figure.png','figure'),$createNoteNode('kept-note','marginnote').append($createTextNode('keep')));
  $getRoot().append($createSectionNode().append(figure));
  const selection=$createNodeSelection();selection.add(figure.getKey());$setSelection(selection);
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON().root);
 editor.dispatchCommand(UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,{noteId:'kept-note',text:'   '});
 editor.update(()=>{},{discrete:true});
 editor.dispatchCommand(UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,{noteId:'absent-note',text:'change'});
 editor.update(()=>{},{discrete:true});
 editor.dispatchCommand(REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,'absent-note');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON().root),before);
 assert.deepEqual(diagnostics.map(d=>d.code),['INVALID_FIGURE_NOTE','FIGURE_NOTE_NOT_FOUND','FIGURE_NOTE_NOT_FOUND']);
 dispose();
});

test('figure note text replacement retains a selection inside the replacement note',()=>{
 const {editor,dispose}=setup();
 editor.update(()=>{
  const figure=$createFigureNode().append($createInlineImageNode('/figure.png','figure'),$createNoteNode('selection-note','marginnote').append($createTextNode('old text')));
  $getRoot().append($createSectionNode().append(figure));
  const selection=$createNodeSelection();selection.add(figure.getKey());$setSelection(selection);
 },{discrete:true});
 editor.dispatchCommand(UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,{noteId:'selection-note',text:'replacement text'});
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const note=$getRoot().getFirstChild().getFirstChild().getLastChild();
  const selection=$getSelection();
  assert.ok($isRangeSelection(selection));
  assert.equal(note.getTextContent(),'replacement text');
  assert.equal(selection.anchor.getNode().getTextContent(),'replacement text');
  assert.equal(selection.anchor.offset,'replacement text'.length);
 });
 dispose();
});
