import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$getSelection,$createRangeSelection,$setSelection,$createTextNode,KEY_TAB_COMMAND} from 'lexical';
import {$createListNode,$createListItemNode} from '@lexical/list';
import {TUFTE_NODES,$createSectionNode,$createMarginnoteNode,registerListCommands,registerListKeyboardCommands,CHANGE_TUFTE_LIST_INDENT_COMMAND} from '../dist/index.js';
for(const kind of ['bullet','number'])for(const [depth,shift,handled,afterDepth]of [[19,false,true,20],[20,false,false,20],[20,true,true,19],[0,true,false,0]]){
 test(`${kind} Tab depth=${depth} shift=${shift}`,()=>{
  const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
  const stops=[registerListCommands(editor,d=>diagnostics.push(d)),registerListKeyboardCommands(editor)];let target;
  editor.update(()=>{
   const text=$createTextNode('Target');target=$createListItemNode().append(text,$createMarginnoteNode('depth-note').append($createTextNode('Payload')));
   let list=$createListNode(kind).append($createListItemNode().append($createTextNode('First')),target);
   for(let i=0;i<depth;i++)list=$createListNode(kind).append($createListItemNode().append($createTextNode('Parent')),$createListItemNode().append(list));
   $getRoot().append($createSectionNode().append(list));text.selectEnd();
  },{discrete:true});
  const before=editor.getEditorState().toJSON();
  const event={shiftKey:shift,prevented:false,preventDefault(){this.prevented=true;}};
  assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,event),handled);editor.update(()=>{},{discrete:true});
  assert.equal(event.prevented,handled);editor.getEditorState().read(()=>assert.equal(target.getIndent(),afterDepth));
  if(!handled){
   assert.deepEqual(editor.getEditorState().toJSON(),before);
   editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,shift?'outdent':'indent');editor.update(()=>{},{discrete:true});
   assert.deepEqual(editor.getEditorState().toJSON(),before);assert.equal(diagnostics.length,1);
  }else assert.deepEqual(diagnostics,[]);
  const json=JSON.stringify(editor.getEditorState().toJSON());assert.equal((json.match(/depth-note/g)||[]).length,1);assert.match(json,/Payload/);
  stops.reverse().forEach(s=>s());
 });
}
for(const kind of ['bullet','number'])test(`${kind} container item Tab delegates; toolbar indent diagnoses no-op`,()=>{
 const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerListCommands(editor,d=>diagnostics.push(d)),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const wrapper=$createListItemNode().append($createListNode(kind).append($createListItemNode().append($createTextNode('Child'))));
  $getRoot().append($createSectionNode().append($createListNode(kind).append($createListItemNode().append($createTextNode('First')),wrapper)));
  const selection=$createRangeSelection();selection.anchor.set(wrapper.getKey(),0,'element');selection.focus.set(wrapper.getKey(),0,'element');$setSelection(selection);
  assert.equal($getSelection().anchor.key,wrapper.getKey());
 },{discrete:true});
 const before=editor.getEditorState().toJSON(),event={prevented:false,preventDefault(){this.prevented=true;}};
 assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,event),false);editor.update(()=>{},{discrete:true});assert.equal(event.prevented,false);
 const reverse={shiftKey:true,prevented:false,preventDefault(){this.prevented=true;}};
 assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,reverse),false);editor.update(()=>{},{discrete:true});assert.equal(reverse.prevented,false);
 editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'indent');editor.update(()=>{},{discrete:true});
 assert.equal(diagnostics.length,1);assert.deepEqual(editor.getEditorState().toJSON(),before);stops.reverse().forEach(s=>s());
});
