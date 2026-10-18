import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderArticle} from '../dist/index.js';

// Upstream snapshot: edwardtufte/tufte-css v1.9.0,
// b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1/index.html.
// These are structural compatibility checks, NOT a claim of full-page parity.
const upstream=readFileSync(new URL('../../../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const documentFixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const count=(html,pattern)=>[...html.matchAll(pattern)].length;

test('pinned upstream demo includes the expected Tufte structural vocabulary',()=>{
 for(const pattern of [
  /<article\b/,/<section\b/,/<h1\b/,/<h2\b/,/<p class="subtitle"/,
  /<div class="epigraph"/,/<blockquote\b/,/<footer\b/,/<cite\b/,
  /<figure\b/,/<img\b/,/<pre\b/,/<code\b/,/<iframe\b/,
  /class="newthought"/,/class="sans"/,/class="sidenote"/,/class="marginnote"/,
  /class="margin-toggle sidenote-number"/,/<input\b[^>]*class="margin-toggle"/
 ])assert.match(upstream,pattern);
 assert.ok(count(upstream,/<section\b/g)>=3,'upstream section structure unexpectedly changed');
 // These supported extensions need their own fixtures, not invented upstream coverage.
 for(const tag of ['figcaption','table','dl','dt','dd'])assert.doesNotMatch(upstream,new RegExp('<'+tag+'\\b'));
});

test('published notes preserve the upstream label/input/payload relationship, with namespaced ids',()=>{
 const result=renderArticle(documentFixture());
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const html=result.html;
 const notes=[...html.matchAll(/<label\b[^>]*for="([^"]+)"[^>]*>([^<]*)<\/label><input\b[^>]*id="([^"]+)"[^>]*><span\b[^>]*class="(sidenote|marginnote)"/g)];
 assert.ok(notes.length>=2,'expected both Tufte note kinds in published fixture');
 assert.deepEqual(new Set(notes.map(note=>note[4])),new Set(['sidenote','marginnote']));
 for(const [,id,glyph,inputId,kind] of notes){
  assert.equal(id,inputId,'label must target its adjacent input');
  assert.equal(glyph,kind==='sidenote'?'':'⊕');
  assert.ok(html.includes('class="margin-toggle'+(kind==='sidenote'?' sidenote-number':'')+'"'));
 }
 assert.match(upstream,/<label\b[^>]*class="margin-toggle sidenote-number"[^>]*><\/label>/);
 assert.match(upstream,/<span class="sidenote">/);
});

test('upstream newthought embeds a note label inside span: known schema/DOM fidelity gap',()=>{
 // The current renderer wraps note markup in a data-tufte-note span.
 // This upstream nesting cannot yet be reproduced by the current note-in-span schema.
 assert.match(upstream,/<span class="newthought">[^<]*<label\b[^>]*class="margin-toggle sidenote-number"/);
 const result=renderArticle(documentFixture());
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<span data-tufte-note="/);
 // Do not mark F05/F10 upstream DOM parity complete until this difference is resolved.
});

test('upstream margin toggles have matching input ids and adjacent sidenote/marginnote payloads',()=>{
 // The upstream example sometimes nests the label in a newthought span.
 // Compare input-to-payload adjacency independently of label nesting.
 const inputs=[...upstream.matchAll(/<input\b[^>]*type="checkbox"[^>]*id="([^"]+)"[^>]*class="margin-toggle"[^>]*\\/?>\\s*<span class="(sidenote|marginnote)">/g)];
 assert.ok(inputs.length>0,'upstream must contain actual note toggles');
 const labels=[...upstream.matchAll(/<label\\b[^>]*for="([^"]+)"[^>]*class="margin-toggle(?: sidenote-number)?"[^>]*>/g)];
 const labelIds=new Set(labels.map(m=>m[1]));
 for(const [,id] of inputs)assert.ok(labelIds.has(id),'unpaired upstream margin toggle: '+id);
});

test('published article keeps CSS direct-child section layout and note adjacency',()=>{
 const result=renderArticle(documentFixture());
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const html=result.html;
 assert.match(html,/<article\\b[^>]*>[\\s\\S]*<section\\b/);
 assert.match(html,/<section\\b[^>]*><p\\b/);
 // CSS uses the adjacent-sibling selector .margin-toggle:checked + .sidenote/.marginnote.
 for(const kind of ['sidenote','marginnote']){
  assert.match(html,new RegExp('<input\\\\b[^>]*class="margin-toggle"[^>]*><span\\\\b[^>]*class="'+kind+'"'));
 }
});
