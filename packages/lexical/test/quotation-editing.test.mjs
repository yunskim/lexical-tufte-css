import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {registerHistory,createEmptyHistoryState} from '@lexical/history';
import {$getRoot,$getSelection,$setCompositionKey,$createParagraphNode,$createTextNode,$createNodeSelection,$setSelection,UNDO_COMMAND,REDO_COMMAND} from 'lexical';
import {$createQuoteNode} from '@lexical/rich-text';
import {$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {renderArticle} from '../../render/dist/index.js';
import {APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,TUFTE_NODES,$createSectionNode,$createEpigraphNode,$createAttributionNode,$createCiteNode,$createSectionFooterNode,$createSidenoteNode,registerQuotationCommands,SET_TUFTE_QUOTE_CITE_COMMAND,REMOVE_TUFTE_QUOTATION_COMMAND,exportCanonicalEditorState,parseCanonicalEditorState} from '../dist/index.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const snapshot=e=>exportCanonicalEditorState(e.getEditorState());
function setup(kind='quote',solo=false){
 const diagnostics=[],editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 const stop=registerQuotationCommands(editor,d=>diagnostics.push(d));
 let target,body;
 editor.update(()=>{
  body=$createTextNode('Body').toggleFormat('bold');
  const quote=$createQuoteNode().append(body,$createSidenoteNode('quote-note').append($createTextNode('Note')));
  const attribution=$createAttributionNode().append($createTextNode('Author '),$createCiteNode().append($createTextNode('Book')));
  quote.append(attribution);
  const epigraph=$createEpigraphNode().append(quote);
  const footer=$createSectionFooterNode().append($createTextNode('Footer '),$createCiteNode().append($createTextNode('Work')));
  target=kind==='epigraph'?epigraph:kind==='section-footer'?footer:kind==='horizontalrule'?$createHorizontalRuleNode():quote;
  const section=$createSectionNode();
  if(!solo)section.append($createParagraphNode().append($createTextNode('Before')));
  section.append(target);
  if(!solo)section.append($createParagraphNode().append($createTextNode('After')));
  $getRoot().append(section,$createSectionNode().append($createParagraphNode().append($createTextNode('Other section'))));
  if(kind==='horizontalrule'){const selection=$createNodeSelection();selection.add(target.getKey());$setSelection(selection);}
  else if(kind==='attribution')attribution.getFirstChild().selectEnd();
  else if(kind==='cite')attribution.getLastChild().selectEnd();
  else target.selectStart();
 },{discrete:true});
 return {editor,diagnostics,stop,target,body};
}
function run(e,c,p){e.update(()=>e.dispatchCommand(c,p),{discrete:true});}
function publish(state){const result=renderArticle({schemaVersion:1,id:'quotation-edit',locale:'ko-KR',title:'Quotation',assets:[],lexicalState:state});assert.equal(result.ok,true,JSON.stringify(result.diagnostics));return result.html;}
test('quote URL replacement retains child identity, formats, note, caret and canonical publication',async()=>{
 const {editor,diagnostics,stop,body}=setup();
 let selection;editor.getEditorState().read(()=>{selection=$getSelection().clone();});
 const before=snapshot(editor);
 run(editor,SET_TUFTE_QUOTE_CITE_COMMAND,'https://example.com/source');
 const after=snapshot(editor);
 assert.deepEqual(after.root.children[0].children[1].children,before.root.children[0].children[1].children);
 editor.getEditorState().read(()=>{assert.ok($getSelection().is(selection));assert.equal(body.getLatest().getKey(),body.getKey());});
 assert.match(publish(after),/<blockquote cite="https:\/\/example.com\/source">/);
 const restored=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 restored.setEditorState(parseCanonicalEditorState(restored,after));await flush();assert.deepEqual(snapshot(restored),after);
 run(editor,SET_TUFTE_QUOTE_CITE_COMMAND,'https://example.com/updated');
 assert.match(publish(snapshot(editor)),/cite="https:\/\/example.com\/updated"/);
 run(editor,SET_TUFTE_QUOTE_CITE_COMMAND,null);
 assert.equal(snapshot(editor).root.children[0].children[1].cite,undefined);
 assert.doesNotMatch(publish(snapshot(editor)),/<blockquote cite=/);
 assert.equal(diagnostics.length,0);stop();
});
for(const kind of ['quote','epigraph','section-footer','attribution','cite','horizontalrule'])test(`remove ${kind}: one history step, adjacent content and canonical reopen`,async()=>{
 const {editor,diagnostics,stop}=setup(kind);
 const history=createEmptyHistoryState(),unregister=registerHistory(editor,history,300);
 // Seed history with the current state and selection.
 editor.update(()=>{},{discrete:true});await flush();
 const before=snapshot(editor);history.current={editor,editorState:editor.getEditorState()};
 run(editor,REMOVE_TUFTE_QUOTATION_COMMAND,kind);await flush();
 const after=snapshot(editor);assert.notDeepEqual(after,before);
 assert.deepEqual(after.root.children[1],before.root.children[1]);
 assert.deepEqual(after.root.children[0].children[0],before.root.children[0].children[0]);
 assert.deepEqual(after.root.children[0].children.at(-1),before.root.children[0].children.at(-1));
 if(kind==='attribution'||kind==='cite'){
  assert.match(publish(after),/quote-note/);assert.equal(after.root.children[0].children[1].children[0].format,1);
  assert.equal(after.root.children[0].children[1].children.at(-1).type,kind==='cite'?'tufte-attribution':'tufte-sidenote');
 }
 publish(after);
 const restored=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});
 restored.setEditorState(parseCanonicalEditorState(restored,after));await flush();assert.deepEqual(snapshot(restored),after);
 run(editor,UNDO_COMMAND);await flush();assert.deepEqual(snapshot(editor),before);
 run(editor,REDO_COMMAND);await flush();assert.deepEqual(snapshot(editor),after);
 assert.equal(diagnostics.length,0);unregister();stop();
});
for(const kind of ['quote','epigraph','section-footer','horizontalrule'])test(`remove sole ${kind} leaves editable paragraph and valid caret`,()=>{
 const {editor,stop}=setup(kind,true);run(editor,REMOVE_TUFTE_QUOTATION_COMMAND,kind);
 assert.deepEqual(snapshot(editor).root.children[0].children.map(n=>n.type),['paragraph']);
 editor.getEditorState().read(()=>assert.equal($getSelection().anchor.getNode().getType(),'paragraph'));
 publish(snapshot(editor));stop();
});
test('removing last epigraph quote removes wrapper while retaining adjacent content',()=>{
 const {editor,stop}=setup('epigraph');run(editor,REMOVE_TUFTE_QUOTATION_COMMAND,'quote');
 assert.deepEqual(snapshot(editor).root.children[0].children.map(n=>n.type),['paragraph','paragraph']);stop();
});
for(const value of ['javascript:alert(1)','https://u:p@example.com',' https://example.com',42,undefined])test(`invalid cite ${value} is atomic`,()=>{
 const {editor,diagnostics,stop}=setup();const before=snapshot(editor);
 run(editor,SET_TUFTE_QUOTE_CITE_COMMAND,value);
 assert.deepEqual(snapshot(editor),before);assert.equal(diagnostics.length,1);stop();
});
for(const command of [SET_TUFTE_QUOTE_CITE_COMMAND,REMOVE_TUFTE_QUOTATION_COMMAND])for(const mode of ['range','composition','note','outside','malformed'])test(`${command.type} rejects ${mode} without changing document, selection or history`,()=>{
 const {editor,diagnostics,stop,target,body}=setup();
 editor.update(()=>{
  if(mode==='outside'){target.remove();$getRoot().append(target);body.selectEnd();}
  else if(mode==='malformed'){target.append($createSectionFooterNode());body.selectEnd();}
  else if(mode==='note')target.getChildren()[1].selectStart();
  else body.select(0,mode==='range'?2:0);
 },{discrete:true});
 const before=snapshot(editor),history=createEmptyHistoryState(),unregister=registerHistory(editor,history,300);
 editor.update(()=>{
  const selection=$getSelection().clone();if(mode==='composition')$setCompositionKey(selection.anchor.key);
  try{editor.dispatchCommand(command,command===SET_TUFTE_QUOTE_CITE_COMMAND?'https://example.com':'quote');assert.deepEqual($getSelection(),selection);}
  finally{$setCompositionKey(null);}
 },{discrete:true});
 assert.deepEqual(snapshot(editor),before);assert.equal(diagnostics.length,1);assert.equal(history.undoStack.length,0);
 unregister();stop();
});

test('URL set/update/clear each have one undo/redo step',async()=>{
 const {editor,stop}=setup();const history=createEmptyHistoryState(),unregister=registerHistory(editor,history,300);
 history.current={editor,editorState:editor.getEditorState()};
 for(const value of ['https://example.com/a','https://example.com/b','']){
  const before=snapshot(editor);run(editor,SET_TUFTE_QUOTE_CITE_COMMAND,value);await flush();const after=snapshot(editor);
  assert.notDeepEqual(after,before);run(editor,UNDO_COMMAND);await flush();assert.deepEqual(snapshot(editor),before);
  run(editor,REDO_COMMAND);await flush();assert.deepEqual(snapshot(editor),after);
 }
 unregister();stop();
});

test('cite-only attribution remains empty and deletion is undoable',async()=>{
 const {editor,stop,target}=setup('cite');
 editor.update(()=>{const attribution=target.getLastChild();attribution.getFirstChild().remove();attribution.getLastChild().selectStart();},{discrete:true});
 const history=createEmptyHistoryState(),unregister=registerHistory(editor,history,300);history.current={editor,editorState:editor.getEditorState()};
 const before=snapshot(editor);run(editor,REMOVE_TUFTE_QUOTATION_COMMAND,'cite');await flush();
 const after=snapshot(editor);assert.deepEqual(after.root.children[0].children[1].children.at(-1).children,[]);publish(after);
 run(editor,UNDO_COMMAND);await flush();assert.deepEqual(snapshot(editor),before);unregister();stop();
});
test('deleting one of multiple epigraph quotes preserves other quote and its note identity',()=>{
 const {editor,stop,target}=setup('epigraph');
 editor.update(()=>{target.append($createQuoteNode().append($createTextNode('Second quote')));target.getLastChild().selectStart();},{discrete:true});
 const before=snapshot(editor).root.children[0].children[1].children[0];
 run(editor,REMOVE_TUFTE_QUOTATION_COMMAND,'quote');
 assert.deepEqual(snapshot(editor).root.children[0].children[1].children,[before]);publish(snapshot(editor));stop();
});
test('unknown deletion kind and missing cite target are diagnosed without mutation',()=>{
 const {editor,diagnostics,stop}=setup();const before=snapshot(editor);
 run(editor,REMOVE_TUFTE_QUOTATION_COMMAND,'constructor');run(editor,REMOVE_TUFTE_QUOTATION_COMMAND,'cite');
 assert.deepEqual(snapshot(editor),before);assert.equal(diagnostics.length,2);stop();
});

test('removing the only attribution leaves a schema-valid editable quote',()=>{
 const {editor,stop,target}=setup('attribution');
 editor.update(()=>{for(const child of target.getChildren().slice(0,-1))child.remove();target.getLastChild().selectStart();},{discrete:true});
 run(editor,REMOVE_TUFTE_QUOTATION_COMMAND,'attribution');
 assert.deepEqual(snapshot(editor).root.children[0].children[1].children.map(n=>n.type),['paragraph']);publish(snapshot(editor));stop();
});

test('epigraph append and moves preserve payload, caret and one undo/redo',async()=>{
 const {editor,stop,target}=setup('epigraph');
 const history=createEmptyHistoryState(),unregister=registerHistory(editor,history,300);history.current={editor,editorState:editor.getEditorState()};
 for(const [command,payload] of [[APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,undefined],[MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,'up'],[MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,'down']]){
  const before=snapshot(editor);let selection;editor.getEditorState().read(()=>{selection=$getSelection().clone();});
  run(editor,command,payload);await flush();const after=snapshot(editor);assert.notDeepEqual(after,before);publish(after);
  if(command===MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND)editor.getEditorState().read(()=>assert.ok($getSelection().is(selection)));
  assert.deepEqual(after.root.children[1],before.root.children[1]);
  assert.match(JSON.stringify(after),/quote-note/);
  run(editor,UNDO_COMMAND);await flush();assert.deepEqual(snapshot(editor),before);
  run(editor,REDO_COMMAND);await flush();assert.deepEqual(snapshot(editor),after);
  const restored=createHeadlessEditor({nodes:TUFTE_NODES,onError(e){throw e;}});restored.setEditorState(parseCanonicalEditorState(restored,after));await flush();assert.deepEqual(snapshot(restored),after);
 }
 unregister();stop();
});
for(const command of [APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND])for(const mode of ['outside','range','composition','note','malformed','boundary'])test(`${command.type} rejects ${mode} atomically`,()=>{
 const {editor,diagnostics,stop,target,body}=setup(mode==='outside'?'quote':'epigraph');
 editor.update(()=>{
  if(mode==='range')body.select(0,2);
  if(mode==='note')target.getFirstChild().getChildren()[1].selectStart();
  if(mode==='malformed')target.append($createParagraphNode());
 },{discrete:true});
 const before=snapshot(editor);
 // Append has no first/last restriction: boundary case instead uses the group element itself.
 editor.update(()=>{
  if(mode==='boundary'&&command===APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND){const selection=$getSelection();selection.anchor.set(target.getKey(),0,'element');selection.focus.set(target.getKey(),0,'element');}
  const selection=$getSelection().clone();if(mode==='composition')$setCompositionKey(selection.anchor.key);
  try{editor.dispatchCommand(command,command===MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND?'up':undefined);assert.ok($getSelection().is(selection));}finally{$setCompositionKey(null);}
 },{discrete:true});
 assert.deepEqual(snapshot(editor),before);assert.equal(diagnostics.length,1);stop();
});
