import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDocument,migrateStoredDocument,validateDocumentV2} from '../dist/index.js';
const fixture=()=>JSON.parse(readFileSync(new URL(
 '../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const failed=(result,code)=>!result.ok&&result.diagnostics.some(d=>d.code===code);

test('optional h1 titleId persists through v1/v2 and leaves legacy snapshots intact',()=>{
 const old=fixture(),before=JSON.stringify(old);
 assert.equal(validateDocument(old).ok,true);
 const withAnchor={...old,titleId:'tufte-css'};
 assert.equal(validateDocument(withAnchor).ok,true);
 const migrated=migrateStoredDocument(withAnchor);
 assert.equal(migrated.ok,true,JSON.stringify(migrated.diagnostics));
 assert.equal(migrated.document.titleId,'tufte-css');
 assert.equal(validateDocumentV2(migrated.document).ok,true);
 const reopened=migrateStoredDocument(migrated.document);
 assert.equal(reopened.ok,true,JSON.stringify(reopened.diagnostics));
 assert.deepEqual(reopened.document,migrated.document);
 assert.equal(JSON.stringify(old),before);
});

test('unsafe, empty or duplicate title IDs fail without relaxing unknown fields',()=>{
 for(const id of ['',null,123,'../title','bad id','<script>','a'.repeat(129)]){
  const d=fixture();d.titleId=id;
  assert.ok(failed(validateDocument(d),'INVALID_TITLE_ID'),JSON.stringify(id));
 }
 const d=fixture();d.titleId='duplicate-heading';
 d.lexicalState.root.children[0].children.push({
  type:'heading',version:1,children:[{type:'text',version:1,text:'Heading',format:0}],
  tag:'h2',id:'duplicate-heading'
 });
 assert.ok(failed(validateDocument(d),'DUPLICATE_TITLE_ID'));
 const unknown=fixture();unknown.titleIdentifier='x';
 assert.ok(failed(validateDocument(unknown),'UNKNOWN_FIELD'));
});
