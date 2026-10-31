import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$getSelection,$setCompositionKey,$createParagraphNode,$createTextNode,UNDO_COMMAND,REDO_COMMAND} from 'lexical';
import {registerHistory,createEmptyHistoryState} from '@lexical/history';
import {TUFTE_NODES,$createSectionNode,registerQuotationCommands,INSERT_TUFTE_QUOTATION_COMMAND,APPEND_TUFTE_ATTRIBUTION_COMMAND,APPEND_TUFTE_SECTION_CITE_COMMAND,INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,$createSidenoteNode} from '../dist/index.js';

function setup(){
 const diagnostics=[];
 const editor=createHeadlessEditor({namespace:'quotation-command-test',nodes:TUFTE_NODES,onError(error){throw error;}});
 const dispose=registerQuotationCommands(editor,d=>diagnostics.push(d));
 return {editor,diagnostics,dispose};
}
test('quote insertion and attribution append preserve source paragraph',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('original');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 assert.equal(editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'quote'),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const section=$getRoot().getFirstChild();
  assert.deepEqual(section.getChildren().map(n=>n.getType()),['paragraph','quote']);
  assert.equal(section.getFirstChild().getTextContent(),'original');
 });
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 editor.getEditorState().read(()=>{
  const quote=$getRoot().getFirstChild().getLastChild();
  assert.equal(quote.getLastChild().getType(),'tufte-attribution');
  assert.equal(quote.getLastChild().getLastChild().getType(),'tufte-cite');
 });
 assert.equal(editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined),true);
 editor.update(()=>{},{discrete:true});
 assert.ok(diagnostics.some(d=>d.code==='INVALID_QUOTATION_SELECTION'));
 dispose();
});
test('epigraph and section footer use schema-defined nesting',()=>{
 for(const kind of ['epigraph','section-footer']){
  const {editor,dispose}=setup();
  editor.update(()=>{
   const text=$createTextNode('original');
   $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
   text.selectEnd();
  },{discrete:true});
  editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,kind);
 editor.update(()=>{},{discrete:true});
  editor.getEditorState().read(()=>{
   const inserted=$getRoot().getFirstChild().getLastChild();
   assert.equal(inserted.getType(),kind==='epigraph'?'tufte-epigraph':'tufte-section-footer');
   if(kind==='epigraph')assert.equal(inserted.getFirstChild().getType(),'quote');
  });
  dispose();
 }
});

test('F07 horizontal rule insertion preserves existing paragraph and serializes semantically',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('before');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined),{discrete:true});
 const serialized=editor.getEditorState().toJSON();
 const children=serialized.root.children[0].children;
 assert.deepEqual(children.map(n=>n.type),['paragraph','horizontalrule']);
 assert.equal(children[0].children[0].text,'before');
 assert.equal(diagnostics.length,0);
 dispose();
});
test('F07 horizontal rule refuses selections outside a section without mutation',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('root');
  $getRoot().append($createParagraphNode().append(text));
  text.selectEnd();
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined),{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);
 assert.equal(diagnostics.at(-1)?.code,'INVALID_QUOTATION_SELECTION');
 dispose();
});

test('F07 horizontal rule survives JSON restore and History undo/redo',async()=>{
 const {editor,diagnostics,dispose}=setup();
 const history=createEmptyHistoryState();
 const unregisterHistory=registerHistory(editor,history,300);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const run=(command)=>editor.update(()=>editor.dispatchCommand(command,undefined),{discrete:true});
 try{
  editor.update(()=>{
   const text=$createTextNode('persist');
   $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
   text.selectEnd();
  },{discrete:true});
  await flush();
  const before=editor.getEditorState().toJSON();
  run(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND);
  await flush();
  const after=editor.getEditorState().toJSON();
  assert.deepEqual(after.root.children[0].children.map(n=>n.type),['paragraph','horizontalrule']);
  const restored=createHeadlessEditor({namespace:'quotation-rule-restore',nodes:TUFTE_NODES,onError(error){throw error;}});
  restored.setEditorState(restored.parseEditorState(JSON.stringify(after)));
  await flush();
  assert.deepEqual(restored.getEditorState().toJSON(),after);
  run(UNDO_COMMAND);
  await flush();
  assert.deepEqual(editor.getEditorState().toJSON(),before);
  run(REDO_COMMAND);
  await flush();
  assert.deepEqual(editor.getEditorState().toJSON(),after);
  assert.equal(diagnostics.length,0);
 }finally{
  unregisterHistory();
  dispose();
 }
});

test('F07 rejects insertion inside a note without altering note identity or payload',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const inside=$createTextNode('protected');
  const note=$createSidenoteNode('f07-note').append(inside);
  $getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('body'),note)));
  inside.select(3,3);
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined),{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);
 assert.equal(diagnostics.at(-1)?.code,'INVALID_QUOTATION_SELECTION');
 dispose();
});
test('F07 unregister removes command handler',()=>{
 const {editor,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('body');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 dispose();
 let handled;
 editor.update(()=>{handled=editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined);},{discrete:true});
 assert.equal(handled,false);
 assert.equal(editor.getEditorState().toJSON().root.children[0].children.length,1);
});

test('F07 refuses a non-collapsed text selection without mutating the document',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('keep all text');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.select(0,4);
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined),{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);
 assert.equal(diagnostics.at(-1)?.code,'INVALID_QUOTATION_SELECTION');
 dispose();
});

test('F07 inserts into the selected section without modifying adjacent sections',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const first=$createTextNode('first');
  const second=$createTextNode('second');
  $getRoot().append(
   $createSectionNode().append($createParagraphNode().append(first)),
   $createSectionNode().append($createParagraphNode().append(second))
  );
  second.selectEnd();
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined),{discrete:true});
 const after=editor.getEditorState().toJSON();
 assert.deepEqual(after.root.children[0],before.root.children[0]);
 assert.deepEqual(after.root.children[1].children.map(n=>n.type),['paragraph','horizontalrule']);
 assert.equal(after.root.children[1].children[0].children[0].text,'second');
 assert.equal(diagnostics.length,0);
 dispose();
});

test('F09 repeated epigraph insertion preserves earlier quotation groups',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('introduction');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'epigraph'),{discrete:true});
 const first=editor.getEditorState().toJSON().root.children[0].children[1];
 assert.equal(first.type,'tufte-epigraph');
 editor.update(()=>{
  const section=$getRoot().getFirstChild();
  section.getFirstChild().selectEnd();
 },{discrete:true});
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'epigraph'),{discrete:true});
 const children=editor.getEditorState().toJSON().root.children[0].children;
 assert.deepEqual(children.map(n=>n.type),['paragraph','tufte-epigraph','tufte-epigraph']);
 assert.deepEqual(children[2],first);
 assert.equal(children[1].children[0].type,'quote');
 assert.equal(diagnostics.length,0);
 dispose();
});

test('F08 attribution command refuses duplicate cite footer without changing quotation',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('source');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'quote'),{discrete:true});
 editor.update(()=>editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined),{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.update(()=>{
  const quote=$getRoot().getFirstChild().getLastChild();
  quote.getFirstChild().selectEnd();
 },{discrete:true});
 editor.update(()=>editor.dispatchCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined),{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);
 assert.equal(diagnostics.at(-1)?.code,'INVALID_QUOTATION_SELECTION');
 dispose();
});

test('F07 section footer cite insertion is semantic and duplicate-safe',()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('body');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'section-footer'),{discrete:true});
 editor.update(()=>editor.dispatchCommand(APPEND_TUFTE_SECTION_CITE_COMMAND,undefined),{discrete:true});
 const after=editor.getEditorState().toJSON();
 const footer=after.root.children[0].children.at(-1);
 assert.equal(footer.type,'tufte-section-footer');
 assert.equal(footer.children.at(-1).type,'tufte-cite');
 editor.update(()=>editor.dispatchCommand(APPEND_TUFTE_SECTION_CITE_COMMAND,undefined),{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),after);
 assert.equal(diagnostics.at(-1)?.code,'INVALID_QUOTATION_SELECTION');
 dispose();
});

test('F07 section cite survives JSON save and reload without changing adjacent content',async()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('unchanged body');
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
 },{discrete:true});
 editor.update(()=>editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'section-footer'),{discrete:true});
 editor.update(()=>editor.dispatchCommand(APPEND_TUFTE_SECTION_CITE_COMMAND,undefined),{discrete:true});
 const saved=editor.getEditorState().toJSON();
 const children=saved.root.children[0].children;
 assert.equal(children[0].children[0].text,'unchanged body');
 assert.equal(children[1].type,'tufte-section-footer');
 assert.equal(children[1].children.at(-1).type,'tufte-cite');
 const restored=createHeadlessEditor({namespace:'section-cite-restore',nodes:TUFTE_NODES,onError(error){throw error;}});
 restored.setEditorState(restored.parseEditorState(JSON.stringify(saved)));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(restored.getEditorState().toJSON(),saved);
 assert.equal(diagnostics.length,0);
 dispose();
});

// These are guards of the existing creation commands, not acceptance of editing/removal.
for(const [command,payload] of [
 [INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,undefined],
 [INSERT_TUFTE_QUOTATION_COMMAND,'quote'],
 [INSERT_TUFTE_QUOTATION_COMMAND,'epigraph'],
 [INSERT_TUFTE_QUOTATION_COMMAND,'section-footer'],
 [APPEND_TUFTE_ATTRIBUTION_COMMAND,undefined],
 [APPEND_TUFTE_SECTION_CITE_COMMAND,undefined]
])for(const mode of ['range','composition','note'])test(`${command.type}:${payload??''} refuses ${mode} without content or selection changes`,()=>{
 const {editor,diagnostics,dispose}=setup();
 editor.update(()=>{
  const text=$createTextNode('Quotation body'),noteText=$createTextNode('Protected note');
  // Give each append command a valid target, so a missing target cannot mask the guard.
  $getRoot().append($createSectionNode().append($createParagraphNode().append(text)));
  text.selectEnd();
  if(command===APPEND_TUFTE_ATTRIBUTION_COMMAND)editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'quote');
  if(command===APPEND_TUFTE_SECTION_CITE_COMMAND)editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND,'section-footer');
  const target=$getRoot().getFirstChild().getLastChild();
  const anchor=target.getFirstChild();
  if(mode==='note')$getRoot().getFirstChild().append($createParagraphNode().append($createSidenoteNode('quotation-guard').append(noteText)));
  if(mode==='note')noteText.selectEnd();else anchor.select(0,mode==='range'?2:0);
 },{discrete:true});
 const before=editor.getEditorState().toJSON();
 editor.update(()=>{
  const selection=$getSelection().clone();
  if(mode==='composition')$setCompositionKey(selection.anchor.key);
  try{
   assert.equal(editor.dispatchCommand(command,payload),true);
   assert.deepEqual($getSelection(),selection);
  }finally{$setCompositionKey(null);}
 },{discrete:true});
 assert.deepEqual(editor.getEditorState().toJSON(),before);
 assert.equal(diagnostics.length,1);
 assert.equal(diagnostics[0].code,'INVALID_QUOTATION_SELECTION');
 dispose();
});
