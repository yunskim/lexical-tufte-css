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

test('newthought followed by sidenote publishes split-parent markup without a note wrapper',()=>{
 assert.match(upstream,/<span class="newthought">[^<]*<label\\b[^>]*class="margin-toggle sidenote-number"/);
 const doc=documentFixture(),section=doc.lexicalState.root.children[0];
 const text=value=>({type:'text',version:1,text:value,format:0});
 const node=(type,children,fields={})=>({type,version:1,children,...fields});
 section.children.push(node('paragraph',[
  node('tufte-span',[text('Later books')],{kind:'newthought'}),
  node('tufte-sidenote',[text('Reference')],{noteId:'split-parent-check'}),
  text(' remain readable.')
 ]));
 const result=renderArticle(doc);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<span class="newthought">Later books<label for="([^"]+)" class="margin-toggle sidenote-number"><\\/label><\\/span><input id="\\1" type="checkbox" class="margin-toggle" aria-label="Toggle sidenote"><span class="sidenote">Reference<\\/span>/);
 assert.doesNotMatch(result.html,/data-tufte-note=|tufte-note-editor/);
});

test('other adjacent notes and intervening text do not steal a newthought label',()=>{
 const doc=documentFixture(),section=doc.lexicalState.root.children[0];
 const text=value=>({type:'text',version:1,text:value,format:0});
 const node=(type,children,fields={})=>({type,version:1,children,...fields});
 section.children.push(node('paragraph',[
  node('tufte-span',[text('A new thought')],{kind:'newthought'}),
  text(' and then '),
  node('tufte-sidenote',[text('Unpaired')],{noteId:'unpaired-side'})
 ]));
 section.children.push(node('paragraph',[
  node('tufte-span',[text('Another thought')],{kind:'newthought'}),
  node('tufte-marginnote',[text('Margin')],{noteId:'ordinary-margin'})
 ]));
 const result=renderArticle(doc);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<span class="newthought">A new thought<\\/span> and then <label for="([^"]+)" class="margin-toggle sidenote-number"><\\/label><input id="\\1"/);
 assert.match(result.html,/<span class="newthought">Another thought<\\/span><label for="([^"]+)" class="margin-toggle">⊕<\\/label><input id="\\1"/);
});

test('upstream margin toggles have matching labels and adjacent payloads',()=>{
 // Upstream attributes are not consistently ordered; parse both orderings.
 const inputs=[...upstream.matchAll(/<input\b[^>]*>/g)]
  .map(m=>m[0]).filter(tag=>/class="margin-toggle"/.test(tag));
 const labels=[...upstream.matchAll(/<label\b[^>]*>/g)]
  .map(m=>m[0]).filter(tag=>/class="margin-toggle(?: sidenote-number)?"/.test(tag));
 const labelIds=new Set(labels.map(tag=>tag.match(/for="([^"]+)"/)?.[1]));
 assert.ok(inputs.length>0,'upstream note inputs missing');
 for(const tag of inputs){
  const id=tag.match(/id="([^"]+)"/)?.[1];
  assert.ok(id&&labelIds.has(id),'unpaired upstream margin toggle: '+id);
 }
});

test('published article keeps section structure and adjacent note payloads',()=>{
 const result=renderArticle(documentFixture());
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const html=result.html;
 assert.match(html,/<article\b[^>]*>[\s\S]*<section\b/);
 assert.match(html,/<section\b[^>]*><p\b/);
 for(const kind of ['sidenote','marginnote']){
  assert.match(html,new RegExp('<input\\b[^>]*class="margin-toggle"[^>]*><span\\b[^>]*class="'+kind+'"'));
 }
});
