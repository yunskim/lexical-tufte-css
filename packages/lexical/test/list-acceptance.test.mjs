import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {registerRichText} from '@lexical/rich-text';
import {$createListNode,$createListItemNode} from '@lexical/list';
import {$getRoot,$createTextNode,KEY_ENTER_COMMAND,KEY_BACKSPACE_COMMAND} from 'lexical';
import {TUFTE_NODES,$createSectionNode,$createMarginnoteNode,registerListCommands,registerListKeyboardCommands,exportCanonicalEditorState,parseCanonicalEditorState} from '../dist/index.js';
import {renderArticle} from '../../render/dist/index.js';
for(const kind of ['bullet','number'])test(`${kind} mixed nested lists preserve JSON, note and published HTML on reopen`,()=>{
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 editor.update(()=>{
  const nested=$createListNode(kind==='bullet'?'number':'bullet').append($createListItemNode().append($createTextNode('Child'),$createMarginnoteNode('mixed-note').append($createTextNode('Annotation'))));
  $getRoot().append($createSectionNode().append($createListNode(kind).append($createListItemNode().append($createTextNode('Parent')),$createListItemNode().append(nested))));
 },{discrete:true});
 const before=exportCanonicalEditorState(editor.getEditorState());
 editor.setEditorState(parseCanonicalEditorState(editor,JSON.parse(JSON.stringify(before))));editor.update(()=>{},{discrete:true});
 const after=exportCanonicalEditorState(editor.getEditorState());assert.deepEqual(after,before);
 const doc=state=>({schemaVersion:1,id:'mixed-list',locale:'ko-KR',title:'Mixed lists',assets:[],lexicalState:state});
 const a=renderArticle(doc(before)),b=renderArticle(doc(after));assert.equal(a.ok,true,JSON.stringify(a.diagnostics));assert.deepEqual(b,a);
 assert.match(a.html,/<ol/);assert.match(a.html,/<ul/);assert.match(a.html,/mixed-note/);assert.match(a.html,/Annotation/);
});
for(const kind of ['bullet','number'])for(const scenario of ['empty-first','empty-middle','merge-middle'])test(`${kind} integration ${scenario} keeps trailing item and note`,()=>{
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerRichText(editor),registerListCommands(editor),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const note=$createMarginnoteNode('matrix-note').append($createTextNode('Annotation'));
  const a=$createListItemNode(),b=$createListItemNode(),tail=$createListItemNode().append($createTextNode('Tail'));
  if(scenario!=='empty-first')a.append($createTextNode('First'),note);else b.append($createTextNode('Second'),note);
  if(scenario==='merge-middle')b.append($createTextNode('Second'));
  $getRoot().append($createSectionNode().append($createListNode(kind).append(a,b,tail)));
  (scenario==='empty-first'?a:b).selectStart();
 },{discrete:true});
 const command=scenario==='merge-middle'?KEY_BACKSPACE_COMMAND:KEY_ENTER_COMMAND;
 editor.dispatchCommand(command,{target:null,preventDefault(){}});editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const list=$getRoot().getFirstChild().getFirstChild();
  const expected=scenario==='empty-first'?['','','SecondAnnotation','Tail']:scenario==='empty-middle'?['FirstAnnotation','','','Tail']:['FirstAnnotationSecond','Tail'];
  assert.equal(list.getListType(),kind);assert.deepEqual(list.getChildren().map(n=>n.getTextContent()),expected);
  assert.equal((JSON.stringify(editor.getEditorState().toJSON()).match(/matrix-note/g)||[]).length,1);
 });
 stops.reverse().forEach(stop=>stop());
});
