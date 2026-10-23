import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateStoredDocument,validateDocumentV2} from '../dist/index.js';

const text=(value)=>({type:'text',version:1,text:value,format:0});
const note=(kind,id)=>({type:'tufte-note',version:1,kind,noteId:id,children:[text(kind)]});
const document=()=>({
 schemaVersion:1,id:'note-migration',locale:'en',title:'Notes',assets:[],
 lexicalState:{root:{type:'root',version:1,children:[{
  type:'tufte-section',version:1,children:[{
   type:'paragraph',version:1,children:[text('Hello'),note('sidenote','note-a'),note('marginnote','note-b')]
  }]
 }]}}
});
test('explicit migration converts both legacy note kinds without mutating input',()=>{
 const original=document();
 const snapshot=structuredClone(original);
 const result=migrateStoredDocument(original);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.deepEqual(original,snapshot);
 const children=result.document.lexicalState.root.children[0].children[0].children;
 assert.equal(children[1].type,'tufte-sidenote');
 assert.equal(children[2].type,'tufte-marginnote');
 assert.equal(Object.hasOwn(children[1],'kind'),false);
 assert.equal(Object.hasOwn(children[2],'kind'),false);
 assert.equal(validateDocumentV2(result.document).ok,true);
});
test('unknown legacy kind is rejected rather than silently coerced',()=>{
 const original=document();
 original.lexicalState.root.children[0].children[0].children[1].kind='other';
 assert.equal(migrateStoredDocument(original).ok,false);
});
test('migration is idempotent for a migrated v2 document',()=>{
 const first=migrateStoredDocument(document());
 assert.equal(first.ok,true);
 const second=migrateStoredDocument(first.document);
 assert.equal(second.ok,true);
 assert.deepEqual(second.document,first.document);
});

test('noncloneable nested values fail with diagnostics rather than throwing',()=>{
 const original=document();
 original.lexicalState.root.children[0].children[0].children[1].children.push({type:'text',version:1,text:'bad',format:0,callback:()=>42});
 assert.doesNotThrow(()=>migrateStoredDocument(original));
 assert.equal(migrateStoredDocument(original).ok,false);
});
test('legacy note without a recognized kind cannot bypass strict validation',()=>{
 const original=document();
 delete original.lexicalState.root.children[0].children[0].children[1].kind;
 const result=migrateStoredDocument(original);
 assert.equal(result.ok,false);
});
