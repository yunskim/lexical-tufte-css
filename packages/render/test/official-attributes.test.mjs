import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderArticle,validateDocument} from '../dist/index.js';

const text=value=>({type:'text',version:1,text:value,format:0});
const element=(type,children,properties={})=>({type,version:1,children,...properties});
const fixture=()=>({
 schemaVersion:1,id:'official-attributes',locale:'en-US',
 title:'Tufte CSS',titleId:'tufte-css',assets:[],
 lexicalState:{root:element('root',[
  element('tufte-section',[
   element('heading',[text('Getting Started')],{tag:'h2',id:'getting-started'}),
   element('paragraph',[text('Sans copy')],{tufteClass:'sans'}),
   element('quote',[text('Quotation')],{cite:'/sources/quote'}),
   element('tufte-figure',[
    element('tufte-marginnote',[text('Figure note')],{noteId:'figure-margin'}),
    {type:'tufte-inline-image',version:1,src:'img/rhino.png',alt:'Rhino'},
    element('tufte-caption',[text('A caption')])
   ],{width:'body'})
  ])
 ])}
});
test('upstream heading anchor, sans paragraph and blockquote citation survive publication',()=>{
 const original=fixture(),before=JSON.stringify(original);
 assert.equal(validateDocument(original).ok,true);
 const published=renderArticle(original);
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
 assert.match(published.html,/<h1 id="tufte-css">Tufte CSS<\/h1>/);
 assert.match(published.html,/<h2 id="getting-started">Getting Started<\/h2>/);
 assert.match(published.html,/<p class="sans">Sans copy<\/p>/);
 assert.match(published.html,/<blockquote cite="\/sources\/quote">Quotation<\/blockquote>/);
 assert.match(published.html,/src="img\/rhino.png"/);
 assert.match(published.html,/Figure note/);
 assert.equal(JSON.stringify(original),before,'publication must not mutate the source document');
});
test('unknown block class and unsafe IDs and citation are rejected, not silently dropped',()=>{
 for(const [mutate,code] of [
  [d=>d.titleId='a b','INVALID_TITLE_ID'],
  [d=>d.lexicalState.root.children[0].children[0].id='bad id','INVALID_HEADING_ID'],
  [d=>d.lexicalState.root.children[0].children[1].tufteClass='unsafe','INVALID_PARAGRAPH_CLASS'],
  [d=>d.lexicalState.root.children[0].children[2].cite='javascript:alert(1)','INVALID_QUOTE_CITE'],
  [d=>d.lexicalState.root.children[0].children[3].children[1].src='img/../secret.png','UNSAFE_URL'],
 ]){
  const d=fixture();mutate(d);
  const result=renderArticle(d);
  assert.equal(result.ok,false);
  assert.ok(result.diagnostics.some(d=>d.code===code),JSON.stringify(result.diagnostics));
 }
});
test('title anchor conflicts with document heading, article or generated note IDs fail closed',()=>{
 const first=fixture();first.lexicalState.root.children[0].children[0].id=first.titleId;
 assert.ok(renderArticle(first).diagnostics.some(d=>d.code==='DUPLICATE_TITLE_ID'));
 const second=fixture();second.titleId='official-attributes-article';
 assert.ok(renderArticle(second).diagnostics.some(d=>d.code==='DUPLICATE_TITLE_ID'));
 const third=fixture();third.titleId='tufte-19-official-attributes-figure-margin';
 const published=renderArticle(third);
 assert.equal(published.ok,false);
 assert.ok(published.diagnostics.some(d=>d.code==='DUPLICATE_TITLE_ID'));
});

test('F06 ordered list start and item value are not silently discarded',()=>{
 const doc=fixture();
 const section=doc.lexicalState.root.children[0];
 section.children.push(element('list',[
  element('listitem',[text('First')],{value:4}),
  element('listitem',[text('Second')],{value:9})
 ],{listType:'number',tag:'ol',start:4}));
 const before=structuredClone(doc);
 const published=renderArticle(doc);
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
 assert.match(published.html,/<ol[^>]*start="4"/);
 assert.match(published.html,/<li[^>]*value="9"/);
 assert.deepEqual(doc,before,'publication must preserve canonical list metadata');
});

test('F03 link metadata survives publication or fails closed with a diagnostic',()=>{
 const doc=fixture();
 const section=doc.lexicalState.root.children[0];
 section.children.push(element('paragraph',[
  element('link',[text('Reference')],{url:'https://example.org/reference',target:'_blank',rel:'noopener noreferrer',title:'Reference title'})
 ]));
 const before=structuredClone(doc);
 const published=renderArticle(doc);
 if(published.ok){
  assert.match(published.html,/<a\b[^>]*href="https:\/\/example\.org\/reference"/);
  assert.match(published.html,/<a\b[^>]*target="_blank"/);
  assert.match(published.html,/<a\b[^>]*title="Reference title"/);
  assert.match(published.html,/<a\b[^>]*rel="noopener noreferrer"/);
 }else{
  assert.equal(published.html,null);
  assert.ok(published.diagnostics.some(d=>d.code==='UNSUPPORTED_RENDER_PROPERTY'),JSON.stringify(published.diagnostics));
 }
 assert.deepEqual(doc,before,'publication must not mutate link attributes');
});

test('F06 unordered list item with nondefault value must not be silently published',()=>{
 const doc=fixture();
 doc.lexicalState.root.children[0].children.push(element('list',[
  element('listitem',[text('Nondefault bullet')],{value:7})
 ],{listType:'bullet',tag:'ul',start:1}));
 assert.equal(validateDocument(doc).ok,true,'schema acceptance is distinct from renderer capability');
 const before=structuredClone(doc);
 const result=renderArticle(doc);
 assert.equal(result.ok,false,'bullet value=7 must be rejected rather than dropped');
 assert.equal(result.html,null);
 assert.ok(result.diagnostics.some(d=>d.code==='UNSUPPORTED_RENDER_PROPERTY'&&d.path.includes('value')),JSON.stringify(result.diagnostics));
 assert.deepEqual(doc,before);
});

test('F03 host reference is preserved as semantic reference, not fabricated href',()=>{
 const doc=fixture();
 doc.lexicalState.root.children[0].children.push(element('paragraph',[
  element('host-link',[text('Linked title')],{reference:{namespace:'magnolia',kind:'note',id:'note-123'}})
 ]));
 assert.equal(validateDocument(doc).ok,true);
 const before=structuredClone(doc);
 const result=renderArticle(doc);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/Linked title/);
 assert.match(result.html,/data-host-/,'host reference metadata must survive publication');
 assert.doesNotMatch(result.html,/<a\\b[^>]*href="[^"]*"[^>]*>Linked title<\\/a>/,'unresolved reference must not become a guessed URL');
 assert.deepEqual(doc,before);
});

test('F06 unordered list start is diagnosed instead of silently discarded',()=>{
 const doc=fixture();
 doc.lexicalState.root.children[0].children.push(element('list',[
  element('listitem',[text('Bullet')],{value:1})
 ],{listType:'bullet',tag:'ul',start:5}));
 assert.equal(validateDocument(doc).ok,true);
 const before=structuredClone(doc);
 const published=renderArticle(doc);
 assert.equal(published.ok,false);
 assert.equal(published.html,null);
 assert.ok(published.diagnostics.some(d=>d.code==='UNSUPPORTED_RENDER_PROPERTY'&&d.path.endsWith('.start')),JSON.stringify(published.diagnostics));
 assert.deepEqual(doc,before);
});
