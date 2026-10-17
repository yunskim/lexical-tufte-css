import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {TUFTE_NODES,$createSectionNode,registerQuotationCommands,INSERT_TUFTE_QUOTATION_COMMAND,APPEND_TUFTE_ATTRIBUTION_COMMAND,INSERT_TUFTE_HORIZONTAL_RULE_COMMAND} from '../dist/index.js';

function setup(){
 const diagnostics=[];
 const editor=createHeadlessEditor({namespace:'quotation-command-test',nodes:TUFTE_NODES,onError(error){throw error;}});
 const dispose=registerQuotationCommands(editor,d=>diagnostics.push(d));
 return {editor,diagnostics,dispose};
}
test('quote insertion and attribution append preserve source paragraph',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('original');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 assert.equal(editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'quote'),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const section=$getRoot().getFirstChild();
  assert.deepEqual(section.getChildren().map(n=>n.getType()),['paragraph','quote']);
  assert.equal(section.getFirstChild().getTextContent(),'original');
 });
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const quote=$getRoot().getFirstChild().getLastChild();
  assert.equal(quote.getLastChild().getType(),'tufte-attribution');
  assert.equal(quote.getLastChild().getLastChild().getType(),'tufte-cite');
 });
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 assert.ok(diagnostics.some(d=>d.code==='INVALID_QUOTATION_SELECTION'));
 dispose();
});
test('epigraph and section footer use schema-defined nesting',()=>{
 for(const kind of ['epigraph','section-footer']){
  const {editor,dispose}=setup();
  editor.update(()=>{
   const text=$createTextNode('original');
   $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
   text.selectEnd();
  },{discrete:true});
  editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,kind);
 editor.update(()=>{},{discrete:true});
  editor.getEditorState().read(()=>{
   const inserted=$getRoot().getFirstChild().getLastChild();
   assert.equal(inserted.getType(),kind==='epigraph'?'tufte-epigraph':'tufte-section-footer');
   if(kind==='epigraph')assert.equal(inserted.getFirstChild().getType(),'quote');
  });
  dispose();
 }
});

test('F07 horizontal rule insertion preserves existing paragraph and serializes semantically',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('before');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined),{discrete:true});
 const serialized=editor.getEditorState().toJSON();
 const children=serialized.root.children[0].children;
 assert.deepEqual(children.map(n=>n.type),['paragraph','horizontalrule']);
 assert.equal(children[0].children[0].text,'before');
 assert.equal(diagnostics.length,0);
 dispose();
});
test('F07 horizontal rule refuses selections outside a section without mutation',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('root');
  $getRoot().append($createParagraphNode().append(text));
  text.selectEnd();
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined),{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);
 assert.equal(diagnostics.at(-1)?.code,'INVALID_QUOTATION_SELECTION');
 dispose();
});
