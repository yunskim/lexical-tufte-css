import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderArticle} from '../dist/index.js';

const text=value=>({type:'text',version:1,format:0,text:value});
const figure=noteType=>({
 schemaVersion:1,id:'figure-note',locale:'en',title:'Figure margin note',assets:[],
 lexicalState:{root:{type:'root',version:1,children:[{
  type:'tufte-section',version:1,children:[{
   type:'tufte-figure',version:1,width:'body',children:[
    {type:'tufte-inline-image',version:1,src:'/fixture.svg',alt:'Figure'},
    {type:noteType,version:1,noteId:'figure-margin',children:[text('Margin text')]},
    {type:'tufte-caption',version:1,children:[text('Caption')]}
   ]
  }]
 }]}}
});
test('figure margin note publishes with its checkbox, label and payload',()=>{
 const result=renderArticle(figure('tufte-marginnote'));
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<figure/);
 assert.match(result.html,/data-tufte-note="figure-margin"/);
 assert.match(result.html,/class="margin-toggle"/);
 assert.match(result.html,/class="marginnote"/);
 assert.match(result.html,/Margin text/);
 assert.match(result.html,/<figcaption/);
});
test('figure sidenote is rejected by the document schema',()=>{
 const result=renderArticle(figure('tufte-sidenote'));
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='INVALID_CHILD'||d.code==='INVALID_FIGURE_NOTE'));
});
