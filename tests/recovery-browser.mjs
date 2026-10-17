import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {readFile,unlink} from 'node:fs/promises';
const url='http://127.0.0.1:5174/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');
  await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);const editor=page.locator('.editor');await editor.waitFor();
 await editor.click();await page.keyboard.press('Control+End');await page.keyboard.insertText('복구 검증');
 // Flush before the debounce deadline, using the actual registered lifecycle handler.
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 const slots=await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.startsWith('lexical-tufte-recovery-v2:')));
 assert.equal(slots.length,1);assert.match(slots[0][1],/복구 검증/);
 const second=await context.newPage();await second.goto(url);await second.locator('.editor').waitFor();
 await second.locator('.editor').click();await second.keyboard.press('Control+End');await second.keyboard.insertText('다른 탭');
 await second.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lexical-tufte-recovery-v2:')).length),2);
 // Damaged copies are exported byte-for-byte, not parsed or silently dropped.
 const raw='{broken raw recovery';
 await page.evaluate(raw=>{localStorage.clear();localStorage.setItem('lexical-tufte-recovery-v2:damaged',raw);window.dispatchEvent(new StorageEvent('storage',{key:'lexical-tufte-recovery-v2:damaged'}));},raw);
 page.once('dialog',d=>d.accept('0'));
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'복구본 JSON 내보내기',exact:true}).click();
 const download=await downloadPromise;assert.equal(await download.failure(),null);
 const path=await download.path();assert.equal(await readFile(path,'utf8'),raw);await unlink(path);
 // Cancellation must leave the only copy untouched.
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'복구본 정리',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-recovery-v2:damaged')),raw);
 page.on('dialog',d=>d.accept(d.type()==='prompt'?'0':undefined));
 await page.getByRole('button',{name:'복구본 정리',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-recovery-v2:damaged')),null);
 assert.deepEqual(errors,[]);
 console.log('Recovery actual UI: early pagehide flush, two-tab isolation, exact damaged-JSON download, cleanup cancellation and explicit deletion PASS.');
}finally{await browser?.close();server.kill();}
