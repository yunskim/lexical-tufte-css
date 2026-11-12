import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 $getRoot,$createParagraphNode,$createTextNode,$getSelection,
 UNDO_COMMAND,REDO_COMMAND
} from 'lexical';
import {$createLinkNode} from '@lexical/link';
import {registerHistory,createEmptyHistoryState} from '@lexical/history';
import {createFixtureEditor} from './all-nodes-fixture.mjs';
import {
 $createSectionNode,$createSidenoteNode,$createMarginnoteNode,$createInlineImageNode,$createTufteHeadingNode,
 registerNoteStructureCommands,INSERT_TUFTE_NOTE_COMMAND,SPLIT_TUFTE_NOTE_COMMAND,
 MERGE_TUFTE_NOTE_COMMAND,MOVE_TUFTE_NOTE_COMMAND,exportCanonicalEditorState
} from '../dist/index.js';

const snapshot=editor=>exportCanonicalEditorState(editor.getEditorState());
const run=(editor,command,value)=>editor.update(()=>editor.dispatchCommand(command,value),{discrete:true});
const content=editor=>snapshot(editor).root.children[0].children[0].children;
const ids=editor=>content(editor).filter(node=>node.type==='tufte-sidenote'||node.type==='tufte-marginnote').map(node=>node.noteId);
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function setup(seed,createId=()=> 'fresh-'+Math.random().toString(36).slice(2)){
 const editor=createFixtureEditor(),notices=[],dispose=registerNoteStructureCommands(editor,message=>notices.push(message),createId);
 editor.update(seed,{discrete:true});
 return {editor,notices,dispose};
}

test('reusable note commands insert both note kinds and preserve host-independent IDs',()=>{
 let next=0;
 const {editor,notices,dispose}=setup(()=>{
  const text=$createTextNode('begin end');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.select(5,5);
 },()=> 'new-note-'+(++next));
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'sidenote');
 assert.deepEqual(ids(editor),['new-note-1']);
 assert.equal(content(editor).find(node=>node.noteId==='new-note-1').children[0].text,'새 노트');
 assert.match(notices.at(-1),/새 노트를 삽입했습니다/);
 editor.update(()=>{
  const paragraph=$getRoot().getFirstChild().getFirstChild();
  paragraph.getLastChild().selectEnd();
 },{discrete:true});
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'marginnote');
 assert.deepEqual(ids(editor),['new-note-1','new-note-2']);
 assert.equal(content(editor).find(node=>node.noteId==='new-note-2').type,'tufte-marginnote');
 dispose();
});

test('reusable note commands fail closed on nested, heading and noncollapsed selection',()=>{
 let used=0;
 const {editor,notices,dispose}=setup(()=>{
  const body=$createTextNode('body'),note=$createSidenoteNode('existing').append($createTextNode('note'));
  $getRoot().append($createSectionNode().append($createParagraphNode().append(body,note)));
  note.getFirstChild().select(1,1);
 },()=>{used++;return 'allocated';});
 const original=snapshot(editor);
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'sidenote');
 assert.deepEqual(snapshot(editor),original);
 assert.match(notices.at(-1),/노트 안에 노트를 넣을 수 없습니다/);
 assert.equal(used,0);
 editor.update(()=>{
  const text=$getRoot().getFirstChild().getFirstChild().getFirstChild();
  text.select(0,3);
 },{discrete:true});
 const second=snapshot(editor);
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'sidenote');
 assert.deepEqual(snapshot(editor),second);
 assert.equal(used,0);
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'bogus');
 assert.deepEqual(snapshot(editor),second);
 run(editor,MOVE_TUFTE_NOTE_COMMAND,'sideways');
 assert.deepEqual(snapshot(editor),second);
 dispose();
});

test('note insertion rejects headings, links and non-phrasing parents without allocating IDs',()=>{
 let allocations=0;
 const {editor,notices,dispose}=setup(()=>{
  const title=$createTextNode('heading'),linked=$createTextNode('linked');
  $getRoot().append($createSectionNode().append(
   $createTufteHeadingNode('h2').append(title),
   $createParagraphNode().append($createLinkNode('/reference').append(linked))
  ));
  title.select(2,2);
 },()=>{allocations++;return 'new-id';});
 const original=snapshot(editor);
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'sidenote');
 assert.deepEqual(snapshot(editor),original);
 assert.match(notices.at(-1),/이 위치에는 노트를 삽입할 수 없습니다/);
 editor.update(()=>{
  const link=$getRoot().getFirstChild().getLastChild().getFirstChild();
  link.getFirstChild().select(2,2);
 },{discrete:true});
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'marginnote');
 assert.deepEqual(snapshot(editor),original);
 assert.match(notices.at(-1),/이 위치에는 노트를 삽입할 수 없습니다/);
 assert.equal(allocations,0);
 dispose();
});

test('ID factory retries collisions and rejects an exhausted allocator without mutation',()=>{
 let count=0;
 const {editor,notices,dispose}=setup(()=>{
  const text=$createTextNode('body');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text,$createSidenoteNode('duplicate').append($createTextNode('old')))));
  text.select(2,2);
 },()=>++count===1?'duplicate':'fresh-2');
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'sidenote');
 assert.deepEqual(ids(editor),['fresh-2','duplicate']);
 const original=snapshot(editor);
 dispose();
 const reject=registerNoteStructureCommands(editor,message=>notices.push(message),()=> 'duplicate');
 editor.update(()=>{$getRoot().getFirstChild().getFirstChild().getFirstChild().select(1,1);},{discrete:true});
 run(editor,INSERT_TUFTE_NOTE_COMMAND,'sidenote');
 assert.deepEqual(snapshot(editor),original);
 assert.match(notices.at(-1),/고유한 노트 ID/);
 reject();
});

test('split and merge preserve rich link and image payload and keep first note identity',()=>{
 const {editor,notices,dispose}=setup(()=>{
  const first=$createTextNode('alpha beta');
  const note=$createSidenoteNode('original').append(first,$createLinkNode('/reference').append($createTextNode('link')),$createInlineImageNode('/image.svg','diagram'));
  $getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('body'),note,$createTextNode('tail'))));
  first.select(5,5);
 },()=> 'split-id');
 const initial=content(editor).find(node=>node.noteId==='original');
 run(editor,SPLIT_TUFTE_NOTE_COMMAND);
 assert.deepEqual(ids(editor),['original','split-id']);
 assert.match(notices.at(-1),/구조를 변경/);
 assert.equal(content(editor).filter(node=>node.type==='tufte-sidenote').flatMap(n=>n.children).filter(n=>n.type==='link').length,1);
 assert.equal(content(editor).filter(node=>node.type==='tufte-sidenote').flatMap(n=>n.children).filter(n=>n.type==='tufte-inline-image').length,1);
 editor.update(()=>{$getRoot().getFirstChild().getFirstChild().getChildAtIndex(1).getFirstChild().select(1,1);},{discrete:true});
 run(editor,MERGE_TUFTE_NOTE_COMMAND);
 assert.deepEqual(ids(editor),['original']);
 const merged=content(editor).find(node=>node.noteId==='original');
 assert.equal(merged.children.some(node=>node.type==='link'),true);
 assert.equal(merged.children.some(node=>node.type==='tufte-inline-image'),true);
 assert.equal(merged.children.map(n=>n.text??'').join('').includes('alpha beta'),true);
 assert.deepEqual(merged.children.filter(n=>n.type==='link'),initial.children.filter(n=>n.type==='link'));
 dispose();
});

test('moving a note changes sibling order but never its identity or text',()=>{
 const {editor,dispose}=setup(()=>{
  const note=$createMarginnoteNode('move-me').append($createTextNode('payload'));
  $getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('left'),note,$createTextNode('right'))));
  note.getFirstChild().select(1,1);
 });
 const before=snapshot(editor);
 run(editor,MOVE_TUFTE_NOTE_COMMAND,'previous');
 assert.equal(content(editor)[0].noteId,'move-me');
 assert.deepEqual(ids(editor),['move-me']);
 assert.equal(content(editor)[0].children[0].text,'payload');
 run(editor,MOVE_TUFTE_NOTE_COMMAND,'next');
 assert.deepEqual(ids(editor),['move-me']);
 assert.equal(content(editor).find(node=>node.noteId==='move-me').children[0].text,'payload');
 assert.equal(content(editor).filter(node=>node.type==='text').map(node=>node.text).join(''),'leftright');
 assert.equal(before.root.children[0].children[0].children.filter(node=>node.type==='text').map(node=>node.text).join(''),'leftright');
 dispose();
});

test('split at note edge and merge mismatched kinds reject without mutation',()=>{
 const {editor,notices,dispose}=setup(()=>{
  const note=$createSidenoteNode('one').append($createTextNode('rich'));
  const other=$createMarginnoteNode('two').append($createTextNode('other'));
  $getRoot().append($createSectionNode().append($createParagraphNode().append(note,other)));
  note.getFirstChild().select(0,0);
 });
 const before=snapshot(editor);
 run(editor,SPLIT_TUFTE_NOTE_COMMAND);
 assert.deepEqual(snapshot(editor),before);
 run(editor,MERGE_TUFTE_NOTE_COMMAND);
 assert.deepEqual(snapshot(editor),before);
 assert.match(notices.at(-1),/이 위치에서 노트 구조를 변경할 수 없습니다/);
 dispose();
});

test('the note structure commands unregister cleanly',()=>{
 const {editor,dispose}=setup(()=>{
  const text=$createTextNode('body');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));text.select(1,1);
 });
 dispose();
 const before=snapshot(editor);
 let accepted=true;
 editor.update(()=>accepted=editor.dispatchCommand(INSERT_TUFTE_NOTE_COMMAND,'sidenote'),{discrete:true});
 assert.equal(accepted,false);
 assert.deepEqual(snapshot(editor),before);
});

test('structural split is undoable and redoable through Lexical history',async()=>{
 const editor=createFixtureEditor();
 const history=createEmptyHistoryState();
 const disposeHistory=registerHistory(editor,history,300);
 const dispose=registerNoteStructureCommands(editor,undefined,()=> 'split-history');
 try{
  editor.update(()=>{
   const node=$createTextNode('abcdef');
   $getRoot().append($createSectionNode().append($createParagraphNode().append($createSidenoteNode('original').append(node))));
   node.select(3,3);
  },{discrete:true});
  await tick();
  const before=snapshot(editor);
  run(editor,SPLIT_TUFTE_NOTE_COMMAND);
  await tick();
  assert.deepEqual(ids(editor),['original','split-history']);
  const split=snapshot(editor);
  run(editor,UNDO_COMMAND);await tick();
  assert.deepEqual(snapshot(editor),before);
  run(editor,REDO_COMMAND);await tick();
  assert.deepEqual(snapshot(editor),split);
 }finally{dispose();disposeHistory();}
});
