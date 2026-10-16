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
 assert.match(a.html,/&lt;script&gt;/);assert.doesNotMatch(a.html,/<script/);assert.match(a.html,/<th scope="col">/);assert.match(a.html,/tufte-14-server-fixture-server-note/);
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
 assert.match(a.html,/tufte-5-first-server-note/);assert.match(b.html,/tufte-6-second-server-note/);assert.match(a.html,/alt="&quot; onerror=&quot;alert\(1\)"/);assert.doesNotMatch(a.html,/<script/);
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

test('length-delimited namespaces avoid prefix and note ID ambiguity',()=>{
 const a=fixture(),b=fixture();
 note(a).noteId='c';note(b).noteId='b-c';
 const first=renderArticle(a,{idPrefix:'a-b'});
 const second=renderArticle(b,{idPrefix:'a'});
 assert.equal(first.ok,true,JSON.stringify(first.diagnostics));
 assert.equal(second.ok,true,JSON.stringify(second.diagnostics));
 const id=html=>html.match(/<input id="([^"]+)" type="checkbox"/)?.[1];
 assert.equal(id(first.html),'tufte-3-a-b-c');
 assert.equal(id(second.html),'tufte-1-a-b-c');
 assert.notEqual(id(first.html),id(second.html));
 for(const result of [first,second])assert.ok(result.html.includes('for="'+id(result.html)+'"'));
});

test('publication output has no inline style and uses scoped CSS classes',()=>{
 const d=fixture();
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.doesNotMatch(result.html,/\\sstyle=/);
 assert.match(result.html,/class="tufte-article/);
 assert.match(result.html,/class="tufte-pre-wrap"/);
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/counter-reset: sidenote-counter/);
 assert.match(css,/white-space: pre-wrap/);
});
