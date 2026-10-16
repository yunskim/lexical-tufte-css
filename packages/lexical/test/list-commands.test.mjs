import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {TUFTE_NODES,$createSectionNode,registerListCommands,INSERT_TUFTE_LIST_COMMAND,APPEND_TUFTE_LIST_ITEM_COMMAND} from '../dist/index.js';

function setup(){
 const diagnostics=[];
 const editor=createHeadlessEditor({namespace:'list-command-test',nodes:TUFTE_NODES,onError(error){throw error;}});
 const dispose=registerListCommands(editor,d=>diagnostics.push(d));
 return {editor,diagnostics,dispose};
}
test('insert bullet list after selected section block and append item',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('Original paragraph');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 assert.equal(editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,'bullet'),true);
 editor.getEditorState().read(()=>{
  const section=$getRoot().getFirstChild();
  assert.deepEqual(section.getChildren().map(n=>n.getType()),['paragraph','list']);
  assert.equal(section.getFirstChild().getTextContent(),'Original paragraph');
  assert.equal(section.getLastChild().getListType(),'bullet');
  assert.equal(section.getLastChild().getChildrenSize(),1);
 });
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_LIST_ITEM_COMMAND,undefined),true);
 editor.getEditorState().read(()=>assert.equal($getRoot().getFirstChild().getLastChild().getChildrenSize(),2));
 assert.equal(diagnostics.length,0);
 dispose();
});
test('invalid list kind and missing selection leave editor state unchanged',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  $getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('Original'))));
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 assert.equal(editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,'invalid'),true);
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_LIST_ITEM_COMMAND,undefined),true);
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.equal(diagnostics.length,2);
 dispose();
});
