import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {registerRichText} from '@lexical/rich-text';
import {$createListNode,$createListItemNode} from '@lexical/list';
import {$getRoot,$createTextNode,KEY_BACKSPACE_COMMAND} from 'lexical';
import {TUFTE_NODES,$createSectionNode,$createMarginnoteNode,registerListCommands,registerListKeyboardCommands} from '../dist/index.js';

// Native character extension/first-item unwrap requires browser Selection APIs.
test('first-item Backspace refuses a nested payload without changing document or notes',()=>{
 const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerRichText(editor),registerListCommands(editor,d=>diagnostics.push(d)),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const text=$createTextNode('Parent');
  const child=$createListItemNode().append($createTextNode('Child'),$createMarginnoteNode('nested-note').append($createTextNode('Payload')));
  $getRoot().append($createSectionNode().append($createListNode('bullet').append($createListItemNode().append(text,$createListNode('number').append(child)))));text.selectStart();
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.dispatchCommand(KEY_BACKSPACE_COMMAND,{target:null,preventDefault(){}});editor.update(()=>{},{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);assert.equal(diagnostics.length,1);
 stops.reverse().forEach(stop=>stop());
});
for(const kind of ['bullet','number'])for(const action of ['merge','nested','unwrap'])test(`${kind} Backspace ${action} keeps both note identities and text`,()=>{
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerRichText(editor),registerListCommands(editor),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const a=$createTextNode('Alpha'),b=$createTextNode('Beta');
  const item=(text,id,payload)=>$createListItemNode().append(text,$createMarginnoteNode(id).append($createTextNode(payload)));
  const second=item(b,'second-note','AnnotationB');
  $getRoot().append($createSectionNode().append($createListNode(kind).append(item(a,'first-note','AnnotationA'),action==='nested'?$createListItemNode().append($createListNode(kind).append(second)):second)));
  if(action==='unwrap'){
   $getRoot().getFirstChild().getFirstChild().getFirstChild().setFormat('right').setDirection('rtl');a.selectStart();
  }else b.selectStart();
 },{discrete:true});
 const event={target:null,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,isComposing:false,preventDefault(){}};
 assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,event),true);editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const section=$getRoot().getFirstChild(),blocks=section.getChildren();
  if(action==='unwrap'){
   assert.deepEqual(blocks.map(n=>n.getType()),['paragraph','list']);
   assert.equal(blocks[0].getTextContent(),'AlphaAnnotationA');assert.equal(blocks[1].getTextContent(),'BetaAnnotationB');
   assert.equal(blocks[0].getFormatType(),'right');assert.equal(blocks[0].getDirection(),'rtl');
  }else{
   const list=blocks[0];assert.equal(list.getListType(),kind);
   assert.deepEqual(list.getChildren().map(n=>n.getTextContent()),action==='merge'?['AlphaAnnotationABetaAnnotationB']:['AlphaAnnotationA','BetaAnnotationB']);
   if(action==='nested')assert.ok(list.getChildren().every(n=>n.getChildren().every(c=>c.getType()!=='list')));
  }
  const json=JSON.stringify(editor.getEditorState().toJSON());
  for(const id of ['first-note','second-note'])assert.equal((json.match(new RegExp(id,'g'))||[]).length,1);
 });
 stops.reverse().forEach(stop=>stop());
});
