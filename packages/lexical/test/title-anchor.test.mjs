import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeadlessEditor,TUFTE_NODES,loadMigratedDocumentIntoEditor,
 exportEditorToDocumentV2} from '../dist/index.js';
const fixture=()=>JSON.parse(readFileSync(new URL(
 '../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const create=()=>createHeadlessEditor({
 namespace:'title-anchor-boundary',nodes:TUFTE_NODES,onError(error){throw error;}
});

test('titleId survives v1 migration, real headless Lexical save/reopen and v2 export',()=>{
 const document={...fixture(),titleId:'tufte-css'};
 const first=create();
 const opened=loadMigratedDocumentIntoEditor(first,document);
 assert.equal(opened.ok,true,JSON.stringify(opened.diagnostics));
 const saved=exportEditorToDocumentV2(first,opened.value);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.equal(saved.value.titleId,'tufte-css');
 const second=create();
 const reopened=loadMigratedDocumentIntoEditor(second,saved.value);
 assert.equal(reopened.ok,true,JSON.stringify(reopened.diagnostics));
 const roundtrip=exportEditorToDocumentV2(second,reopened.value);
 assert.equal(roundtrip.ok,true,JSON.stringify(roundtrip.diagnostics));
 assert.deepEqual(roundtrip.value,saved.value);
 const legacy=create();
 const withoutTitleId=loadMigratedDocumentIntoEditor(legacy,fixture());
 assert.equal(withoutTitleId.ok,true,JSON.stringify(withoutTitleId.diagnostics));
 assert.equal(Object.hasOwn(withoutTitleId.value,'titleId'),false);
 const legacySave=exportEditorToDocumentV2(legacy,withoutTitleId.value);
 assert.equal(legacySave.ok,true,JSON.stringify(legacySave.diagnostics));
 assert.equal(Object.hasOwn(legacySave.value,'titleId'),false);
});
