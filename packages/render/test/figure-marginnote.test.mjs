import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderArticle} from '../dist/index.js';

const element=(type,children,fields={})=>({type,version:1,children,direction:null,format:'',indent:0,...fields});
const text=value=>({type:'text',version:1,text:value,format:0,detail:0,mode:'normal',style:''});
const figure=noteType=>element('tufte-figure',[
 ...(noteType?[element(noteType,[text('Additional context')],{noteId:'figure-context'})]:[]),
 element('tufte-inline-image',[],{src:'https://example.com/figure.png',alt:'Diagram'}),
 element('tufte-caption',[text('A figure caption')])
],{width:'body'});
const doc=noteType=>({
 schemaVersion:1,id:'figure-margin-fixture',locale:'en-US',title:'Figure notes',assets:[],
 lexicalState:{root:{...element('root',[element('tufte-section',[figure(noteType)])]),textFormat:0,textStyle:''}}
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
