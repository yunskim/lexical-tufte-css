import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode,$getSelection,$isRangeSelection} from 'lexical';
import {TufteSpanNode,$createTufteSpanNode,registerInlineCommands,SET_TUFTE_SPAN_KIND_COMMAND} from '../dist/index.js';

const make=()=>createHeadlessEditor({namespace:'inline-command-test',nodes:[TufteSpanNode],onError(error){throw error;}});
test('P2.2.b existing span kind command preserves text and rejects invalid payload',()=>{
 const editor=make(),diagnostics=[];
 const unregister=registerInlineCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const text=$createTextNode('Hello Tufte');
  $getRoot().append($createParagraphNode().append($createTufteSpanNode('sans').append(text)));
  text.select(2,2);
 },{discrete:true});
 assert.equal(editor.dispatchCommand(SET_TUFTE_SPAN_KIND_COMMAND,'newthought'),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const span=$getRoot().getFirstChild().getFirstChild();
  assert.equal(span.getKind(),'newthought');
  assert.equal(span.getTextContent(),'Hello Tufte');
 });
 assert.equal(editor.dispatchCommand(SET_TUFTE_SPAN_KIND_COMMAND,'invalid'),true);
 editor.update(()=>{},{discrete:true});
 assert.ok(diagnostics.some(d=>d.code==='INVALID_SPAN_KIND'));
 editor.getEditorState().read(()=>{
  assert.equal($getRoot().getFirstChild().getFirstChild().getKind(),'newthought');
 });
 unregister();
});
test('P2.2.b span kind command rejects missing selection without changing state',()=>{
 const editor=make(),diagnostics=[];
 const unregister=registerInlineCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  $getRoot().append($createParagraphNode().append($createTufteSpanNode('numeral').append($createTextNode('123'))));
 },{discrete:true});
 editor.dispatchCommand(SET_TUFTE_SPAN_KIND_COMMAND,'danger');
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>assert.equal($getRoot().getFirstChild().getFirstChild().getKind(),'numeral'));
 assert.ok(diagnostics.some(d=>d.code==='INVALID_SPAN_SELECTION'));
 unregister();
});
