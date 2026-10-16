import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {TUFTE_NODES,$createSectionNode,registerDefinitionCommands,INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND} from '../dist/index.js';

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
