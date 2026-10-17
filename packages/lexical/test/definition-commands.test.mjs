import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {TUFTE_NODES,$createSectionNode,registerDefinitionCommands,INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,MOVE_TUFTE_DEFINITION_PAIR_COMMAND,$createDefinitionListNode,$createDefinitionTermNode,$createDefinitionDescriptionNode,$createNoteNode} from '../dist/index.js';

function setup(){
 const diagnostics=[];
 const editor=createHeadlessEditor({namespace:'definition-test',nodes:TUFTE_NODES,onError(error){throw error;}});
 const unregister=registerDefinitionCommands(editor,d=>diagnostics.push(d));
 return {editor,diagnostics,unregister};
}
test('definition list insertion and pair append preserve existing paragraph',()=>{
 const {editor,diagnostics,unregister}=setup();
 editor.update(()=>{
  const text=$createTextNode('original');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 assert.equal(editor.dispatchCommand(INSERT_TUFTE_DEFINITION_LIST_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const section=$getRoot().getFirstChild();
  assert.deepEqual(section.getChildren().map(n=>n.getType()),['paragraph','tufte-definition-list']);
  assert.deepEqual(section.getLastChild().getChildren().map(n=>n.getType()),['tufte-term','tufte-definition']);
  assert.equal(section.getFirstChild().getTextContent(),'original');
 });
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_DEFINITION_PAIR_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const list=$getRoot().getFirstChild().getLastChild();
  assert.deepEqual(list.getChildren().map(n=>n.getType()),['tufte-term','tufte-definition','tufte-term','tufte-definition']);
 });
 assert.equal(diagnostics.length,0);
 unregister();
});
test('definition commands reject missing selection without modifying document',()=>{
 const {editor,diagnostics,unregister}=setup();
 editor.update(()=>{
  $getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('original'))));
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(INSERT_TUFTE_DEFINITION_LIST_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 editor.dispatchCommand(APPEND_TUFTE_DEFINITION_PAIR_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.equal(diagnostics.length,2);
 unregister();
});

test('P2.2.b move two complete dt/dd pairs down and back keeps text and note IDs',()=>{
 const {editor,diagnostics,unregister}=setup();
 editor.update(()=>{
  const first=$createTextNode('alpha');
  const second=$createTextNode('beta');
  const list=$createDefinitionListNode().append(
   $createDefinitionTermNode().append(first),
   $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('first explanation'))),
   $createDefinitionTermNode().append(second),
   $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('second explanation'),$createNoteNode('definition-note','marginnote').append($createTextNode('reference'))))
  );
  $getRoot().append($createSectionNode().append(list));first.select(2,2);
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.dispatchCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,'down');
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const list=$getRoot().getFirstChild().getFirstChild(),children=list.getChildren();
  assert.deepEqual(children.map(n=>n.getType()),['tufte-term','tufte-definition','tufte-term','tufte-definition']);
  assert.deepEqual(children.map(n=>n.getTextContent()),['beta','second explanationreference','alpha','first explanation']);
  assert.equal(children[1].getFirstChild().getLastChild().getNoteId(),'definition-note');
 });
 editor.dispatchCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,'up');
 editor.update(()=>{},{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);
 assert.deepEqual(diagnostics,[]);
 unregister();
});

test('P2.2.b deleting selected definition pair removes only dt/dd and refuses removing final pair',()=>{
 const {editor,diagnostics,unregister}=setup();
 editor.update(()=>{
  const first=$createTextNode('A');
  $getRoot().append($createSectionNode().append($createDefinitionListNode().append(
   $createDefinitionTermNode().append(first),
   $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Definition A'))),
   $createDefinitionTermNode().append($createTextNode('B')),
   $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Definition B')))
  )));
  first.select(0,0);
 },{discrete:true});
 editor.dispatchCommand(REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const children=$getRoot().getFirstChild().getFirstChild().getChildren();
  assert.deepEqual(children.map(n=>n.getTextContent()),['B','Definition B']);
  assert.deepEqual(children.map(n=>n.getType()),['tufte-term','tufte-definition']);
 });
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.equal(diagnostics.length,1);
 unregister();
});

test('P2.2.b grouped dt dt dd is valid structure but refuses pair move/delete without mutation',()=>{
 const {editor,diagnostics,unregister}=setup();
 editor.update(()=>{
  const first=$createTextNode('Variant term');
  $getRoot().append($createSectionNode().append($createDefinitionListNode().append(
   $createDefinitionTermNode().append(first),
   $createDefinitionTermNode().append($createTextNode('Alias')),
   $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Shared definition')))
  )));
  first.select(1,1);
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,'down');
 editor.update(()=>{},{discrete:true});
 editor.dispatchCommand(REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.equal(diagnostics.length,2);
 unregister();
});

test('P2.2.b first/last definition pair move and missing selection reject without mutation',()=>{
 const {editor,diagnostics,unregister}=setup();
 editor.update(()=>{
  const first=$createTextNode('First');
  $getRoot().append($createSectionNode().append($createDefinitionListNode().append(
   $createDefinitionTermNode().append(first),
   $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('One'))),
   $createDefinitionTermNode().append($createTextNode('Last')),
   $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Two')))
  )));
  first.select(1,1);
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,'up');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 editor.dispatchCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,'invalid');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.equal(diagnostics.length,2);
 unregister();
});
