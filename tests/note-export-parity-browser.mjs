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
    const label=input?.previousElementSibling;
    return {
     id:input?.id,
     kind:payload.className,
     labelClass:label?.className,
     glyph:label?.textContent,
     checkbox:input?.tagName==='INPUT'&&input.type==='checkbox',
     paired:!!input?.id&&label?.htmlFor===input.id,
     adjacent:label?.nextElementSibling===input&&input?.nextElementSibling===payload,
     sharedParent:label?.parentElement===input?.parentElement&&input?.parentElement===payload.parentElement,
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

 const expectedKinds=['sidenote','marginnote','marginnote'];
 const expectedIds=['server-note','server-margin','figure-margin-export'];
 const semantic=notes=>notes.map(({id,...rest})=>rest);
 for(const [route,notes] of Object.entries(compared)){
  assert.equal(notes.length,3,route+': all three notes should be exported');
  assert.deepEqual(notes.map(note=>note.kind),expectedKinds,route+': note types and document order');
  assert.deepEqual(notes.map(note=>note.inFigure),[false,false,true],route+': note location');
  assert.equal(new Set(notes.map(note=>note.id)).size,3,route+': unique toggle IDs');
  for(let i=0;i<notes.length;i++){
   assert.ok(notes[i].id?.endsWith(expectedIds[i]),route+': stable note identity '+expectedIds[i]);
   assert.equal(notes[i].checkbox,true);
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
 assert.deepEqual(errors,[]);
 console.log('Note HTML parity: real Lexical export and renderer agree for rich sidenote, marginnote and figure marginnote (IDs normalized only).');
}finally{
 await browser.close();
 server?.kill();
}
