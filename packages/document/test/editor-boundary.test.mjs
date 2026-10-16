import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {documentToEditorJSON,editorJSONToDocument} from '../dist/index.js';
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
