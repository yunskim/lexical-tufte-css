import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174',
 '--strictPort','--config','../../tests/vite-publication.config.mjs'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');
  await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage();page.setDefaultTimeout(8000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 const editor=page.locator('.editor');await editor.waitFor();
 await editor.click();await page.keyboard.press('Control+End');
 await page.keyboard.insertText('MANUAL-CANONICAL');
 await page.getByRole('button',{name:'저장',exact:true}).click();
 const canonical=await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1'));
 assert.ok(canonical?.includes('MANUAL-CANONICAL'));
 await editor.click();await page.keyboard.press('Control+End');
 await page.keyboard.insertText(' AUTOSAVE-ONLY');
 await page.waitForFunction(()=>{
  return Object.keys(localStorage).some(key=>{
   if(!key.startsWith('lexical-tufte-recovery-v2:'))return false;
   try{return JSON.parse(localStorage.getItem(key)).state?.root&&
    localStorage.getItem(key).includes('AUTOSAVE-ONLY');}catch{return false;}
  });
 },null,{timeout:10000});
 const recovery=await page.evaluate(()=>Object.entries(localStorage)
  .filter(([key,value])=>key.startsWith('lexical-tufte-recovery-v2:')&&value.includes('AUTOSAVE-ONLY')));
 assert.ok(recovery.length>0,'Autosave should persist an unsaved edit to recovery storage');
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical,
  'Autosave must not overwrite the manually saved canonical document');
 await page.getByRole('button',{name:'저장',exact:true}).click();
 const updated=await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1'));
 assert.ok(updated?.includes('AUTOSAVE-ONLY'),'Explicit Save should update canonical storage');
 assert.notEqual(updated,canonical);
 for(const [key,value] of recovery){
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),value,
   'Manual Save must not delete existing recovery snapshots');
 }
 assert.deepEqual(errors,[]);
 console.log('Autosave recovery and explicit canonical save remain isolated.');
}finally{await browser?.close();server?.kill();}
