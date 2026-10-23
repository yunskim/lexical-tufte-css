import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderArticle} from '../dist/index.js';

const element=(type,children,fields={})=>({type,version:1,children,direction:null,format:'',indent:0,...fields});
const text=value=>({type:'text',version:1,text:value,format:0,detail:0,mode:'normal',style:''});
const documentWithNote=(kind='sidenote',position='after')=>{
 const note=element(kind==='sidenote'?'tufte-sidenote':'tufte-marginnote',[text('Beautiful Evidence')],{noteId:'sn-in-his-later-books'});
 const span=element('tufte-span',[text('In his later books')],{kind:'newthought'});
 const children=position==='before'?[note,span]:position==='separated'?[span,text(' '),note]:[span,note];
 return {
  schemaVersion:1,id:'newthought-fixture',locale:'en-US',title:'Tufte CSS',assets:[],
  lexicalState:{root:{...element('root',[
   element('tufte-section',[element('paragraph',[...children,text(', Tufte starts each section.')])])
  ]),textFormat:0,textStyle:''}}
 };
};
test('adjacent newthought and sidenote publish label inside span and payload outside',()=>{
 const result=renderArticle(documentWithNote());
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<span class="newthought">In his later books<label /);
 assert.match(result.html,/<\/label><\/span><input /);
 assert.match(result.html,/<input [^>]*><span class="sidenote">/);
 assert.doesNotMatch(result.html,/data-tufte-note/);
});
test('marginnote remains a separate sibling and does not become a numbered sidenote',()=>{
 const result=renderArticle(documentWithNote('marginnote'));
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<\/span><label /);
 assert.match(result.html,/<span class="marginnote">/);
});
test('sidenote before newthought does not move its label into the following span',()=>{
 const result=renderArticle(documentWithNote('sidenote','before'));
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<span class="sidenote">/);
 assert.match(result.html,/<span class="newthought">In his later books<\/span>/);
});
test('intervening text prevents newthought and sidenote pairing',()=>{
 const result=renderArticle(documentWithNote('sidenote','separated'));
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<span class="newthought">In his later books<\/span>/);
 assert.match(result.html,/<span class="sidenote">/);
});
