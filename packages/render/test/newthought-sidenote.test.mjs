import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderArticle} from '../dist/index.js';

const element=(type,children,fields={})=>({type,version:1,children,direction:null,format:'',indent:0,...fields});
const text=value=>({type:'text',version:1,text:value,format:0,detail:0,mode:'normal',style:''});
const documentWithNote=(kind='sidenote',trailing=true)=>({
 schemaVersion:1,id:'newthought-fixture',locale:'en-US',title:'Tufte CSS',assets:[],
 lexicalState:{root:{...element('root',[
  element('tufte-section',[element('paragraph',[
   element('tufte-span',trailing?[text('In his later books'),element('tufte-note',[text('Beautiful Evidence')],{noteId:'sn-in-his-later-books',kind})]:[element('tufte-note',[text('Beautiful Evidence')],{noteId:'sn-in-his-later-books',kind}),text('In his later books')],{kind:'newthought'}),
   text(', Tufte starts each section.')
  ])])
 ]),textFormat:0,textStyle:''}}
});
test('newthought note publishes label inside span and input/payload outside',()=>{
 const result=renderArticle(documentWithNote());
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<span class="newthought">In his later books<label /);
 assert.match(result.html,/<\/label><\/span><input /);
 assert.match(result.html,/<\/input>|<input [^>]*><span class="sidenote">/);
 assert.doesNotMatch(result.html,/data-tufte-note/);
});
test('marginnote cannot be a newthought sidenote anchor',()=>{
 const result=renderArticle(documentWithNote('marginnote'));
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='INVALID_NEWTHOUGHT_NOTE'));
});
test('newthought anchor must be last child',()=>{
 const result=renderArticle(documentWithNote('sidenote',false));
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='INVALID_NEWTHOUGHT_NOTE'));
});
