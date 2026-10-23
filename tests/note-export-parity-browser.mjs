import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {chromium} from 'playwright';
import {renderArticle} from '../packages/render/dist/index.js';

// Same canonical document, two output paths:
// 1. real Lexical $generateHtmlFromNodes (HTML export/clipboard)
// 2. validated document publisher (Tufte CSS publication)
const source=JSON.parse(readFileSync('fixtures/tufte/server-document.json','utf8'));
const section=source.lexicalState.root.children[0];
const figure=section.children.find(node=>node.type==='tufte-figure');
assert.ok(figure,'server fixture must contain a figure');
figure.children.splice(1,0,{
 children:[{detail:0,format:0,mode:'normal',style:'',text:'Figure margin',type:'text',version:1}],
 direction:null,format:'',indent:0,type:'tufte-marginnote',version:1,noteId:'figure-margin-export'
});
// The logical model keeps newthought and sidenote as siblings. Both HTML
// exporters must reproduce the upstream split-parent control markup.
const existingParagraph=section.children.find(node=>node.type==='paragraph');
assert.ok(existingParagraph);
const text=value=>({type:'text',version:1,text:value,format:0,detail:0,mode:'normal',style:''});
const inline=(type,children,extra={})=>({
 type,version:1,children,direction:null,format:'',indent:0,...extra
});
section.children.push({
 ...structuredClone(existingParagraph),
 children:[
  inline('tufte-span',[text('In his later books')],{kind:'newthought'}),
  inline('tufte-sidenote',[text('Reference')],{noteId:'split-parent-export'}),
  text(' this is a separate paragraph.')
 ]
});
// Text between the nodes must prevent the split-parent special case.
section.children.push({
 ...structuredClone(existingParagraph),
 children:[
  inline('tufte-span',[text('Another heading')],{kind:'newthought'}),
  text(' intervening text '),
  inline('tufte-sidenote',[text('Separate note')],{noteId:'separated-export'})
 ]
});
// A marginnote next to newthought retains its ordinary sibling controls.
section.children.push({
 ...structuredClone(existingParagraph),
 children:[
  inline('tufte-span',[text('Margin heading')],{kind:'newthought'}),
  inline('tufte-marginnote',[text('Ordinary margin')],{noteId:'margin-after-newthought-export'})
 ]
});
const published=renderArticle(source);
assert.equal(published.ok,true,JSON.stringify(published.diagnostics));

const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174',
 '--strictPort','--force','--config','../../tests/vite-publication.config.mjs'
],{cwd:'examples/editor',stdio:'ignore'});
for(let i=0;i<100;i++){
 try{const response=await fetch(url);if(response.ok)break;}catch{}
 if(i===99){server?.kill();throw Error('Editor server did not become ready');}
 await setTimeout(100);
}
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
}).catch(error=>{server?.kill();throw error;});

try{
 const page=await browser.newPage();
 page.setDefaultTimeout(5000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 await page.goto(url);
 const harnessPath='/@fs'+new URL('../packages/lexical/test/publication-browser-harness.mjs',import.meta.url).pathname;
 const lexical=await page.evaluate(async ({path,document})=>{
  const {mountPublicationHarness}=await import(path);
  const harness=mountPublicationHarness(document);
  try{return harness.snapshot();}
  finally{harness.dispose();}
 },{path:harnessPath,document:source});
 assert.deepEqual(lexical.document.lexicalState,source.lexicalState,'Lexical editor load/export must preserve note identities and content');
 assert.doesNotMatch(lexical.html,/data-tufte-note|tufte-note-editor/,'HTML export must not leak obsolete or editing-only note wrappers');

 const compared=await page.evaluate(({lexicalHtml,publicationHtml})=>{
  function notes(markup){
   const dom=new DOMParser().parseFromString(markup,'text/html');
   return [...dom.querySelectorAll('span.sidenote,span.marginnote')].map(payload=>{
    const input=payload.previousElementSibling;
    const preceding=input?.previousElementSibling;
    const label=preceding?.matches('span.newthought')
     ?preceding.lastElementChild
     :preceding;
    const splitParent=label?.closest('span.newthought')===preceding;
    return {
     id:input?.id,
     kind:payload.className,
     labelClass:label?.className,
     glyph:label?.textContent,
     checkbox:input?.tagName==='INPUT'&&input.type==='checkbox',
     accessibleName:input?.getAttribute('aria-label'),
     paired:!!input?.id&&label?.htmlFor===input.id,
     adjacent:input?.nextElementSibling===payload&&
      (splitParent?preceding?.nextElementSibling===input:label?.nextElementSibling===input),
     sharedParent:payload.parentElement===input?.parentElement&&
      (splitParent?preceding?.parentElement===input?.parentElement:label?.parentElement===input?.parentElement),
     splitParent,
     inFigure:!!payload.closest('figure'),
     text:payload.textContent,
     strong:!!payload.querySelector('strong'),
     links:[...payload.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.textContent})),
     images:[...payload.querySelectorAll('img')].map(img=>({src:img.getAttribute('src'),alt:img.getAttribute('alt')}))
    };
   });
  }
  return {lexical:notes(lexicalHtml),publication:notes(publicationHtml)};
 },{lexicalHtml:lexical.html,publicationHtml:published.html});

 const expectedKinds=['sidenote','marginnote','marginnote','sidenote','sidenote','marginnote'];
 const expectedIds=[
  'server-note','server-margin','figure-margin-export','split-parent-export',
  'separated-export','margin-after-newthought-export'
 ];
 const semantic=notes=>notes.map(({id,...rest})=>rest);
 for(const [route,notes] of Object.entries(compared)){
  assert.equal(notes.length,6,route+': all six notes should be exported');
  assert.deepEqual(notes.map(note=>note.kind),expectedKinds,route+': note types and document order');
  assert.deepEqual(notes.map(note=>note.inFigure),[false,false,true,false,false,false],route+': note location');
  assert.deepEqual(notes.map(note=>note.splitParent),[false,false,false,true,false,false],route+': upstream split-parent note markup');
  assert.equal(new Set(notes.map(note=>note.id)).size,6,route+': unique toggle IDs');
  for(let i=0;i<notes.length;i++){
   assert.ok(notes[i].id?.endsWith(expectedIds[i]),route+': stable note identity '+expectedIds[i]);
   assert.equal(notes[i].checkbox,true);
   assert.equal(notes[i].accessibleName,
    notes[i].kind==='sidenote'?'Toggle sidenote':'Toggle margin note',
    route+': note has an explicit accessible name');
   assert.equal(notes[i].paired,true);
   assert.equal(notes[i].adjacent,true);
   assert.equal(notes[i].sharedParent,true);
  }
 }
 assert.deepEqual(semantic(compared.lexical),semantic(compared.publication),
  'Lexical HTML export and publication must agree on note controls, content and rich descendants');
 assert.equal(compared.lexical[0].strong,true,'rich sidenote retains bold emphasis');
 assert.deepEqual(compared.lexical[0].links,[{href:'https://lexical.dev',text:'문서'}]);
 assert.deepEqual(compared.lexical[0].images,[{src:'/fixture.svg',alt:'주석 그림'}]);
 assert.deepEqual(compared.lexical[2].text,'Figure margin');
 assert.deepEqual(compared.lexical[3].text,'Reference');
 assert.deepEqual(compared.lexical[4].text,'Separate note');
 assert.deepEqual(compared.lexical[5].text,'Ordinary margin');
 assert.deepEqual(errors,[]);
 console.log('Note HTML parity: rich notes, figure notes and newthought split-parent/negative cases agree between Lexical and publisher (IDs normalized only).');
}finally{
 await browser.close();
 server?.kill();
}
