import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDocument,documentToEditorJSON,editorJSONToDocument} from '../dist/index.js';

const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const text=value=>({type:'text',version:1,text:value,format:0});
const link=props=>({type:'link',version:1,children:[text('Linked title')],...props});
const addNode=(doc,node)=>{
 const paragraph={type:'paragraph',version:1,children:[node]};
 doc.lexicalState.root.children[0].children.push(paragraph);
};
const has=(result,code)=>!result.ok&&result.diagnostics.some(d=>d.code===code);

test('host reference is preserved through editor JSON boundary',()=>{
 const doc=fixture();
 const reference={namespace:'magnolia',kind:'note',id:'note-123'};
 addNode(doc,link({reference}));
 assert.equal(validateDocument(doc).ok,true);
 const editor=documentToEditorJSON(doc);
 assert.equal(editor.ok,true);
 const restored=editorJSONToDocument(doc,editor.state);
 assert.equal(restored.ok,true);
 assert.deepEqual(restored.document,doc);
});

test('link must have exactly one target',()=>{
 const doc=fixture();
 addNode(doc,link({url:'https://example.org',reference:{namespace:'magnolia',kind:'note',id:'note-123'}}));
 assert.equal(has(validateDocument(doc),'INVALID_LINK_TARGET'),true);
 const missing=fixture();
 addNode(missing,link({}));
 assert.equal(has(validateDocument(missing),'INVALID_LINK_TARGET'),true);
});

test('invalid host references are rejected',()=>{
 const doc=fixture();
 addNode(doc,link({reference:{namespace:'magnolia',kind:'note',id:'note-123',unexpected:true}}));
 assert.equal(has(validateDocument(doc),'INVALID_REFERENCE'),true);
});
