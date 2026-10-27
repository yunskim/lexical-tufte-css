import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$createListNode,$createListItemNode} from '@lexical/list';
import {registerRichText} from '@lexical/rich-text';
import {$getRoot,$getSelection,$createTextNode,$setCompositionKey,KEY_ENTER_COMMAND,KEY_BACKSPACE_COMMAND,KEY_TAB_COMMAND} from 'lexical';
import {TUFTE_NODES,$createSectionNode,$createMarginnoteNode,registerListCommands,registerListKeyboardCommands,CHANGE_TUFTE_LIST_INDENT_COMMAND} from '../dist/index.js';

const event=()=>({shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,isComposing:false,prevented:false,preventDefault(){this.prevented=true;}});
test('unsupported checklist Backspace is outside Tufte keyboard ownership',()=>{
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerListCommands(editor),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const child=$createListItemNode().append($createTextNode('Child'));
  const parent=$createListItemNode().append($createTextNode('Parent'),$createListNode('check').append(child));
  $getRoot().append($createSectionNode().append($createListNode('bullet').append(parent)));child.selectStart();
 },{discrete:true});
 const before=editor.getEditorState().toJSON(),key=event();
 assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,key),false);editor.update(()=>{},{discrete:true});
 assert.equal(key.prevented,false);assert.deepEqual(editor.getEditorState().toJSON(),before);
 stops.reverse().forEach(stop=>stop());
});
for(const kind of ['bullet','number'])test(`Backspace cannot erase mixed ${kind} parent text or its note`,()=>{
 const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerRichText(editor),registerListCommands(editor,d=>diagnostics.push(d)),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const text=$createTextNode('Child');
  const parent=$createListItemNode().append($createTextNode('Parent'),$createMarginnoteNode('backspace-parent').append($createTextNode('Annotation')),$createListNode(kind).append($createListItemNode().append(text)));
  $getRoot().append($createSectionNode().append($createListNode(kind).append(parent)));text.selectStart();
 },{discrete:true});
 const before=editor.getEditorState().toJSON(),key={...event(),target:null};
 editor.dispatchCommand(KEY_BACKSPACE_COMMAND,key);editor.update(()=>{},{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);
 assert.equal(key.prevented,true);assert.equal(diagnostics.length,1);
 stops.reverse().forEach(stop=>stop());
});
for(const kind of ['bullet','number'])for(const offset of [0,5,9])test(`native ${kind} Enter at ${offset} retains adjacent note payload exactly once`,()=>{
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerRichText(editor),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const text=$createTextNode('AlphaBeta');
  const note=$createMarginnoteNode('split-note').append($createTextNode('Annotation'));
  $getRoot().append($createSectionNode().append($createListNode(kind).append($createListItemNode().append(text,note))));
  text.select(offset,offset);
 },{discrete:true});
 editor.dispatchCommand(KEY_ENTER_COMMAND,event());editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const list=$getRoot().getFirstChild().getFirstChild();
  assert.deepEqual(list.getChildren().map(n=>n.getTextContent()),['AlphaBeta'.slice(0,offset),'AlphaBeta'.slice(offset)+'Annotation']);
  assert.equal(list.getLastChild().getLastChild().getNoteId(),'split-note');
  assert.equal((JSON.stringify(editor.getEditorState().toJSON()).match(/split-note/g)||[]).length,1);
 });
 stops.reverse().forEach(stop=>stop());
});
for(const command of [KEY_ENTER_COMMAND,KEY_BACKSPACE_COMMAND,KEY_TAB_COMMAND])for(const mode of ['note','composition'])test(`${command.type}: ${mode} preserves document and selection`,()=>{
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const text=$createTextNode('Body');
  const payload=mode==='note'?$createMarginnoteNode('guard-note').append(text):text;
  $getRoot().append($createSectionNode().append($createListNode('bullet').append($createListItemNode().append($createTextNode('First')),$createListItemNode().append(payload))));
  text.selectStart();
 },{discrete:true});
 const before=editor.getEditorState().toJSON(),key=event();
 editor.update(()=>{
  const selection=$getSelection().clone();
  if(mode==='composition')$setCompositionKey(selection.anchor.key);
  assert.equal(editor.dispatchCommand(command,key),false);assert.equal(key.prevented,false);
  assert.deepEqual($getSelection(),selection);
  $setCompositionKey(null);
 },{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);stop();
});
for(const position of [0,1,2])test(`empty nested Enter at ${position} preserves parent, siblings and ordered start`,()=>{
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const items=Array.from({length:3},(_,i)=>$createListItemNode().append(...(i===position?[]:[$createTextNode('Item'+i)])));
  const nested=$createListNode('number').setStart(7).append(...items);
  const parent=$createListItemNode().append($createTextNode('Parent'),$createMarginnoteNode('parent-note').append($createTextNode('Annotation')),nested);
  $getRoot().append($createSectionNode().append($createListNode('bullet').append(parent,$createListItemNode().append($createTextNode('Tail')))));
  items[position].selectStart();
 },{discrete:true});
 editor.dispatchCommand(KEY_ENTER_COMMAND,event());editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const outer=$getRoot().getFirstChild().getFirstChild();
  assert.equal(outer.getFirstChild().getFirstChild().getTextContent(),'Parent');
  assert.equal(outer.getFirstChild().getChildAtIndex(1).getNoteId(),'parent-note');
  assert.equal(outer.getLastChild().getTextContent(),'Tail');
  const output=JSON.stringify(editor.getEditorState().toJSON());
  for(let i=0;i<3;i++)if(i!==position)assert.match(output,new RegExp('Item'+i));
  const lastNested=outer.getChildren().flatMap(n=>n.getChildren()).filter(n=>n.getType()==='list').at(-1);
  assert.equal(lastNested.getStart(),7);
 });
 stop();
});

test('mixed-parent toolbar outdent refuses atomically and Shift+Tab keeps default navigation',()=>{
 const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerListCommands(editor,d=>diagnostics.push(d)),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const child=$createListItemNode().append($createTextNode('Child'));
  const parent=$createListItemNode().append($createTextNode('Parent'),$createListNode('bullet').append(child));
  $getRoot().append($createSectionNode().append($createListNode('bullet').append(parent)));child.selectStart();
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'outdent');editor.update(()=>{},{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);assert.equal(diagnostics.length,1);
 const key={...event(),shiftKey:true};assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,key),false);
 assert.equal(key.prevented,false);editor.update(()=>{},{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);stops.reverse().forEach(s=>s());
});

for(const kind of ['bullet','number'])for(const richFirst of [true,false])for(const offset of [0,5,9]){
 test(`real RichText and Tufte Enter ownership: ${kind}, richFirst=${richFirst}, offset=${offset}`,()=>{
  const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
  const cleanup=[registerListCommands(editor)];
  for(const register of richFirst?[registerRichText,registerListKeyboardCommands]:[registerListKeyboardCommands,registerRichText])cleanup.push(register(editor));
  editor.update(()=>{
   const text=$createTextNode('AlphaBeta');
   $getRoot().append($createSectionNode().append($createListNode(kind).append($createListItemNode().append(text))));
   text.select(offset,offset);
  },{discrete:true});
  assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND,event()),true);
  editor.update(()=>{},{discrete:true});
  const parts=['AlphaBeta'.slice(0,offset),'AlphaBeta'.slice(offset)];
  editor.getEditorState().read(()=>assert.deepEqual($getRoot().getFirstChild().getFirstChild().getChildren().map(n=>n.getTextContent()),parts));
  editor.update(()=>{
   const list=$getRoot().getFirstChild().getFirstChild();
   const note=$createMarginnoteNode('ownership-note').append($createTextNode('Annotation'));
   list.getFirstChild().append(note);
   const nested=$createListNode(kind).append($createListItemNode());
   list.getLastChild().append(nested);nested.getFirstChild().selectStart();
  },{discrete:true});
  const key=event();assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND,key),true);
  editor.update(()=>{},{discrete:true});
  assert.equal(key.prevented,true);
  editor.getEditorState().read(()=>{
   const list=$getRoot().getFirstChild().getFirstChild();
   const expected=parts[1]?[parts[0]+'Annotation',parts[1],'']:[parts[0]+'Annotation',''];
   assert.deepEqual(list.getChildren().map(n=>n.getTextContent()),expected,'An empty list-only wrapper is removed; text-bearing parents survive');
   assert.equal(list.getFirstChild().getLastChild().getNoteId(),'ownership-note');
  });
  cleanup.reverse().forEach(stop=>stop());
 });
}

test('Tab outside a root-level section delegates and preserves JSON/selection',()=>{
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerListCommands(editor),registerListKeyboardCommands(editor)];
 editor.update(()=>{
  const second=$createTextNode('Second');
  $getRoot().append($createListNode('bullet').append($createListItemNode().append($createTextNode('First')),$createListItemNode().append(second)));
  second.selectEnd();
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 const key=event();assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,key),false);
 editor.update(()=>{},{discrete:true});
 assert.equal(key.prevented,false);assert.deepEqual(editor.getEditorState().toJSON(),before);
 stops.reverse().forEach(stop=>stop());
});
