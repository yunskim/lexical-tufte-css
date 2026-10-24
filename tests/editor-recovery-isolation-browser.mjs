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
try {
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
 await page.keyboard.insertText('CANONICAL-BASELINE');
 await page.getByRole('button',{name:'저장',exact:true}).click();
 const canonical=await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1'));
 assert.ok(canonical?.includes('CANONICAL-BASELINE'));
 const recovered=JSON.parse(canonical);
 const textNode=(function find(node){
  if(node.type==='text'&&node.text?.includes('CANONICAL-BASELINE'))return node;
  for(const child of node.children??[]){const found=find(child);if(found)return found;}
  return null;
 })(recovered.root);
 assert.ok(textNode,'Fixture requires an editable text node');
 textNode.text+=' RECOVERY-ONLY';
 const recoveryKey='lexical-tufte-recovery-v2:regression-isolation';
 await page.evaluate(({key,state})=>{
  localStorage.setItem(key,JSON.stringify({savedAt:'2099-01-01T00:00:00.000Z',state}));
  window.dispatchEvent(new StorageEvent('storage',{key}));
 },{key:recoveryKey,state:recovered});
 // Remove autosaved session copies before the controlled recovery fixtures.
 // The editor may create them after the initial text edit.
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{
  for(const key of Object.keys(localStorage)){
   if(key.startsWith('lexical-tufte-recovery-v2:')&&
      !key.endsWith(':regression-isolation'))localStorage.removeItem(key);
  }
 });
 const button=page.getByRole('button',{name:'복구용 사본 열기',exact:true});
 await button.waitFor({state:'visible'});
 await button.waitFor({state:'attached'});
 await page.waitForFunction(()=>{
  const button=[...document.querySelectorAll('button')].find(el=>el.textContent?.trim()==='복구용 사본 열기');
  return button&&!button.disabled;
 });
 // Cancellation must not change either the editor or the canonical save.
 page.once('dialog',dialog=>dialog.dismiss());
 await button.click();
 assert.doesNotMatch(await editor.innerText(),/RECOVERY-ONLY/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical);
 // Confirmation opens the recovery copy but does not implicitly save it.
 page.once('dialog',dialog=>{
  assert.equal(dialog.type(),'confirm');
  dialog.accept();
 });
 await button.click();
 await page.getByRole('status',{name:'편집 작업 상태'}).filter({
  hasText:'선택한 복구본을 열었습니다.'
 }).waitFor();
 assert.match(await editor.innerText(),/RECOVERY-ONLY/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical,
  'Opening a recovery snapshot must not overwrite canonical storage');
 assert.ok(await page.evaluate(key=>localStorage.getItem(key)!==null,recoveryKey),
  'Opening a recovery snapshot must not delete the source recovery copy');
 // Reopening the canonical document must still restore the original bytes.
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 assert.match(await editor.innerText(),/CANONICAL-BASELINE/);
 assert.doesNotMatch(await editor.innerText(),/RECOVERY-ONLY/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical);
 assert.ok(await page.evaluate(key=>localStorage.getItem(key)!==null,recoveryKey),
  'Reopening the canonical document must not delete the recovery source');
 // Deleting recovery data is explicit and must respect both cancellation stages.
 const deleteButton=page.getByRole('button',{name:'복구본 정리',exact:true});
 await deleteButton.waitFor({state:'visible'});
 const stored=await page.evaluate(key=>localStorage.getItem(key),recoveryKey);
 page.once('dialog',dialog=>dialog.dismiss());
 await deleteButton.click();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),recoveryKey),stored,
  'Canceling recovery selection must preserve the recovery copy');
 const declineDeletion=dialog=>{
  if(dialog.type()==='prompt')return dialog.accept('0');
  assert.equal(dialog.type(),'confirm');
  page.off('dialog',declineDeletion);
  return dialog.dismiss();
 };
 page.on('dialog',declineDeletion);
 await deleteButton.click();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),recoveryKey),stored,
  'Declining the deletion confirmation must preserve the recovery copy');
 const confirmDeletion=dialog=>{
  if(dialog.type()==='prompt')return dialog.accept('0');
  assert.equal(dialog.type(),'confirm');
  page.off('dialog',confirmDeletion);
  return dialog.accept();
 };
 page.on('dialog',confirmDeletion);
 await deleteButton.click();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),recoveryKey),null,
  'Confirmed deletion must remove the selected recovery copy');
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical,
  'Deleting recovery must never delete the canonical document');
 // Multiple recovery snapshots: delete only the selected entry.
 const olderKey='lexical-tufte-recovery-v2:regression-older';
 const newerKey='lexical-tufte-recovery-v2:regression-newer';
 await page.evaluate(({olderKey,newerKey,state})=>{
  localStorage.setItem(olderKey,JSON.stringify({savedAt:'2098-01-01T00:00:00.000Z',state}));
  localStorage.setItem(newerKey,JSON.stringify({savedAt:'2099-01-02T00:00:00.000Z',state}));
 },{olderKey,newerKey,state:recovered});
 const olderBytes=await page.evaluate(key=>localStorage.getItem(key),olderKey);
 const selectNewest=dialog=>{
  if(dialog.type()==='prompt'){
   assert.match(dialog.message(),/2099-01-02/);
   return dialog.accept('0');
  }
  assert.equal(dialog.type(),'confirm');
  page.off('dialog',selectNewest);
  return dialog.accept();
 };
 page.on('dialog',selectNewest);
 await deleteButton.click();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),newerKey),null,
  'Selected newest recovery snapshot must be deleted');
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),olderKey),olderBytes,
  'Unselected recovery snapshot must remain unchanged');
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical,
  'Deleting one of multiple recovery snapshots must preserve canonical save');
 // The remaining older snapshot must still be openable after deleting
 // the newer one; opening it must not change the canonical saved bytes.
 page.once('dialog',dialog=>{
  assert.equal(dialog.type(),'confirm');
  dialog.accept();
 });
 await button.click();
 await page.getByRole('status',{name:'편집 작업 상태'}).filter({
  hasText:'선택한 복구본을 열었습니다.'
 }).waitFor();
 assert.match(await editor.innerText(),/RECOVERY-ONLY/);
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),olderKey),olderBytes,
  'Opening remaining recovery snapshot must not consume it');
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical,
  'Opening remaining recovery snapshot must preserve canonical save');
 // A corrupted recovery entry must not block access to valid snapshots.
 const corruptKey='lexical-tufte-recovery-v2:regression-corrupt';
 await page.evaluate(key=>localStorage.setItem(key,'{corrupt-json'),corruptKey);
 page.once('dialog',dialog=>{
  assert.equal(dialog.type(),'confirm');
  dialog.accept();
 });
 await button.click();
 await page.getByRole('status',{name:'편집 작업 상태'}).filter({
  hasText:'선택한 복구본을 열었습니다.'
 }).waitFor();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),corruptKey),'{corrupt-json',
  'Unreadable recovery entry must be retained for manual inspection');
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),olderKey),olderBytes,
  'Valid recovery entry must survive a corrupted sibling');
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),canonical,
  'Corrupted recovery entry must not affect canonical storage');
 assert.deepEqual(errors,[]);
 console.log('Recovery reopen: cancellation, explicit open, canonical isolation and canonical restore.');
}finally{await browser?.close();server?.kill();}
