import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDocument} from '../dist/index.js';
import {renderArticle} from '../../render/dist/index.js';

const fixture=()=>JSON.parse(readFileSync(
 new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'
));
const node=(type,children,extra={})=>({type,version:1,children,...extra});
const t=value=>({type:'text',version:1,text:value,format:0});
const section=doc=>doc.lexicalState.root.children[0];

test('p.sans and blockquote[cite] preserve exact wire type, safe attributes and source content',()=>{
 const doc=fixture();
 const quoteURL='http://www.edwardtufte.com/bboard/q-and-a-fetch-msg?msg_id=0000hB';
 section(doc).children.push(
  node('paragraph',[t('Gill Sans')],{tufteClass:'sans'}),
  node('quote',[node('paragraph',[t('Quotation')])],{cite:quoteURL})
 );
 const before=JSON.stringify(doc);
 const valid=validateDocument(doc);
 assert.equal(valid.ok,true,JSON.stringify(valid.diagnostics));
 const rendered=renderArticle(doc);
 assert.equal(rendered.ok,true,JSON.stringify(rendered.diagnostics));
 assert.match(rendered.html,/<p class="sans">Gill Sans<\/p>/);
 assert.ok(rendered.html.includes('<blockquote cite="'+quoteURL+'"><p>Quotation</p></blockquote>'));
 assert.equal(JSON.stringify(doc),before,'rendering must be non-mutating');
 assert.equal(section(doc).children.at(-2).type,'paragraph');
 assert.equal(section(doc).children.at(-1).type,'quote');
});

test('unsupported paragraph classes and unsafe quotation cites fail closed',()=>{
 for(const bad of ['',null,42,'newthought','sans serif','sans" onclick="x']){
  const doc=fixture();
  section(doc).children.push(node('paragraph',[t('x')],{tufteClass:bad}));
  const r=validateDocument(doc);
  assert.equal(r.ok,false,String(bad));
  assert.ok(r.diagnostics.some(x=>x.code==='INVALID_PARAGRAPH_CLASS'),JSON.stringify(r.diagnostics));
 }
 for(const bad of ['',null,7,'javascript:alert(1)','//evil.test','data:text/html,evil','https://name:password@example.com/a']){
  const doc=fixture();
  section(doc).children.push(node('quote',[t('Quotation')],{cite:bad}));
  const r=validateDocument(doc);
  assert.equal(r.ok,false,String(bad));
  assert.ok(r.diagnostics.some(x=>x.code==='INVALID_QUOTE_CITE'),JSON.stringify(r.diagnostics));
 }
});

test('unadorned paragraphs and quotes retain historical HTML without extra attributes',()=>{
 const doc=fixture(),s=section(doc);
 s.children.push(node('paragraph',[t('Default')]),node('quote',[t('Default quote')]));
 const result=renderArticle(doc);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<p>Default<\/p><blockquote>Default quote<\/blockquote>/);
 assert.doesNotMatch(result.html,/tufteClass=/);
});
