import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

// Legacy v1 recovery data must survive the v2 migration and remain selectable.
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
 const page=await browser.newPage();page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const editor=page.locator('.editor');await editor.waitFor();
 await editor.click();await page.keyboard.press('Control+End');
 await page.keyboard.insertText('LEGACY-CANONICAL');
 await page.getByRole('button',{name:'저장',exact:true}).click();
 const canonical=await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1'));
 assert.ok(canonical?.includes('LEGACY-CANONICAL'));
 const legacy=JSON.parse(canonical);
 const findText=node=>{
  if(node.type==='text'&&node.text?.includes('LEGACY-CANONICAL'))return node;
  for(const child of node.children??[]){
   const found=findText(child);if(found)return found;
  }
  return null;
 };
 const textNode=findText(legacy.root);
 assert.ok(textNode,'Legacy fixture requires a text node');
 textNode.text+=' LEGACY-RECOVERY';
 await page.evaluate(value=>localStorage.setItem('lexical-tufte-recovery-v1',value),
  JSON.stringify(legacy));
 // v1 migration takes place at mount, and must not require manually deleting v1.
 await page.reload();await editor.waitFor();
 await page.waitForFunction(()=>
  localStorage.getItem('lexical-tufte-recovery-v2:legacy')!==null&&
  localStorage.getItem('lexical-tufte-recovery-v1')===null
 );
 const migrated=await page.evaluate(()=>localStorage.getItem('lexical-tufte-recovery-v2:legacy'));
 assert.deepEqual(JSON.parse(migrated).state,legacy,
  'Legacy migration must retain the old raw Lexical state');
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical,
  'Legacy migration must not overwrite canonical storage');
 // Mounting again must not replace or remove the already migrated snapshot.
 await page.reload();await editor.waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-recovery-v2:legacy')),
  migrated,'Legacy migration must remain idempotent across reloads');
 const open=page.getByRole('button',{name:'복구용 사본 열기',exact:true});
 const legacyKey='lexical-tufte-recovery-v2:legacy';
 const chooseLegacy=dialog=>{
  if(dialog.type()==='prompt'){
   const line=dialog.message().split('\n').find(row=>row.includes('· '+legacyKey.slice(-8)));
   assert.ok(line,'Recovery picker must contain migrated legacy snapshot');
   const index=line.match(/^\s*(\d+):/)?.[1];
   assert.ok(index,'Recovery picker must contain an index for the legacy copy');
   return dialog.accept(index);
  }
  assert.equal(dialog.type(),'confirm');
  page.off('dialog',chooseLegacy);
  return dialog.accept();
 };
 page.on('dialog',chooseLegacy);
 await open.click();
 await page.getByRole('status',{name:'편집 작업 상태'}).filter({
  hasText:'선택한 복구본을 열었습니다.'
 }).waitFor();
 assert.match(await editor.innerText(),/LEGACY-RECOVERY/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical,
  'Opening migrated legacy recovery must not overwrite canonical storage');
 assert.deepEqual(errors,[]);
 console.log('Legacy recovery v1 -> v2 migration, idempotence and same-tab reopen.');
}finally{await browser?.close();server?.kill();}
