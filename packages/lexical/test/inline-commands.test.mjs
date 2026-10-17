import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$createLinkNode} from '@lexical/link';
import {$getRoot,$createParagraphNode,$createTextNode,$createRangeSelection,$setSelection} from 'lexical';
import {TufteSpanNode,$createTufteSpanNode,$createNoteNode,TUFTE_NODES,registerInlineCommands,SET_TUFTE_SPAN_KIND_COMMAND,WRAP_TUFTE_SPAN_COMMAND,UNWRAP_TUFTE_SPAN_COMMAND} from '../dist/index.js';

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

test('P2.2.b partial text wrapping creates one semantic span, preserves surrounding text and reopens JSON',()=>{
 const editor=make(),diagnostics=[];
 const dispose=registerInlineCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const text=$createTextNode('Hello Tufte world');
  $getRoot().append($createParagraphNode().append(text));
  text.select(6,11);
 },{discrete:true});
 assert.equal(editor.dispatchCommand(WRAP_TUFTE_SPAN_COMMAND,'newthought'),true);
 editor.update(()=>{},{discrete:true});
 let middleKey;
 editor.getEditorState().read(()=>{
  const paragraph=$getRoot().getFirstChild(),children=paragraph.getChildren();
  assert.deepEqual(children.map(n=>n.getType()),['text','tufte-span','text']);
  assert.deepEqual(children.map(n=>n.getTextContent()),['Hello ','Tufte',' world']);
  assert.equal(children[1].getKind(),'newthought');
  middleKey=children[1].getFirstChild().getKey();
 });
 const state=JSON.stringify(editor.getEditorState().toJSON());
 const restored=editor.parseEditorState(state);
 restored.read(()=>{
  const children=$getRoot().getFirstChild().getChildren();
  assert.equal(children[1].getKind(),'newthought');
  assert.equal(children[1].getTextContent(),'Tufte');
 });
 editor.update(()=>{
  const fragment=$getRoot().getFirstChild().getChildren()[1].getFirstChild();
  assert.equal(fragment.getKey(),middleKey);
  fragment.select(2,2);
 },{discrete:true});
 assert.equal(editor.dispatchCommand(UNWRAP_TUFTE_SPAN_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const paragraph=$getRoot().getFirstChild();
  assert.equal(paragraph.getTextContent(),'Hello Tufte world');
  assert.equal(paragraph.getChildren().some(n=>n.getType()==='tufte-span'),false);
 });
 assert.deepEqual(diagnostics,[]);
 dispose();
});

test('P2.2.b span creation rejects absent, cross-text and note selections without mutation',()=>{
 const editor=createHeadlessEditor({namespace:'inline-invalid',nodes:TUFTE_NODES,onError(error){throw error;}});
 const diagnostics=[];
 const dispose=registerInlineCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const a=$createTextNode('first'),b=$createTextNode('second').setFormat(1);
  $getRoot().append($createParagraphNode().append(a,b));
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(WRAP_TUFTE_SPAN_COMMAND,'sans');
 editor.update(()=>{},{discrete:true});
 editor.update(()=>{
  const [a,b]=$getRoot().getFirstChild().getChildren();
  const selection=$createRangeSelection();
  selection.setTextNodeRange(a,1,b,2);
  $setSelection(selection);
 },{discrete:true});
 editor.dispatchCommand(WRAP_TUFTE_SPAN_COMMAND,'danger');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 editor.update(()=>{
  const note=$createNoteNode('note-1','sidenote').append($createTextNode('memo'));
  $getRoot().getFirstChild().append(note);
  note.getFirstChild().select(0,2);
 },{discrete:true});
 const withNote=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(WRAP_TUFTE_SPAN_COMMAND,'sans');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),withNote);
 assert.ok(diagnostics.some(d=>d.code==='INVALID_SPAN_SELECTION'));
 assert.ok(diagnostics.some(d=>d.code==='UNSUPPORTED_SPAN_RANGE'));
 dispose();
});

test('P2.2.b unwrapping rejects a caret outside a Tufte span without mutation',()=>{
 const editor=make(),diagnostics=[];
 const dispose=registerInlineCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const text=$createTextNode('untouched');
  $getRoot().append($createParagraphNode().append(text));
  text.select(1,1);
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(UNWRAP_TUFTE_SPAN_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.ok(diagnostics.some(d=>d.code==='INVALID_SPAN_SELECTION'));
 dispose();
});

test('P2.2.b wrapping text inside a link preserves its URL and an adjacent note ID',()=>{
 const editor=createHeadlessEditor({namespace:'inline-link-test',nodes:TUFTE_NODES,onError(error){throw error;}});
 const diagnostics=[];
 const dispose=registerInlineCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const text=$createTextNode('linked term');
  const link=$createLinkNode('https://lexical.dev').append(text);
  const note=$createNoteNode('stable-note','sidenote').append($createTextNode('Keep me'));
  $getRoot().append($createParagraphNode().append(link,$createTextNode(' '),note));
  text.select(0,6);
 },{discrete:true});
 editor.dispatchCommand(WRAP_TUFTE_SPAN_COMMAND,'sans');
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const paragraph=$getRoot().getFirstChild();
  const link=paragraph.getFirstChild();
  assert.equal(link.getURL(),'https://lexical.dev');
  assert.equal(link.getTextContent(),'linked term');
  assert.equal(link.getFirstChild().getType(),'tufte-span');
  assert.equal(link.getFirstChild().getKind(),'sans');
  assert.equal(paragraph.getLastChild().getNoteId(),'stable-note');
 });
 editor.update(()=>{
  const text=$getRoot().getFirstChild().getFirstChild().getFirstChild().getFirstChild();
  text.select(2,2);
 },{discrete:true});
 editor.dispatchCommand(UNWRAP_TUFTE_SPAN_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const paragraph=$getRoot().getFirstChild(),link=paragraph.getFirstChild();
  assert.equal(link.getURL(),'https://lexical.dev');
  assert.equal(link.getTextContent(),'linked term');
  assert.equal(link.getChildren().some(n=>n.getType()==='tufte-span'),false);
  assert.equal(paragraph.getLastChild().getNoteId(),'stable-note');
 });
 assert.deepEqual(diagnostics,[]);
 dispose();
});

test('P2.2.b invalid wrap kind returns a diagnostic and preserves the source selection content',()=>{
 const editor=make(),diagnostics=[];
 const dispose=registerInlineCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const text=$createTextNode('unchanged');
  $getRoot().append($createParagraphNode().append(text));text.select(1,4);
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(WRAP_TUFTE_SPAN_COMMAND,'not-a-kind');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.ok(diagnostics.some(d=>d.code==='INVALID_SPAN_KIND'));
 dispose();
});
