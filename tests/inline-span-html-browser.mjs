import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {chromium} from 'playwright';
import {renderArticle} from '../packages/render/dist/index.js';
const url='http://127.0.0.1:5178/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5178','--strictPort','--force','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 const path='/@fs'+new URL('../packages/lexical/test/inline-html-browser-harness.mjs',import.meta.url).pathname;
 const imported=html=>page.evaluate(async ({path,html})=>(await import(path)).roundtripInlineHTML(html),{path,html});
 const fragment=html=>page.evaluate(html=>new DOMParser().parseFromString(html,'text/html').querySelector('a').outerHTML,html);
 for(const kind of ['sans','newthought','numeral','danger']){
  for(const [alignment,style] of [['',''],[' tufte-align-right',''],['',' style="text-align: right;"']]){
   const source=`<a href="https://example.org/source"><span class="${kind}${alignment}"${style} dir="rtl"><strong>선택</strong><code>x &lt; y</code></span></a>`;
   const first=await imported(source);assert.equal(first.ok,true,first.message);
   const link=first.document.lexicalState.root.children[0].children[0].children[0],span=link.children[0];
   assert.equal(link.url,'https://example.org/source');assert.equal(span.kind,kind);assert.equal(span.direction,'rtl');
   assert.equal(span.format,alignment||style?'right':'');assert.deepEqual(span.children.map(n=>[n.text,n.format]),[['선택',1],['x < y',16]]);
   const native=await imported(await fragment(first.html));assert.equal(native.ok,true,native.message);
   assert.deepEqual(native.document,first.document,'Native HTML must preserve kind, URL, format and text');
   const published=renderArticle(first.document);assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
   const reopened=await imported(await fragment(published.html));assert.equal(reopened.ok,true,reopened.message);
   assert.deepEqual(reopened.document,first.document,'Published HTML must preserve the same inline fragment');
  }
 }
 for(const attrs of ['class="sans newthought"','class="sans unknown"','class="sans tufte-align-bad"','class="sans" onclick="bad()"','class="sans" data-extra="lost"','class="sans" dir="auto"','class="sans" style="color:red"','class="sans" style="not-css:value"','class="sans tufte-align-right" style="text-align:left"','class="sans" style="text-align:right; color:red"','class="sans" style="text-align:right !important"','class="sans" style="text-align:right; text-align:left"']){
  const result=await imported(`<span ${attrs}>rejected</span>`);
  assert.equal(result.ok,false,attrs);assert.match(result.message,/Tufte span HTML/);
  assert.equal(result.statePreserved,true,'Rejected fragment must retain the existing editor state');
 }
 assert.deepEqual(errors,[]);
 console.log('P2.2.b.1 inline HTML: four kinds, rich link text, direction/alignment, native and publisher roundtrips; unsupported Tufte attributes reject.');
}finally{await browser?.close();server.kill();}
