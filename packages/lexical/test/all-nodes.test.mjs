import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NODE_SCHEMA,validateDocument,migrateStoredDocument} from '@lexical-tufte/document';
import {TUFTE_NODES,TUFTE_NODE_TYPES,TESTED_LEXICAL_VERSION,loadDocumentIntoEditor,exportEditorToDocument,loadMigratedDocumentIntoEditor,exportEditorToDocumentV2} from '../dist/index.js';
import {createAllNodesDocument,createFixtureEditor,collectNodes} from './all-nodes-fixture.mjs';
const goldenURL=new URL(`./golden/lexical-${TESTED_LEXICAL_VERSION}-all-nodes.json`,import.meta.url);
const golden=()=>JSON.parse(readFileSync(goldenURL,'utf8'));
const saved=value=>JSON.parse(JSON.stringify(value));
function assertRoundtrip(document){
 const before=JSON.stringify(document),editor=createFixtureEditor();
 const loaded=loadDocumentIntoEditor(editor,document);assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 assert.deepEqual(saved(editor.getEditorState().toJSON()),document.lexicalState);
 const exported=exportEditorToDocument(editor,loaded.value);assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));assert.deepEqual(saved(exported.value),document);
 const second=createFixtureEditor();assert.equal(loadDocumentIntoEditor(second,exported.value).ok,true);assert.deepEqual(saved(second.getEditorState().toJSON()),document.lexicalState);
 assert.equal(JSON.stringify(document),before);assert.notStrictEqual(exported.value.assets,document.assets);
 return {editor,document:exported.value};
}
test('R02 full registry and checked-in golden cover every schema node without duplicate registration',()=>{
 assert.equal(Object.isFrozen(TUFTE_NODES),true);assert.equal(Object.isFrozen(TUFTE_NODE_TYPES),true);
 assert.deepEqual(TUFTE_NODE_TYPES,Object.keys(NODE_SCHEMA).sort());assert.equal(new Set(TUFTE_NODE_TYPES).size,TUFTE_NODE_TYPES.length);
 const doc=golden();assert.equal(validateDocument(doc).ok,true);
 assert.deepEqual([...new Set(collectNodes(doc.lexicalState.root).map(({node})=>node.type))].sort(),TUFTE_NODE_TYPES);
 assert.equal(JSON.stringify(createAllNodesDocument(),null,2)+'\n',readFileSync(goldenURL,'utf8'),'Runtime output drift requires explicit review, not automatic fixture rewriting');
});
test('R02 every node, rich variant and asset survives two real editor storage roundtrips',()=>{
 const {document}=assertRoundtrip(golden()),nodes=collectNodes(document.lexicalState.root).map(x=>x.node);
 assert.deepEqual(new Set(nodes.filter(n=>n.type==='tufte-span').map(n=>n.kind)),new Set(['sans','newthought','numeral','danger']));
 assert.deepEqual(new Set(nodes.filter(n=>n.type==='tufte-table-layout').map(n=>n.layout)),new Set(['body','fullwidth','scroll']));
 assert.deepEqual(new Set(nodes.filter(n=>n.type==='tufte-note').map(n=>n.kind)),new Set(['sidenote','marginnote']));
 assert.deepEqual(new Set(nodes.filter(n=>n.type==='tufte-embed').map(n=>n.provider)),new Set(['youtube','vimeo']));
 assert.deepEqual(nodes.filter(n=>n.type==='code-highlight').map(n=>n.highlightType),['keyword','number',null]);
 assert.ok(nodes.some(n=>n.type==='tab'&&n.text==='\t'));assert.ok(nodes.some(n=>n.type==='linebreak'));
 assert.equal(nodes.filter(n=>n.type==='tufte-note').length,new Set(nodes.filter(n=>n.type==='tufte-note').map(n=>n.noteId)).size);
});
test('R02 all-node v2 migration and actual editor storage export retain format and values',()=>{
 const original=golden(),migrated=migrateStoredDocument(original);assert.equal(migrated.ok,true);
 const e=createFixtureEditor(),loaded=loadMigratedDocumentIntoEditor(e,original);assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const exported=exportEditorToDocumentV2(e,loaded.value);assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));assert.deepEqual(saved(exported.value),migrated.document);
 assert.notStrictEqual(exported.value.lexicalState,loaded.value.lexicalState);
});
for(const type of TUFTE_NODE_TYPES){
 test(`R02 ${type}: unknown field and future version reject before editor mutation`,()=>{
  const {editor}=assertRoundtrip(golden()),before=JSON.stringify(editor.getEditorState().toJSON());
  for(const [field,value,code]of [['unrecognizedContractField',true,'UNKNOWN_FIELD'],['version',999,'UNSUPPORTED_NODE_VERSION']]){
   const doc=golden(),node=collectNodes(doc.lexicalState.root).find(x=>x.node.type===type).node;node[field]=value;
   const result=loadDocumentIntoEditor(editor,doc);assert.equal(result.ok,false);assert.ok(result.diagnostics.some(d=>d.code===code&&d.path.includes(field)),JSON.stringify(result.diagnostics));
   assert.equal(JSON.stringify(editor.getEditorState().toJSON()),before,`${type} rejection must not install a partial document`);assert.equal(node[field],value);
  }
 });
}
test('R02 all-node import snapshot cannot alias note identity or asset metadata',()=>{
 const source=golden(),e=createFixtureEditor(),loaded=loadDocumentIntoEditor(e,source);assert.equal(loaded.ok,true);
 const before=JSON.stringify(loaded.value),editorBefore=JSON.stringify(e.getEditorState().toJSON());
 source.assets[0].src='/changed.svg';collectNodes(source.lexicalState.root).find(x=>x.node.type==='tufte-note').node.noteId='changed';
 assert.equal(JSON.stringify(loaded.value),before);assert.equal(JSON.stringify(e.getEditorState().toJSON()),editorBefore);
});
