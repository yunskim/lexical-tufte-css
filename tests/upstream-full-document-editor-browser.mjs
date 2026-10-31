import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {renderArticle} from '../packages/render/dist/index.js';
import {reconstructPinnedArticle} from './helpers/pinned-upstream-article.mjs';

// This is the *actual React Lexical editor* companion to the pure
// all-nine-section roundtrip test. It verifies keyboard editing and history;
// setting one JSON text property in a fixture is not an editor UX test.
const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const modernFrame=Object.freeze({
 src:'https://www.youtube-nocookie.com/embed/YslQ2625TR4',
 title:'YouTube video: Tufte CSS example',
 loading:'lazy',referrerpolicy:'strict-origin-when-cross-origin',
 sandbox:'allow-scripts allow-same-origin allow-presentation',
 width:'960',height:'540',allowfullscreen:''
});
const modernCode='<figure class="iframe-wrapper">\n'+
 '  <iframe src="'+modernFrame.src+'" title="'+modernFrame.title+
 '" loading="'+modernFrame.loading+'" referrerpolicy="'+modernFrame.referrerpolicy+
 '" sandbox="'+modernFrame.sandbox+'" width="'+modernFrame.width+
 '" height="'+modernFrame.height+'" allowfullscreen></iframe>\n</figure>';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174',
 '--strictPort','--force','--config','../../tests/vite-publication.config.mjs'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  let ready=false;
  try{const response=await fetch(url);ready=response.ok;}catch{}
  if(ready)break;
  if(i===99)throw Error('React editor preview never became available');
  await setTimeout(100);
 }
 browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage();
 page.setDefaultTimeout(10000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>
  route.request().url().startsWith(url)?route.continue():route.abort()
 );
 // App readiness is asserted below; unrelated load completion is not a gate.
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.editor').waitFor();
 const reconstructed=await page.evaluate(reconstructPinnedArticle,{
  html:upstream,modernFrame,modernCode
 });
 const document=reconstructed.document,original=document.lexicalState;
 assert.equal(original.root.children.length,9);
 await page.evaluate(state=>localStorage.setItem(
  'lexical-tufte-p1',JSON.stringify(state)
 ),original);
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 await page.getByRole('status',{name:'편집 작업 상태'}).filter({
  hasText:'저장한 문서를 불러왔습니다.'
 }).waitFor();
 const readEditorJSON=async()=>{
  await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
  const inspection=page.locator('details').filter({has:page.locator('textarea[aria-label="문서 JSON"]')});
  if(await inspection.getAttribute('open')===null)await inspection.locator('summary').click();
  return JSON.parse(await page.getByRole('textbox',{
   name:'문서 JSON',exact:true
  }).inputValue());
 };
 const loaded=await readEditorJSON();
 assert.deepEqual(loaded,original,'Actual React editor lost demo content during restore');
 assert.equal(await page.locator('.editor > section').count(),9);
 assert.equal(await page.locator('.editor .epigraph > blockquote').count(),3);
 assert.equal(await page.locator('.editor figure').count(),4,
  'Two regular/fullwidth demo figures plus two ImageQuilts figures');
 // The editing decorator intentionally uses a non-iframe placeholder;
 // the published renderer, checked below, owns the real iframe.
 assert.equal(await page.locator('.editor [data-embed-provider="youtube"]').count(),1);
 assert.equal(errors.length,0,errors.join('\n'));

 const paragraph=page.locator('.editor > section').first().locator('p').first();
 await paragraph.click();
 await page.keyboard.insertText(' [single-article-edit]');
 const edited=await readEditorJSON();
 const value=edited.root.children[0].children[0].children.map(node=>
  node.type==='text'?node.text:'').join('');
 assert.match(value,/\[single-article-edit\]/);
 assert.deepEqual(edited.root.children.slice(1),original.root.children.slice(1),
  'Typing in the first paragraph must not change the other eight sections');
 assert.equal(edited.root.children.length,9);
 assert.equal(errors.length,0,errors.join('\n'));

 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 assert.deepEqual(await readEditorJSON(),original,
  'A single input edit must be undone without changing the pinned article');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();
 assert.deepEqual(await readEditorJSON(),edited,
  'Redo must restore the exact edited nine-section Lexical state');

 await page.getByRole('button',{name:'저장',exact:true}).click();
 const diskState=await page.evaluate(()=>
  JSON.parse(localStorage.getItem('lexical-tufte-p1')??'null'));
 assert.deepEqual(diskState,edited,'Actual Save must persist all sections');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.editor').waitFor();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 await page.getByRole('status',{name:'편집 작업 상태'}).filter({
  hasText:'저장한 문서를 불러왔습니다.'
 }).waitFor();
 assert.deepEqual(await readEditorJSON(),edited,
  'Actual reload/restore changed the edited document');

 const restoredDocument={
  ...document,lexicalState:edited
 };
 const published=renderArticle(restoredDocument);
 const baseline=renderArticle(document);
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
 assert.equal(baseline.ok,true,JSON.stringify(baseline.diagnostics));
 const DOM=await page.evaluate(({before,after})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const baseline=[...parse(before).querySelectorAll('article > section')];
  const changed=[...parse(after).querySelectorAll('article > section')];
  return {
   baseCount:baseline.length,afterCount:changed.length,
   untouched:baseline.slice(1).map(node=>node.outerHTML),
   publishedUntouched:changed.slice(1).map(node=>node.outerHTML),
   firstChanged:changed[0]?.textContent.includes('[single-article-edit]')??false,
   notes:changed.reduce((sum,node)=>sum+node.querySelectorAll('input.margin-toggle').length,0),
   frames:changed.reduce((sum,node)=>sum+node.querySelectorAll('figure.iframe-wrapper > iframe').length,0)
  };
 },{before:baseline.html,after:published.html});
 assert.equal(DOM.baseCount,9);
 assert.equal(DOM.afterCount,9);
 assert.equal(DOM.firstChanged,true);
 assert.equal(DOM.notes,7);
 assert.equal(DOM.frames,1);
 assert.deepEqual(DOM.publishedUntouched,DOM.untouched,
  'Actual editor changes must not rewrite notes, figures or the other eight sections');
 assert.deepEqual(errors,[],'React runtime raised a browser exception');
 console.log('Nine-section real React editor: load, keyboard input, undo/redo, save/reload, immutable eight sections and pure publication parity.');
}finally{
 await browser?.close();
 server?.kill();
}
