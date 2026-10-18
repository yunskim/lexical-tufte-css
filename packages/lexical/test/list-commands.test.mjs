import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode,$getNodeByKey,KEY_ENTER_COMMAND,KEY_BACKSPACE_COMMAND,KEY_TAB_COMMAND,COMMAND_PRIORITY_EDITOR} from 'lexical';
import {$createListNode,$createListItemNode} from '@lexical/list';
import {TUFTE_NODES,$createSectionNode,registerListKeyboardCommands,registerListCommands,INSERT_TUFTE_LIST_COMMAND,APPEND_TUFTE_LIST_ITEM_COMMAND,SET_TUFTE_LIST_KIND_COMMAND,CHANGE_TUFTE_LIST_INDENT_COMMAND,UNWRAP_TUFTE_LIST_COMMAND,$createNoteNode} from '../dist/index.js';

for(const [name,command]of [['Enter',KEY_ENTER_COMMAND],['Backspace',KEY_BACKSPACE_COMMAND]])test(`list ${name} boundary precedes an earlier editor-priority handler but delegates normal text`,()=>{
 const {editor,dispose}=setup();let fallback=0;
 const stopDefault=editor.registerCommand(command,()=>{fallback++;return true;},COMMAND_PRIORITY_EDITOR);
 const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const item=$createListItemNode();$getRoot().append($createSectionNode().append($createListNode('bullet').append(item)));item.selectStart();
 },{discrete:true});
 const event={shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,isComposing:false,preventDefault(){}};
 editor.dispatchCommand(command,event);editor.update(()=>{},{discrete:true});
 assert.equal(fallback,0);
 editor.getEditorState().read(()=>assert.equal($getRoot().getFirstChild().getFirstChild().getType(),'paragraph'));
 editor.update(()=>{const paragraph=$getRoot().getFirstChild().getFirstChild();paragraph.append($createTextNode('Normal'));paragraph.selectEnd();},{discrete:true});
 editor.dispatchCommand(command,event);editor.update(()=>{},{discrete:true});assert.equal(fallback,1);
 stop();stopDefault();dispose();
});

function setup(){
 const diagnostics=[];
 const editor=createHeadlessEditor({namespace:'list-command-test',nodes:TUFTE_NODES,onError(error){throw error;}});
 const dispose=registerListCommands(editor,d=>diagnostics.push(d));
 return {editor,diagnostics,dispose};
}
test('insert bullet list after selected section block and append item',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('Original paragraph');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 assert.equal(editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,'bullet'),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const section=$getRoot().getFirstChild();
  assert.deepEqual(section.getChildren().map(n=>n.getType()),['paragraph','list']);
  assert.equal(section.getFirstChild().getTextContent(),'Original paragraph');
  assert.equal(section.getLastChild().getListType(),'bullet');
  assert.equal(section.getLastChild().getChildrenSize(),1);
 });
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_LIST_ITEM_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>assert.equal($getRoot().getFirstChild().getLastChild().getChildrenSize(),2));
 assert.equal(diagnostics.length,0);
 dispose();
});
test('invalid list kind and missing selection leave editor state unchanged',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  $getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('Original'))));
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 assert.equal(editor.dispatchCommand(INSERT_TUFTE_LIST_COMMAND,'invalid'),true);
 editor.update(()=>{},{discrete:true});
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_LIST_ITEM_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.equal(diagnostics.length,2);
 dispose();
});

test('P2.2.b switch bullet/number keeps nested content, note ID and list item identity',()=>{
 const {editor,diagnostics,dispose}=setup();
 let itemKey;
 editor.update(()=>{
  const text=$createTextNode('One');
  const note=$createNoteNode('list-note-1','marginnote').append($createTextNode('Note stays'));
  const item=$createListItemNode().append(text,note);
  const other=$createListItemNode().append($createTextNode('Two'));
  const list=$createListNode('bullet').append(item,other);
  $getRoot().append($createSectionNode().append(list));
  itemKey=item.getKey();
  text.select(1,1);
 },{discrete:true});
 const original=editor.getEditorState().toJSON();
 assert.equal(editor.dispatchCommand(SET_TUFTE_LIST_KIND_COMMAND,'number'),true);
 editor.update(()=>{},{discrete:true});
 const changed=editor.getEditorState().toJSON();
 editor.getEditorState().read(()=>{
  const list=$getRoot().getFirstChild().getFirstChild();
  assert.equal(list.getListType(),'number');
  assert.equal(list.getTag(),'ol');
  assert.equal(list.getFirstChild().getKey(),itemKey);
  assert.equal(list.getFirstChild().getTextContent(),'OneNote stays');
  assert.equal(list.getFirstChild().getLastChild().getNoteId(),'list-note-1');
  assert.equal(list.getLastChild().getTextContent(),'Two');
 });
 assert.equal(changed.root.children[0].children[0].listType,'number');
 assert.deepEqual(changed.root.children[0].children[0].children.map(i=>i.children.map(n=>n.type)),[['text','tufte-note'],['text']]);
 assert.equal(editor.dispatchCommand(SET_TUFTE_LIST_KIND_COMMAND,'bullet'),true);
 editor.update(()=>{},{discrete:true});
 const reversed=editor.getEditorState().toJSON();
 assert.equal(reversed.root.children[0].children[0].listType,'bullet');
 assert.equal(reversed.root.children[0].children[0].tag,'ul');
 assert.deepEqual(reversed.root.children[0].children[0].children.map(i=>i.children),original.root.children[0].children[0].children.map(i=>i.children));
 assert.deepEqual(diagnostics,[]);
 dispose();
});

test('P2.2.b list kind command refuses missing selection and invalid kind atomically',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('Ordinary block');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.select(2,2);
 },{discrete:true});
 const initial=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(SET_TUFTE_LIST_KIND_COMMAND,'number');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),initial);
 editor.dispatchCommand(SET_TUFTE_LIST_KIND_COMMAND,'invalid');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),initial);
 assert.equal(diagnostics.length,2);
 dispose();
});

test('P2.2.b list kind converts only the nearest nested list, not the enclosing list',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const selectedText=$createTextNode('Inner');
  const nested=$createListNode('bullet').append($createListItemNode().append(selectedText));
  const outer=$createListNode('number').append($createListItemNode().append($createTextNode('Outer'),nested));
  $getRoot().append($createSectionNode().append(outer));
  selectedText.select(1,1);
 },{discrete:true});
 editor.dispatchCommand(SET_TUFTE_LIST_KIND_COMMAND,'number');
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const outer=$getRoot().getFirstChild().getFirstChild();
  assert.equal(outer.getListType(),'number');
  const nested=outer.getFirstChild().getChildren().find(n=>n.getType()==='list');
  assert.ok(nested);
  assert.equal(nested.getListType(),'number');
  assert.equal(nested.getFirstChild().getTextContent(),'Inner');
 });
 assert.deepEqual(diagnostics,[]);
 dispose();
});

test('P2.2.b structural indent/outdent keeps the same list item and note ID',()=>{
 const {editor,diagnostics,dispose}=setup();
 let itemKey;
 editor.update(()=>{
  const first=$createListItemNode().append($createTextNode('First'));
  const secondText=$createTextNode('Second');
  const second=$createListItemNode().append(secondText,$createNoteNode('nested-note','marginnote').append($createTextNode('Nested note')));
  itemKey=second.getKey();
  const list=$createListNode('bullet').append(first,second,$createListItemNode().append($createTextNode('Third')));
  $getRoot().append($createSectionNode().append(list));
  secondText.select(3,3);
 },{discrete:true});
 editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'indent');
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const item=$getNodeByKey(itemKey);
  assert.ok(item);
  assert.equal(item.getIndent(),1);
  assert.match(item.getTextContent(),/Second[\s\S]*Nested note/);
  assert.equal(item.getChildren().find(n=>n.getType()==='tufte-note')?.getNoteId(),'nested-note');
  assert.equal($getRoot().getFirstChild().getFirstChild().getTextContent().includes('Third'),true);
 });
 editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'outdent');
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const list=$getRoot().getFirstChild().getFirstChild();
  const item=$getNodeByKey(itemKey);
  assert.ok(item);
  assert.equal(item.getIndent(),0);
  assert.deepEqual(list.getChildren().map(n=>n.getTextContent().replace('Nested note','').trim()),['First','Second','Third']);
  assert.equal(item.getChildren().find(n=>n.getType()==='tufte-note')?.getNoteId(),'nested-note');
 });
 assert.deepEqual(diagnostics,[]);
 dispose();
});

test('P2.2.b indent first item and outdent top-level item are atomic rejections',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('First');
  $getRoot().append($createSectionNode().append($createListNode('bullet').append($createListItemNode().append(text))));
  text.select(2,2);
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'indent');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'outdent');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 editor.dispatchCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,'invalid');
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.equal(diagnostics.length,3);
 dispose();
});

test('P2.2.b flat list unwrap creates paragraphs at the same position without losing inline note identity',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const itemText=$createTextNode('First');
  const withNote=$createListItemNode().append(itemText,$createNoteNode('unwrap-note','sidenote').append($createTextNode('Note text')));
  const second=$createListItemNode().append($createTextNode('Second'));
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTextNode('Before')),
   $createListNode('bullet').append(withNote,second),
   $createParagraphNode().append($createTextNode('After'))
  ));
  itemText.select(2,2);
 },{discrete:true});
 editor.dispatchCommand(UNWRAP_TUFTE_LIST_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const blocks=$getRoot().getFirstChild().getChildren();
  assert.deepEqual(blocks.map(n=>n.getType()),['paragraph','paragraph','paragraph','paragraph']);
  assert.deepEqual(blocks.map(n=>n.getTextContent()),['Before','FirstNote text','Second','After']);
  assert.equal(blocks[1].getLastChild().getNoteId(),'unwrap-note');
 });
 assert.deepEqual(diagnostics,[]);
 dispose();
});

test('P2.2.b nested list unwrap rejects without changing parent list or nested content',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('Main');
  const nested=$createListNode('number').append($createListItemNode().append($createTextNode('Nested')));
  const list=$createListNode('bullet').append($createListItemNode().append(text,nested));
  $getRoot().append($createSectionNode().append(list));
  text.select(1,1);
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(UNWRAP_TUFTE_LIST_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.ok(diagnostics.some(d=>d.code==='INVALID_LIST_SELECTION'));
 dispose();
});

test('P2.2.b list unwrap rejects an ordinary paragraph without modifying a nearby list',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('Outside');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text),$createListNode('bullet').append($createListItemNode().append($createTextNode('Inside')))));
  text.select(1,1);
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 editor.dispatchCommand(UNWRAP_TUFTE_LIST_COMMAND,undefined);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 assert.ok(diagnostics.some(d=>d.code==='INVALID_LIST_SELECTION'));
 dispose();
});

test('P2.2.b Tab keyboard command edits list depth only at valid list item',()=>{
 const {editor,diagnostics,dispose}=setup();
 const stopKeyboard=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const first=$createTextNode('First'),second=$createTextNode('Second');
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTextNode('Outside')),
   $createListNode('bullet').append($createListItemNode().append(first),$createListItemNode().append(second))
  ));
  second.selectEnd();
 },{discrete:true});
 const event=(shiftKey=false)=>({shiftKey,ctrlKey:false,metaKey:false,altKey:false,isComposing:false,preventDefault(){this.prevented=true;},prevented:false});
 const indent=event();
 assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,indent),true);
 assert.equal(indent.prevented,true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const list=$getRoot().getFirstChild().getLastChild();
  assert.equal(list.getLastDescendant().getParent().getIndent(),1);
 });
 const outdent=event(true);
 assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,outdent),true);
 assert.equal(outdent.prevented,true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>assert.equal($getRoot().getFirstChild().getLastChild().getLastChild().getIndent(),0));
 assert.deepEqual(diagnostics,[]);
 stopKeyboard();dispose();
});

test('P2.2.b Tab keeps browser focus navigation on paragraph, first item and composition',()=>{
 const {editor,dispose}=setup();const stopKeyboard=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const outside=$createTextNode('Outside'),first=$createTextNode('First');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(outside),
   $createListNode('bullet').append($createListItemNode().append(first))));
  outside.selectEnd();
 },{discrete:true});
 const event=(shiftKey=false,isComposing=false)=>({shiftKey,ctrlKey:false,metaKey:false,altKey:false,isComposing,prevented:false,preventDefault(){this.prevented=true;}});
 const outside=event();
 assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,outside),false);
 assert.equal(outside.prevented,false);
 editor.update(()=>{$getRoot().getFirstChild().getLastChild().getFirstChild().selectEnd();},{discrete:true});
 const first=event();assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,first),false);assert.equal(first.prevented,false);
 const top=event(true);assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,top),false);assert.equal(top.prevented,false);
 const composing=event(false,true);assert.equal(editor.dispatchCommand(KEY_TAB_COMMAND,composing),false);assert.equal(composing.prevented,false);
 stopKeyboard();dispose();
});

test('P2.2.b Enter on final empty top-level list item exits to paragraph and preserves preceding item',()=>{
 const {editor,dispose}=setup();const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const first=$createListItemNode().append($createTextNode('Keep me'));
  const empty=$createListItemNode();
  $getRoot().append($createSectionNode().append($createListNode('bullet').append(first,empty)));
  empty.selectStart();
 },{discrete:true});
 const event={isComposing:false,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,prevented:false,preventDefault(){this.prevented=true;}};
 assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND,event),true);
 editor.update(()=>{},{discrete:true});
 assert.equal(event.prevented,true);
 editor.getEditorState().read(()=>{
  const blocks=$getRoot().getFirstChild().getChildren();
  assert.deepEqual(blocks.map(n=>n.getType()),['list','paragraph']);
  assert.equal(blocks[0].getFirstChild().getTextContent(),'Keep me');
  assert.equal(blocks[0].getChildrenSize(),1);
 });
 stop();dispose();
});

test('P2.2.b Enter on sole empty list removes empty list and retains editable paragraph',()=>{
 const {editor,dispose}=setup();const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const item=$createListItemNode();
  $getRoot().append($createSectionNode().append($createListNode('number').append(item)));
  item.selectStart();
 },{discrete:true});
 const event={isComposing:false,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,preventDefault(){}};
 assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND,event),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const blocks=$getRoot().getFirstChild().getChildren();
  assert.deepEqual(blocks.map(n=>n.getType()),['paragraph']);
 });
 stop();dispose();
});

test('P2.2.b Enter defers nonempty, nonfinal, nested and composing list items to Lexical',()=>{
 const {editor,dispose}=setup();const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const first=$createListItemNode();
  const text=$createTextNode('Nonempty');
  const second=$createListItemNode().append(text);
  $getRoot().append($createSectionNode().append($createListNode('bullet').append(first,second)));
  text.selectEnd();
 },{discrete:true});
 const event=(isComposing=false)=>({isComposing,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,prevented:false,preventDefault(){this.prevented=true;}});
 const nonempty=event();assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND,nonempty),false);assert.equal(nonempty.prevented,false);
 editor.update(()=>{$getRoot().getFirstChild().getFirstChild().getFirstChild().selectStart();},{discrete:true});
 const nonfinal=event();assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND,nonfinal),false);assert.equal(nonfinal.prevented,false);
 editor.update(()=>{$getRoot().getFirstChild().getFirstChild().getLastChild().selectStart();},{discrete:true});
 const composing=event(true);assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND,composing),false);assert.equal(composing.prevented,false);
 stop();dispose();
});

test('P2.2.b Backspace removes empty first item without changing later note payload',()=>{
 const {editor,dispose}=setup();const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const empty=$createListItemNode();
  const other=$createListItemNode().append($createTextNode('Kept'),$createNoteNode('backspace-note','marginnote').append($createTextNode('Annotation')));
  $getRoot().append($createSectionNode().append($createListNode('bullet').append(empty,other)));
  empty.selectStart();
 },{discrete:true});
 const event={isComposing:false,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,prevented:false,preventDefault(){this.prevented=true;}};
 assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,event),true);
 editor.update(()=>{},{discrete:true});
 assert.equal(event.prevented,true);
 editor.getEditorState().read(()=>{
  const list=$getRoot().getFirstChild().getFirstChild();
  assert.equal(list.getChildrenSize(),1);
  assert.equal(list.getFirstChild().getTextContent(),'KeptAnnotation');
  assert.equal(list.getFirstChild().getLastChild().getNoteId(),'backspace-note');
 });
 stop();dispose();
});

test('P2.2.b Backspace on sole empty first list item replaces list with paragraph',()=>{
 const {editor,dispose}=setup();const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const item=$createListItemNode();
  $getRoot().append($createSectionNode().append($createListNode('number').append(item)));
  item.selectStart();
 },{discrete:true});
 const event={isComposing:false,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,preventDefault(){}};
 assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,event),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>assert.deepEqual($getRoot().getFirstChild().getChildren().map(n=>n.getType()),['paragraph']));
 stop();dispose();
});

test('P2.2.b Backspace leaves nonempty and nonfirst items, IME and outside paragraph to Lexical',()=>{
 const {editor,dispose}=setup();const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const outside=$createTextNode('Outside');
  const first=$createTextNode('First');
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append(outside),
   $createListNode('bullet').append($createListItemNode().append(first),$createListItemNode())
  ));
  first.select(0,0);
 },{discrete:true});
 const event=(isComposing=false)=>({isComposing,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,prevented:false,preventDefault(){this.prevented=true;}});
 const nonempty=event();assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,nonempty),false);assert.equal(nonempty.prevented,false);
 editor.update(()=>{$getRoot().getFirstChild().getLastChild().getLastChild().selectStart();},{discrete:true});
 const nonfirst=event();assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,nonfirst),false);assert.equal(nonfirst.prevented,false);
 const composing=event(true);assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,composing),false);
 editor.update(()=>{$getRoot().getFirstChild().getFirstChild().selectStart();},{discrete:true});
 const outside=event();assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,outside),false);assert.equal(outside.prevented,false);
 stop();dispose();
});

test('P2.2.b nested empty item Backspace delegates to Lexical without deleting sibling notes',()=>{
 const {editor,dispose}=setup();const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const note=$createNoteNode('nested-backspace-note','marginnote').append($createTextNode('Payload'));
  const parent=$createListItemNode().append($createTextNode('Parent'),note);
  const nested=$createListNode('bullet').append($createListItemNode());
  parent.append(nested);
  $getRoot().append($createSectionNode().append($createListNode('bullet').append(parent)));
  nested.getFirstChild().selectStart();
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 const event={isComposing:false,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,prevented:false,preventDefault(){this.prevented=true;}};
 assert.equal(editor.dispatchCommand(KEY_BACKSPACE_COMMAND,event),false);
 assert.equal(event.prevented,false);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 editor.getEditorState().read(()=>{
  const parent=$getRoot().getFirstChild().getFirstChild().getFirstChild();
  assert.equal(parent.getChildren().find(n=>n.getType()==='note').getNoteId(),'nested-backspace-note');
 });
 stop();dispose();
});

test('P2.2.b nested empty item Enter delegates to Lexical without modifying parent',()=>{
 const {editor,dispose}=setup();const stop=registerListKeyboardCommands(editor);
 editor.update(()=>{
  const nested=$createListNode('number').append($createListItemNode());
  const parent=$createListItemNode().append($createTextNode('Parent'),nested);
  $getRoot().append($createSectionNode().append($createListNode('bullet').append(parent)));
  nested.getFirstChild().selectStart();
 },{discrete:true});
 const before=JSON.stringify(editor.getEditorState().toJSON());
 const event={isComposing:false,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,prevented:false,preventDefault(){this.prevented=true;}};
 assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND,event),false);
 assert.equal(event.prevented,false);
 editor.update(()=>{},{discrete:true});
 assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before);
 stop();dispose();
});
