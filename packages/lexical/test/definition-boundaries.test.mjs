import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$getSelection,$setCompositionKey,$createParagraphNode,$createTextNode} from 'lexical';
import {TUFTE_NODES,$createSectionNode,$createDefinitionListNode,$createDefinitionTermNode,$createDefinitionDescriptionNode,$createMarginnoteNode,registerDefinitionCommands,INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,MOVE_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_LIST_COMMAND} from '../dist/index.js';
test('definition insert refuses a non-block section child atomically',()=>{
 const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});const stop=registerDefinitionCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{const text=$createTextNode('Invalid direct text');$getRoot().append($createSectionNode().append(text));text.selectEnd();},{discrete:true});
 const before=editor.getEditorState().toJSON();editor.dispatchCommand(INSERT_TUFTE_DEFINITION_LIST_COMMAND);editor.update(()=>{},{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);assert.equal(diagnostics.length,1);stop();
});
for(const mode of ['malformed','outside-section'])test(`definition append refuses ${mode} atomically`,()=>{
 const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stop=registerDefinitionCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const text=$createTextNode('Term'),term=$createDefinitionTermNode().append(text),dd=$createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Description')));
  const list=$createDefinitionListNode().append(...(mode==='malformed'?[dd,term]:[term,dd]));
  $getRoot().append(mode==='malformed'?$createSectionNode().append(list):list);text.selectEnd();
 },{discrete:true});
 const before=editor.getEditorState().toJSON();editor.dispatchCommand(APPEND_TUFTE_DEFINITION_PAIR_COMMAND);editor.update(()=>{},{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);assert.equal(diagnostics.length,1);stop();
});
for(const command of [INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,MOVE_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_LIST_COMMAND])for(const mode of ['range','composition','note'])test(`${command.type} refuses ${mode} without content/selection changes`,()=>{
 const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});const stop=registerDefinitionCommands(editor,d=>diagnostics.push(d));
 editor.update(()=>{
  const text=$createTextNode('Alpha'),noteText=$createTextNode('Note body');
  const term=t=>$createDefinitionTermNode().append(t),dd=()=> $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Description')));
  const firstDD=dd();firstDD.getFirstChild().append($createMarginnoteNode('definition-guard').append(noteText));
  $getRoot().append($createSectionNode().append($createDefinitionListNode().append(term(text),firstDD,term($createTextNode('Beta')),dd())));
  if(mode==='note')noteText.selectEnd();else text.select(0,mode==='range'?2:0);
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.update(()=>{
  const selection=$getSelection().clone();if(mode==='composition')$setCompositionKey(selection.anchor.key);
  editor.dispatchCommand(command,command===MOVE_TUFTE_DEFINITION_PAIR_COMMAND?'down':undefined);
  assert.deepEqual($getSelection(),selection);$setCompositionKey(null);
 },{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);assert.equal(diagnostics.length,1);stop();
});
