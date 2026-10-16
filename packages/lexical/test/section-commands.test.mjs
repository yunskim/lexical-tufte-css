import {test} from 'node:test';
import assert from 'node:assert/strict';
import {$getRoot,$createParagraphNode,$createTextNode,$getSelection,UNDO_COMMAND,REDO_COMMAND} from 'lexical';
import {$createTableNode,$createTableRowNode,$createTableCellNode} from '@lexical/table';
import {$createLinkNode} from '@lexical/link';
import {createFixtureEditor} from './all-nodes-fixture.mjs';
import {registerSectionCommands,WRAP_TUFTE_ROOT_COMMAND,INSERT_TUFTE_SECTION_COMMAND,SPLIT_TUFTE_SECTION_COMMAND,MERGE_TUFTE_SECTION_COMMAND,SET_TUFTE_BLOCK_COMMAND,$createSectionNode,$createNoteNode,$createInlineImageNode,$createTufteSpanNode,$createTableLayoutNode} from '../dist/index.js';
import {registerHistory,createEmptyHistoryState} from '@lexical/history';
const json=editor=>JSON.parse(JSON.stringify(editor.getEditorState().toJSON()));
const run=(editor,command,payload)=>editor.update(()=>editor.dispatchCommand(command,payload),{discrete:true});
function setup(seed){const editor=createFixtureEditor(),diagnostics=[],unregister=registerSectionCommands(editor,d=>diagnostics.push(d));editor.update(seed,{discrete:true});return {editor,diagnostics,unregister};}
test('P2.2.a explicit root wrap preserves rich payload/identities and creates a valid section',()=>{
 const {editor}=setup(()=>{const p=$createParagraphNode().append($createTextNode('body'),$createNoteNode('same-id').append($createTextNode('note')));$getRoot().append(p);p.getFirstChild().select(2,2);});
 const children=json(editor).root.children;run(editor,WRAP_TUFTE_ROOT_COMMAND);const wrapped=json(editor);assert.deepEqual(wrapped.root.children[0].children,children);assert.equal(wrapped.root.children[0].type,'tufte-section');
 editor.getEditorState().read(()=>assert.equal($getSelection().anchor.offset,2));
});
test('P2.2.a h2/h3/paragraph conversion preserves rich text and selected offsets',()=>{
 const {editor}=setup(()=>{const text=$createTextNode('selected').setFormat(140),p=$createParagraphNode().setDirection('rtl').setFormat('right').append(text,$createLinkNode('/reference').append($createTextNode('link')),$createTufteSpanNode('sans').append($createTextNode('sans')));$getRoot().append($createSectionNode().append(p));text.select(1,5);});
 const before=json(editor).root.children[0].children[0].children;
 for(const type of ['h2','h3','paragraph']){run(editor,SET_TUFTE_BLOCK_COMMAND,type);const block=json(editor).root.children[0].children[0];assert.equal(block.type,type==='paragraph'?'paragraph':'heading');if(type!=='paragraph')assert.equal(block.tag,type);assert.equal(block.direction,'rtl');assert.equal(block.format,'right');assert.deepEqual(block.children,before);editor.getEditorState().read(()=>{assert.equal($getSelection().anchor.offset,1);assert.equal($getSelection().focus.offset,5);});}
});
test('P2.2.a add, split before current block and merge retain order, section attrs and note ID',()=>{
 const {editor}=setup(()=>{const first=$createParagraphNode().append($createTextNode('first')),second=$createParagraphNode().append($createTextNode('second'),$createNoteNode('split-id').append($createTextNode('payload')));$getRoot().append($createSectionNode().setDirection('rtl').setFormat('right').setTextFormat(8).append(first,second));second.getFirstChild().select(2,2);});
 const original=json(editor);run(editor,SPLIT_TUFTE_SECTION_COMMAND);let value=json(editor);assert.equal(value.root.children.length,2);assert.deepEqual(value.root.children.flatMap(n=>n.children),original.root.children[0].children);assert.equal(value.root.children[1].direction,'rtl');assert.equal(value.root.children[1].format,'right');assert.equal(value.root.children[1].textFormat,original.root.children[0].textFormat);
 editor.update(()=>$getRoot().getFirstChild().getFirstDescendant().select(0,0),{discrete:true});run(editor,MERGE_TUFTE_SECTION_COMMAND);assert.deepEqual(json(editor),original);
 run(editor,INSERT_TUFTE_SECTION_COMMAND);value=json(editor);assert.equal(value.root.children.length,2);assert.equal(value.root.children[1].children[0].type,'paragraph');
});
test('P2.2.a split before the first block leaves an editable paragraph instead of an empty section',()=>{
 const {editor}=setup(()=>{const text=$createTextNode('first');$getRoot().append($createSectionNode().append($createParagraphNode().append(text)));text.select(0,0);});run(editor,SPLIT_TUFTE_SECTION_COMMAND);const value=json(editor);assert.equal(value.root.children.length,2);assert.equal(value.root.children[0].children[0].type,'paragraph');assert.equal(value.root.children[1].children[0].children[0].text,'first');
});
for(const [name,command,payload,seed,code]of [
 ['note selection',INSERT_TUFTE_SECTION_COMMAND,undefined,()=>{const text=$createTextNode('note');$getRoot().append($createSectionNode().append($createParagraphNode().append($createNoteNode('keep-id').append(text))));text.select(1,1);},'INVALID_SECTION_SELECTION'],
 ['paragraph contains note',SET_TUFTE_BLOCK_COMMAND,'h2',()=>{const text=$createTextNode('body'),note=$createNoteNode('keep-id').append($createTextNode('note'));const paragraph=$createParagraphNode().append(text,note);$getRoot().append($createSectionNode().append(paragraph));text.select(1,1);},'INVALID_BLOCK_CHILD'],
 ['future block',SET_TUFTE_BLOCK_COMMAND,'h4',()=>{const text=$createTextNode('body');$getRoot().append($createSectionNode().append($createParagraphNode().append(text)));text.select(1,1);},'UNSUPPORTED_BLOCK_TYPE'],
 ['different section attrs',MERGE_TUFTE_SECTION_COMMAND,undefined,()=>{const text=$createTextNode('body');$getRoot().append($createSectionNode().append($createParagraphNode().append(text)),$createSectionNode().setDirection('rtl').append($createParagraphNode().append($createTextNode('next'))));text.select(1,1);},'SECTION_ATTRIBUTE_MISMATCH'],
 ['wrap an existing section',WRAP_TUFTE_ROOT_COMMAND,undefined,()=>{const text=$createTextNode('body');$getRoot().append($createSectionNode().append($createParagraphNode().append(text)));text.select(1,1);},'UNSUPPORTED_ROOT_WRAP'],
])test(`P2.2.a rejects ${name} without content/selection mutation`,()=>{
 const {editor,diagnostics}=setup(seed),before=json(editor);let selection;editor.getEditorState().read(()=>selection=$getSelection().clone());run(editor,command,payload);assert.deepEqual(json(editor),before);assert.equal(diagnostics.at(-1).code,code);editor.getEditorState().read(()=>{assert.equal($getSelection().anchor.key,selection.anchor.key);assert.equal($getSelection().anchor.offset,selection.anchor.offset);});
});
test('P2.2.a registered commands undo and redo through actual history',async()=>{
 const editor=createFixtureEditor(),history=createEmptyHistoryState(),unregisterHistory=registerHistory(editor,history,300),unregister=registerSectionCommands(editor);const flush=()=>new Promise(resolve=>setImmediate(resolve));
 try{editor.update(()=>{const text=$createTextNode('history');$getRoot().append($createSectionNode().append($createParagraphNode().append(text)));text.select(1,1);},{discrete:true});await flush();const original=json(editor);run(editor,SET_TUFTE_BLOCK_COMMAND,'h2');await flush();const changed=json(editor);assert.notDeepEqual(changed,original);run(editor,UNDO_COMMAND);await flush();assert.deepEqual(json(editor),original);run(editor,REDO_COMMAND);await flush();assert.deepEqual(json(editor),changed);}finally{unregister();unregisterHistory();}
});

test('P2.2.a multi-block selection is rejected atomically',()=>{
 const {editor,diagnostics}=setup(()=>{const first=$createTextNode('first'),second=$createTextNode('second');$getRoot().append($createSectionNode().append($createParagraphNode().append(first),$createParagraphNode().append(second)));first.select(0,0);$getSelection().setTextNodeRange(first,1,second,2);});const before=json(editor);run(editor,SET_TUFTE_BLOCK_COMMAND,'h2');assert.deepEqual(json(editor),before);assert.equal(diagnostics.at(-1).code,'INVALID_BLOCK_SELECTION');
});
test('P2.2.a table cell heading is rejected without changing table payload',()=>{
 const {editor,diagnostics}=setup(()=>{const text=$createTextNode('cell'),p=$createParagraphNode().append(text),cell=$createTableCellNode().append(p),row=$createTableRowNode().append(cell),table=$createTableNode().append(row);$getRoot().append($createSectionNode().append($createTableLayoutNode().append(table)));text.select(1,1);});const before=json(editor);run(editor,SET_TUFTE_BLOCK_COMMAND,'h2');assert.deepEqual(json(editor),before);assert.equal(diagnostics.at(-1).code,'INVALID_BLOCK_PARENT');
});
test('P2.2.a command unregistration removes handlers',()=>{
 const {editor,unregister}=setup(()=>{const text=$createTextNode('body');$getRoot().append($createSectionNode().append($createParagraphNode().append(text)));text.select(1,1);});unregister();let handled;editor.update(()=>handled=editor.dispatchCommand(INSERT_TUFTE_SECTION_COMMAND,undefined),{discrete:true});assert.equal(handled,false);assert.equal(json(editor).root.children.length,1);
});
