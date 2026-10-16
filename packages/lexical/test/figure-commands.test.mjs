import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {TUFTE_NODES,$createSectionNode,registerFigureCommands,INSERT_TUFTE_FIGURE_COMMAND,SET_TUFTE_FIGURE_WIDTH_COMMAND} from '../dist/index.js';

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
 editor.dispatchCommand(SET_TUFTE_FIGURE_WIDTH_COMMAND,'fullwidth');
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
 editor.dispatchCommand(INSERT_TUFTE_FIGURE_COMMAND,{src:'/image.png',alt:'diagram',imageWidth:-1});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.deepEqual(diagnostics.map(d=>d.code),['INVALID_FIGURE_PAYLOAD','INVALID_FIGURE_PAYLOAD']);
 dispose();
});
