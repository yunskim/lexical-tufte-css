import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL ? null : spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort','--force'],{cwd:'examples/editor',stdio:'ignore'});
for(let i=0;i<100;i++){
 try{const response=await fetch(url);if(response.ok)break;}catch{}
 if(i===99){server?.kill();throw Error('Editor server did not become ready');}
 await setTimeout(100);
}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']}).catch(error=>{server?.kill();throw error;});
import {readFileSync} from 'node:fs';
import {renderArticle} from '../packages/render/dist/index.js';
const doc=JSON.parse(readFileSync('fixtures/tufte/server-document.json','utf8'));
const css=readFileSync('fixtures/tufte/upstream/tufte.css','utf8')+'\n'+readFileSync('packages/render/styles.css','utf8');
try {
 const page=await browser.newPage();page.setDefaultTimeout(5000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('.editor').waitFor();
 await page.evaluate(state=>localStorage.setItem('lexical-tufte-p1',JSON.stringify(state)),doc.lexicalState);
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
 if(!await page.locator('details').evaluate(e=>e.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
 const browserHTML=await page.getByRole('textbox',{name:'발행 HTML',exact:true}).inputValue();
 assert.deepEqual(errors,[]);
 const result=renderArticle(doc);assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const staticPage=await browser.newPage({javaScriptEnabled:false});
 async function inspect(markup,width){
  await staticPage.setViewportSize({width,height:1100});
  await staticPage.setContent(`<style>${css}</style>${markup}`);
  return staticPage.evaluate(()=>{
   const section=document.querySelector('article > section');const r=section.getBoundingClientRect();
   return {tags:[...section.children].map(e=>e.tagName+(e.className?'.'+e.className:'')),text:section.textContent,
    notes:[...section.querySelectorAll('.sidenote,.marginnote')].map(e=>e.textContent),
    captions:section.querySelectorAll('figure > figcaption').length,tables:section.querySelectorAll('table').length,
    ratios:['p','figure','figure.fullwidth','table','table.fullwidth','.table-wrapper'].map(s=>Math.round(section.querySelector(s).getBoundingClientRect().width/r.width*1000)),
    scripts:document.scripts.length,editing:section.querySelectorAll('[contenteditable],[data-tufte-editor]').length};
  });
 }
 for(const width of [1440,761,760,759,375]){
  const actual=await inspect(result.html,width);const reference=await inspect(`<article>${browserHTML}</article>`,width);
  assert.deepEqual(actual,reference,`SSR versus browser export at ${width}`);
 }
 const second=renderArticle(doc,{idPrefix:'second'});assert.equal(second.ok,true);
 await staticPage.setViewportSize({width:375,height:1100});
 await staticPage.setContent(`<style>${css}</style>${result.html}${second.html}`);
 assert.equal(await staticPage.locator('script').count(),0);
 const firstNote=staticPage.locator('#server-fixture-article input.margin-toggle[id$="-server-note"]');
 const secondNote=staticPage.locator('#second-article input.margin-toggle[id$="-server-note"]');
 assert.equal(await firstNote.count(),1);
 assert.equal(await secondNote.count(),1);
 const firstId=await firstNote.getAttribute('id'),secondId=await secondNote.getAttribute('id');
 assert.notEqual(firstId,secondId);assert.match(firstId,/^tufte-14-server-fixture-/);assert.match(secondId,/^tufte-6-second-/);
 assert.equal(await firstNote.isChecked(),false);
 await staticPage.locator('label[for="'+firstId+'"]').click();
 assert.equal(await firstNote.isChecked(),true);
 assert.equal(await secondNote.isChecked(),false);
 assert.equal(await firstNote.locator('xpath=following-sibling::span[1]').isVisible(),true);
 assert.equal(await secondNote.locator('xpath=following-sibling::span[1]').isVisible(),false);
 assert.equal(await staticPage.locator('#server-fixture-article [data-tufte-note]').count(),0,
  'Published notes must not leak a non-upstream wrapper');
 console.log('Server/browser semantic and geometry parity: 5 widths; no-JS mobile toggles and article namespaces passed.');
} finally {await browser.close();server?.kill();}
