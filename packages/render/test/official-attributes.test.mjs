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
