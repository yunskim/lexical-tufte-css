import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {chromium} from 'playwright';
const url='http://127.0.0.1:5184/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5184','--strictPort','--force','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const path='/@fs'+new URL('../packages/lexical/test/tab-browser-harness.mjs',import.meta.url).pathname;
 for(const width of [1440,375]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  const mount=options=>page.evaluate(async({path,options})=>(await import(path)).mountTabFixture(options),{path,options});
  const read=()=>page.evaluate(async path=>(await import(path)).readTabFixture(),path);
  for(const kind of ['bullet','number']){
   for(const [options,key,focus] of [
    [{mode:'first'},'Tab','tab-after'],[{mode:'valid'},'Shift+Tab','tab-before'],
    [{mode:'valid',depth:20},'Tab','tab-after'],[{mode:'mixed'},'Shift+Tab','tab-before'],
    [{mode:'paragraph'},'Tab','tab-after'],[{mode:'note'},'Tab','tab-after'],
    [{mode:'range'},'Tab','tab-after'],[{mode:'container'},'Tab','tab-after'],
    [{mode:'container'},'Shift+Tab','tab-before']
   ]){
    const before=await mount({...options,kind});
    await page.keyboard.press(key);
    await page.waitForFunction(id=>document.activeElement?.id===id,focus,{timeout:3000});
    assert.deepEqual(await read(),before,`${width}px ${kind} ${options.mode}: rejected key preserves document/depth`);
   }
   const before=await mount({kind,depth:19});await page.keyboard.press('Tab');
   await page.waitForFunction(()=>document.activeElement?.id==='tab-editor');
   assert.equal((await read()).depth,20);
   await page.keyboard.press('Shift+Tab');
   const restored=await read();assert.equal(restored.depth,19);
   assert.deepEqual(restored.state,before.state,'Tab followed by Shift+Tab preserves canonical document');
   await page.locator('#tab-before').focus();await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-editor');
   assert.deepEqual(await read(),restored,'A toolbar/button Tab must not indent');
  }
  assert.deepEqual(errors,[]);await page.close();
  console.log(`K4 ${width}px: ul/ol depth19/20, reject focus, payload and external button navigation PASS`);
 }
}finally{await browser?.close();server.kill();}
