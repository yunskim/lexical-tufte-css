import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {documentToEditorJSON,editorJSONToDocument,canonicalizeDocument,parseCanonicalDocument,inspectStoredDocument,validateDocumentV2} from '../dist/index.js';
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
test('R02 document editor JSON document preserves validated state without mutation',()=>{
 const original=fixture(),before=JSON.stringify(original);
 const imported=documentToEditorJSON(original);
 assert.equal(imported.ok,true,JSON.stringify(imported.diagnostics));
 const exported=editorJSONToDocument(original,imported.state);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.deepEqual(exported.document,original);
 assert.equal(JSON.stringify(original),before);
});
test('R03 unknown Lexical export fields fail explicitly rather than silently disappear',()=>{
 const original=fixture(),imported=documentToEditorJSON(original);
 assert.equal(imported.ok,true);
 imported.state.root.children[0].futureLexicalField=true;
 const result=editorJSONToDocument(original,imported.state);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='UNKNOWN_FIELD'&&x.path.includes('futureLexicalField')));
});
test('R02 malformed editor JSON fails with diagnostics',()=>{
 const result=editorJSONToDocument(fixture(),{root:{type:'future-node',version:1,children:[]}});
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='UNKNOWN_NODE'));
});

test('R11 exported document owns a snapshot independent of editor state and base',()=>{
 const base=fixture();
 const imported=documentToEditorJSON(base);
 assert.equal(imported.ok,true,JSON.stringify(imported.diagnostics));
 const exported=editorJSONToDocument(base,imported.state);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.notStrictEqual(exported.document,base);
 assert.notStrictEqual(exported.document.lexicalState,imported.state);
 assert.notStrictEqual(exported.document.assets,base.assets);
 const before=JSON.stringify(exported.document);
 base.title='modified base';
 base.assets.length=0;
 imported.state.root.children.length=0;
 assert.equal(JSON.stringify(exported.document),before);
});

test('R11 imported editor state is detached from the source document',()=>{
 const base=fixture();
 const imported=documentToEditorJSON(base);
 assert.equal(imported.ok,true,JSON.stringify(imported.diagnostics));
 assert.notStrictEqual(imported.state,base.lexicalState);
 assert.notStrictEqual(imported.state.root,base.lexicalState.root);
 const original=JSON.stringify(imported.state);
 base.lexicalState.root.children.length=0;
 assert.equal(JSON.stringify(imported.state),original);
 imported.state.root.children.length=0;
 assert.notEqual(JSON.stringify(base.lexicalState),original);
});

test('R03 rejected editor export leaves the base document unchanged',()=>{
 const base=fixture(),before=JSON.stringify(base);
 const state=structuredClone(base.lexicalState);
 state.root.children[0].unexpectedField='reject';
 const exported=editorJSONToDocument(base,state);
 assert.equal(exported.ok,false);
 assert.ok(exported.diagnostics.some(d=>d.code==='UNKNOWN_FIELD'));
 assert.equal(JSON.stringify(base),before);
 assert.equal(state.root.children[0].unexpectedField,'reject');
});

test('R03 canonical serialization ignores object key order but preserves array order',()=>{
 const base=fixture();
 const reverse=value=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,v])=>[key,reverse(v)])):value;
 const first=canonicalizeDocument(base);
 const second=canonicalizeDocument(reverse(base));
 assert.equal(first.ok,true,JSON.stringify(first.diagnostics));
 assert.equal(second.ok,true,JSON.stringify(second.diagnostics));
 assert.equal(first.value,second.value);
 const changed=structuredClone(base);
 // Force two distinct, valid sections so this assertion cannot silently skip.
 const originalSection=changed.lexicalState.root.children[0];
 assert.equal(originalSection.type,'tufte-section');
 const section={type:'tufte-section',version:1,children:[]};
 // Distinguish the sections without duplicating note IDs or asset references.
 // A plain paragraph with a unique text node satisfies the section contract.
 section.children=[{
  type:'paragraph',version:1,children:[
   {type:'text',version:1,text:'Second section',format:0}
  ]
 }];
 changed.lexicalState.root.children.push(section);
 const beforeOrder=canonicalizeDocument(changed);
 assert.equal(beforeOrder.ok,true,JSON.stringify(beforeOrder.diagnostics));
 changed.lexicalState.root.children.reverse();
 const reordered=canonicalizeDocument(changed);
 assert.equal(reordered.ok,true,JSON.stringify(reordered.diagnostics));
 assert.notEqual(beforeOrder.value,reordered.value);
 const parsed=parseCanonicalDocument(first.value);
 assert.equal(parsed.ok,true,JSON.stringify(parsed.diagnostics));
 assert.deepEqual(parsed.value,base);
});

test('R03 canonical serialization rejects unknown fields without mutating input',()=>{
 const base=fixture(),before=JSON.stringify(base);
 base.lexicalState.root.children[0].futureField='unsupported';
 const result=canonicalizeDocument(base);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='UNKNOWN_FIELD'));
 delete base.lexicalState.root.children[0].futureField;
 assert.equal(JSON.stringify(base),before);
});

test('R03 format inspection distinguishes legacy v1 and proposed v2 without mutation',()=>{
 const legacy=fixture(),before=JSON.stringify(legacy);
 assert.deepEqual(inspectStoredDocument(legacy),{ok:true,format:{schemaVersion:1,formatVersion:'legacy-v1'},diagnostics:[]});
 assert.equal(JSON.stringify(legacy),before);
 const v2={...legacy,schemaVersion:2,editorFormat:{engine:'lexical',formatVersion:1}};
 assert.deepEqual(inspectStoredDocument(v2),{ok:true,format:{schemaVersion:2,formatVersion:1},diagnostics:[]});
 for(const input of [
  {...legacy,schemaVersion:3},
  {...v2,editorFormat:{engine:'lexical',formatVersion:2}},
  {...v2,editorFormat:{engine:'other',formatVersion:1}},
  {...v2,editorFormat:{engine:'lexical',formatVersion:1,extra:true}}
 ]){
  const result=inspectStoredDocument(input);
  assert.equal(result.ok,false);
  assert.ok(result.diagnostics.some(d=>d.code.startsWith('UNSUPPORTED_')));
 }
 const malformed={...legacy,unknownField:true};
 const invalid=inspectStoredDocument(malformed);
 assert.equal(invalid.ok,false);
 assert.ok(invalid.diagnostics.some(d=>d.code==='UNKNOWN_FIELD'));
});

test('R03 strict v2 envelope validates existing content without mutation',()=>{
 const legacy=fixture(),before=JSON.stringify(legacy);
 const v2={...legacy,schemaVersion:2,editorFormat:{engine:'lexical',formatVersion:1}};
 const result=validateDocumentV2(v2);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.deepEqual(result.document,v2);
 assert.notStrictEqual(result.document,v2);
 assert.equal(JSON.stringify(legacy),before);
 for(const [bad,code] of [
  [{...v2,editorFormat:{...v2.editorFormat,extra:true}},'UNKNOWN_FIELD'],
  [{...v2,editorFormat:{engine:'lexical',formatVersion:2}},'UNSUPPORTED_EDITOR_FORMAT'],
  [{...v2,lexicalState:{root:{type:'future',version:1,children:[]}}},'UNKNOWN_NODE'],
  [{...v2,unknownField:true},'UNKNOWN_FIELD']
 ]){
  const rejected=validateDocumentV2(bad);
  assert.equal(rejected.ok,false);
  assert.ok(rejected.diagnostics.some(d=>d.code===code),JSON.stringify(rejected.diagnostics));
 }
});
