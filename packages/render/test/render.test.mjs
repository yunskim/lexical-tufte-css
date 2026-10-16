import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderArticle,validateDocument} from '../dist/index.js';
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const note=d=>d.lexicalState.root.children[0].children[0].children[1];
test('pure renderer works without browser/editor globals and is deterministic without mutation',()=>{
 assert.equal(typeof document,'undefined');assert.equal(typeof window,'undefined');
 const d=fixture(),before=JSON.stringify(d);const a=renderArticle(d),b=renderArticle(d);
 assert.equal(a.ok,true,JSON.stringify(a.diagnostics));assert.deepEqual(a,b);assert.equal(JSON.stringify(d),before);
 assert.match(a.html,/&lt;script&gt;/);assert.doesNotMatch(a.html,/<script/);assert.match(a.html,/<th scope="col">/);assert.match(a.html,/server-fixture-note-server-note/);
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));assert.deepEqual(pkg.dependencies,{'@lexical-tufte/document':'workspace:*'});
});
test('unknown node/version and invalid nesting block the whole render with paths',()=>{
 for(const mutate of [d=>note(d).version=2,d=>note(d).children[0].type='future-node',d=>note(d).children.push({type:'paragraph',version:1,children:[]})]){
  const d=fixture();mutate(d);const r=renderArticle(d);assert.equal(r.ok,false);assert.equal(r.html,null);assert.ok(r.diagnostics.some(x=>x.path.includes('children')));
 }
});
test('duplicate and nested note references are rejected',()=>{
 let d=fixture();d.lexicalState.root.children[0].children[1].children[1].noteId='server-note';assert.equal(validateDocument(d).ok,false);
 d=fixture();note(d).children.push(structuredClone(note(d)));const r=renderArticle(d);assert.equal(r.ok,false);assert.ok(r.diagnostics.some(x=>x.code==='NESTED_NOTE'));
});
test('unsafe URLs, arbitrary styles and unsupported table semantics are not silently dropped',()=>{
 for(const mutate of [d=>note(d).children[1].url='javascript:alert(1)',d=>note(d).children[2].src='//evil.test/image',d=>note(d).children[0].style='position:fixed',d=>d.lexicalState.root.children[0].children[4].children[0].children[0].children[0].colSpan=2]){
  const d=fixture();mutate(d);const r=renderArticle(d);assert.equal(r.ok,false);assert.equal(r.html,null);
 }
});
test('cycles and future envelope versions return diagnostics rather than recurse or render',()=>{
 const d=fixture();d.lexicalState.root.children.push(d.lexicalState.root);
 assert.ok(validateDocument(d).diagnostics.some(x=>x.code==='CYCLIC_OR_SHARED_NODE'));
 const v=fixture();v.schemaVersion=2;assert.equal(renderArticle(v).ok,false);
});
test('article namespaces separate note ids, titles and attributes are escaped',()=>{
 const d=fixture();d.title='"><script>alert(1)</script>';d.locale='ko-KR';d.lexicalState.root.children[0].children[0].children[1].children[2].alt='" onerror="alert(1)';
 const a=renderArticle(d,{idPrefix:'first'}),b=renderArticle(d,{idPrefix:'second'});assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert.match(a.html,/first-note-server-note/);assert.match(b.html,/second-note-server-note/);assert.match(a.html,/alt="&quot; onerror=&quot;alert\(1\)"/);assert.doesNotMatch(a.html,/<script/);
 assert.equal(renderArticle(d,{idPrefix:'bad"id'}).ok,false);
});

test('canonical JSON import validates without HTML fallback',async()=>{
 const {parseDocument}=await import('../dist/index.js');const doc=fixture();
 assert.equal(parseDocument(JSON.stringify(doc)).ok,true);
 for(const input of ['<p>HTML</p>','{',JSON.stringify({...doc,schemaVersion:2}),'x'.repeat(5000001)])assert.equal(parseDocument(input).ok,false);
});

test('valid future node/data schemas do not imply renderer support',()=>{
 const d=fixture();d.lexicalState.root.children[0].children.push({type:'heading',version:1,tag:'h2',children:[{type:'text',version:1,text:'제목',format:0}]});
 assert.equal(validateDocument(d).ok,true);const r=renderArticle(d);assert.equal(r.ok,false);assert.equal(r.html,null);assert.ok(r.diagnostics.some(x=>x.code==='UNSUPPORTED_RENDER_NODE'));
 const imageDoc=fixture(),image=note(imageDoc).children[2];image.width=800;assert.equal(validateDocument(imageDoc).ok,true);assert.ok(renderArticle(imageDoc).diagnostics.some(x=>x.code==='UNSUPPORTED_RENDER_PROPERTY'));
});
