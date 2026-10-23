import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL ? null : spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort','--force','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
for(let i=0;i<100;i++){
 try{const response=await fetch(url);if(response.ok)break;}catch{}
 if(i===99){server?.kill();throw Error('Editor server did not become ready');}
 await setTimeout(100);
}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']}).catch(error=>{server?.kill();throw error;});
import {renderArticle} from '../packages/render/dist/index.js';

try {
 const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 await page.goto(url);
 const harnessPath='/@fs'+new URL('../packages/lexical/test/publication-browser-harness.mjs',import.meta.url).pathname;
 const initial=await page.evaluate(async path=>{const mod=await import(path);window.publicationHarness=mod.mountPublicationHarness();return window.publicationHarness.snapshot();},harnessPath);
 assert.equal(initial.document.lexicalState.root.children[0].children.length,9);
 await page.getByText('검증 용어',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.insertText(' 편집');
 await page.getByText('출처',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.insertText(' 수정');
 const edited=await page.evaluate(()=>window.publicationHarness.snapshot());
 assert.match(JSON.stringify(edited.document),/용어 편집/);assert.match(JSON.stringify(edited.document),/출처 수정/);assert.deepEqual(errors,[]);
 const publicationDoc=structuredClone(edited.document);
 for(const ratio of [0.1,1,10])publicationDoc.lexicalState.root.children[0].children.push({type:'tufte-embed',version:1,provider:'vimeo',src:'https://player.vimeo.com/video/1234',title:`비율 ${ratio}`,wrapper:'div',width:'body',aspectRatio:ratio});
 const result=renderArticle(publicationDoc);assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const staticPage=await browser.newPage({javaScriptEnabled:false});await staticPage.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 const upstreamCSS='/@fs'+new URL('../fixtures/tufte/upstream/tufte.css',import.meta.url).pathname;
 const publicationCSS='/@fs'+new URL('../packages/render/styles.css',import.meta.url).pathname;
 const csp="default-src 'none'; script-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'none'";
 await staticPage.route('**/publication-check',route=>route.fulfill({status:200,headers:{'content-type':'text/html; charset=utf-8','content-security-policy':csp},body:`<!doctype html><html lang="ko"><head><link rel="stylesheet" href="${upstreamCSS}"><link rel="stylesheet" href="${publicationCSS}"></head><body>${result.html}</body></html>`}));
 for(const width of [1440,761,760,759,375]){
  await staticPage.setViewportSize({width,height:1100});const response=await staticPage.goto(url+'publication-check');assert.equal(response.headers()['content-security-policy'],csp);
  await staticPage.locator('img.imagequilt').evaluate(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}));
  const measured=await staticPage.evaluate(()=>({
   definitions:document.querySelector('dl > dt').textContent,cite:document.querySelector('.epigraph cite').textContent,
   code:document.querySelector('pre > code').textContent,
   quilt:(()=>{const e=document.querySelector('img.imagequilt'),r=e.getBoundingClientRect();return {naturalWidth:e.naturalWidth,ratio:r.width/r.height,width:r.width,parent:e.parentElement.getBoundingClientRect().width};})(),
   embeds:[...document.querySelectorAll('.iframe-wrapper > iframe')].map(e=>{
    const r=e.getBoundingClientRect();return {
     intrinsicRatio:Number(e.getAttribute('width'))/Number(e.getAttribute('height')),
     wrapperSize:[e.parentElement.getBoundingClientRect().width,e.parentElement.getBoundingClientRect().height],
     iframeSize:[r.width,r.height],
     wrapperPosition:getComputedStyle(e.parentElement).position,
     framePosition:getComputedStyle(e).position,
     sandbox:e.getAttribute('sandbox'),title:e.title,width:r.width,
     parentChildren:e.parentElement.children.length,
     loading:e.getAttribute('loading'),referrerpolicy:e.getAttribute('referrerpolicy')
    };
   }),
   inline:document.querySelectorAll('[style],script,[contenteditable]').length,overflow:document.documentElement.scrollWidth>innerWidth,
  }));
  assert.equal(measured.definitions,'검증 용어 편집');assert.equal(measured.cite,'출처 수정');
  assert.equal(measured.code,'  <code>&\t\n    preserved');assert.ok(Math.abs(measured.quilt.ratio-2.5)<0.01,JSON.stringify({width,measured}));assert.equal(measured.quilt.naturalWidth,120);assert.ok(measured.quilt.width<=measured.quilt.parent+1);
  assert.equal(measured.embeds.length,5,'Existing two embeds and three ratio fixtures remain published');
  for(const frame of measured.embeds){
   // Official Tufte CSS uses padding-bottom:56.25% plus 25px padding-top
   // on .iframe-wrapper. The iframe must fill that reserved box; its own
   // intrinsic width/height do not drive computed layout.
   assert.equal(frame.wrapperPosition,'relative');
   assert.equal(frame.framePosition,'absolute');
   for(let axis=0;axis<2;axis++)
    assert.ok(Math.abs(frame.wrapperSize[axis]-frame.iframeSize[axis])<=1,
     JSON.stringify({width,frame,axis}));
   assert.equal(frame.parentChildren,1,'iframe must be only direct child');
   assert.match(frame.sandbox,/allow-scripts/);
   assert.ok(frame.title);
   assert.equal(frame.loading,'lazy');
   assert.equal(frame.referrerpolicy,'strict-origin-when-cross-origin');
  }
  for(const ratio of [0.1,1,10])
   assert.ok(measured.embeds.some(frame=>Math.abs(frame.intrinsicRatio-ratio)<0.02),
    width+'px intrinsic iframe dimensions lost for '+ratio);
  assert.equal(measured.inline,0);assert.equal(measured.overflow,false,`overflow ${width}`);
 }
 await staticPage.setContent(edited.html);assert.equal(await staticPage.locator('pre').getAttribute('dir'),'rtl');assert.match(await staticPage.locator('pre').getAttribute('class'),/tufte-align-right/);assert.equal(await staticPage.locator('.iframe-wrapper > iframe').count(),2);assert.equal(await staticPage.locator('.iframe-wrapper > svg').count(),0);assert.equal(await staticPage.locator('pre > code').textContent(),'  <code>&\t\n    preserved');
 assert.doesNotMatch(edited.html,/contenteditable|data-lexical-/);
 console.log('Publication regression: real definition/cite editing, strict export, code/ImageQuilt and 5 direct iframe-wrapper embeds (fixed Tufte CSS 16:9 display, intrinsic ratios preserved) at 5 widths under CSP.' );
}finally{await browser.close();server?.kill();}
