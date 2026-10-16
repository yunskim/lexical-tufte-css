import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeadlessEditor} from '@lexical/headless';
import {SectionNode,NoteNode,InlineImageNode,TufteSpanNode,loadDocumentIntoEditor,exportEditorToDocument} from '../dist/index.js';
import {LinkNode} from '@lexical/link';
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const editor=()=>createHeadlessEditor({namespace:'document-bridge-test',nodes:[SectionNode,NoteNode,InlineImageNode,TufteSpanNode,LinkNode],onError(e){throw e;}});
test('R02 strict Lexical bridge fails closed when a registered node is missing',()=>{
 const e=editor(),d=fixture();
 const result=loadDocumentIntoEditor(e,d);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='LEXICAL_IMPORT_FAILED'));
});
test('R02 strict Lexical bridge rejects invalid document before touching editor',()=>{
 const e=editor(),d=fixture();d.schemaVersion=999;
 const result=loadDocumentIntoEditor(e,d);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='UNSUPPORTED_VERSION'));
});
test('R03 editor export never silently drops missing required document sections',()=>{
 const e=editor(),d=fixture();
 const result=exportEditorToDocument(e,d);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.length>0);
});
