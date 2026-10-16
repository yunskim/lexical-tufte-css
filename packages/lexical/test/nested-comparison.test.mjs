import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createHeadlessEditor} from '@lexical/headless';
import {createEmptyHistoryState,registerHistory} from '@lexical/history';
import {$getRoot,$createParagraphNode,$createTextNode,$getSelection,HISTORY_PUSH_TAG,UNDO_COMMAND} from 'lexical';
function make(parentEditor){return createHeadlessEditor({namespace:'comparison',parentEditor,onError(e){throw e;}});}
function write(editor,text){editor.update(()=>{$getRoot().clear().append($createParagraphNode().append($createTextNode(text)));},{discrete:true,tag:HISTORY_PUSH_TAG});}
function text(editor){return editor.getEditorState().read(()=>$getRoot().getTextContent());}
test('nested state is independent: child writes do not dirty or select the parent',()=>{
 const parent=make(),child=make(parent);write(parent,'body');write(child,'note');
 const before=parent.getEditorState().toJSON();let parentUpdates=0;
 const stop=parent.registerUpdateListener(()=>parentUpdates++);
 write(child,'changed note');
 child.update(()=>{$getRoot().getFirstDescendant().select(2,2);},{discrete:true});
 assert.equal(parentUpdates,0);assert.deepEqual(parent.getEditorState().toJSON(),before);
 assert.equal(text(child),'changed note');
 assert.equal(parent.getEditorState().read(()=>$getSelection()),null);
 assert.notEqual(child.getEditorState().read(()=>$getSelection()),null);stop();
});
test('nested editors can explicitly share history across editor boundaries',async()=>{
 const parent=make(),child=make(parent),history=createEmptyHistoryState();
 const stopParent=registerHistory(parent,history,300),stopChild=registerHistory(child,history,300);
 try{
  write(parent,'body 0');write(child,'note 0');write(parent,'body 1');write(child,'note 1');
  parent.dispatchCommand(UNDO_COMMAND,undefined);await setImmediate();
  assert.equal(text(child),'note 0');assert.equal(text(parent),'body 1');
 }finally{stopParent();stopChild();}
});
