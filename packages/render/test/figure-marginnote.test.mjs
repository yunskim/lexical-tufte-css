import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderArticle} from '../dist/index.js';

const element=(type,children,fields={})=>({type,version:1,children,direction:null,format:'',indent:0,...fields});
const text=value=>({type:'text',version:1,text:value,format:0,detail:0,mode:'normal',style:''});
const figure=(noteType,placement='before-image')=>element('tufte-figure',[
 ...(placement==='before-image'&&noteType?[element(noteType,[text('Additional context')],{noteId:'figure-context'})]:[]),
 element('tufte-inline-image',[],{src:'https://example.com/figure.png',alt:'Diagram'}),
 ...(placement==='after-image'&&noteType?[element(noteType,[text('Additional context')],{noteId:'figure-context'})]:[]),
 element('tufte-caption',[text('A figure caption')])
],{width:'body'});
const doc=(noteType,placement='before-image')=>({
 schemaVersion:1,id:'figure-margin-fixture',locale:'en-US',title:'Figure notes',assets:[],
 lexicalState:{root:{...element('root',[element('tufte-section',[figure(noteType,placement)])]),textFormat:0,textStyle:''}}
});

test('figure marginnote is accepted and published with its image and caption',()=>{
 const result=renderArticle(doc('tufte-marginnote'));
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<figure>/);
 assert.match(result.html,/<img src="https:\/\/example.com\/figure.png" alt="Diagram"/);
 assert.match(result.html,/<figcaption>A figure caption<\/figcaption>/);
 assert.match(result.html,/<span class="marginnote">Additional context<\/span>/);
 assert.ok(result.html.indexOf('class="marginnote"')<result.html.indexOf('<img '));
});

test('figure sidenote is rejected by document validation',()=>{
 const result=renderArticle(doc('tufte-sidenote'));
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='INVALID_CHILD'||d.code==='INVALID_FIGURE_NOTE'));
});

test('figure marginnote after image preserves source order and responsive control adjacency',()=>{
 const result=renderArticle(doc('tufte-marginnote','after-image'));
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const html=result.html;
 assert.ok(html.indexOf('<img ')<html.indexOf('class="marginnote"'));
 assert.match(html,/<label for="([^"]+)" class="margin-toggle">⊕<\/label><input id="\1" type="checkbox" class="margin-toggle"><span class="marginnote">Additional context<\/span>/);
});
test('figure marginnote before image also preserves adjacent checkbox and span',()=>{
 const result=renderArticle(doc('tufte-marginnote','before-image'));
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<label for="([^"]+)" class="margin-toggle">⊕<\/label><input id="\1" type="checkbox" class="margin-toggle"><span class="marginnote">Additional context<\/span><img /);
});
