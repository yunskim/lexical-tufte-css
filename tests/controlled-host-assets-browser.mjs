import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';

const base=process.env.EDITOR_URL??'http://127.0.0.1:5195/';
const url=new URL('host-assets.html',base).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5195','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let n=0;n<100;n++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(n===99)throw Error('Host asset fixture server not ready');
  await sleep(100);
 }
 browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage({viewport:{width:760,height:900}});
 page.setDefaultTimeout(10_000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const first=page.getByTestId('host-first'),second=page.getByTestId('host-second');
 const pickFirst=first.getByRole('button',{name:'호스트 이미지 자산 선택'});
 const pickSecond=second.getByRole('button',{name:'호스트 이미지 자산 선택'});
 const dialog=page.getByRole('dialog',{name:'호스트 이미지 자산'});
 const getDoc=async(which)=>JSON.parse(await page.getByTestId('host-'+which+'-json').textContent());
 const images=document=>{
  const found=[];
  const visit=node=>{if(node.type==='tufte-inline-image')found.push(node);node.children?.forEach(visit);};
  visit(document.lexicalState.root);
  return found;
 };
 await first.getByRole('textbox',{name:'Alpha 편집기'}).waitFor();
 await second.getByRole('textbox',{name:'Beta 편집기'}).waitFor();
 const beforeFirst=await getDoc('first'),beforeSecond=await getDoc('second');
 assert.equal(images(beforeFirst).filter(node=>node.hostAsset).length,0);
 assert.deepEqual(await page.evaluate(()=>window.__hostAssetHarness.calls.search),[],
  'A host provider must not be queried before the picker opens');
 await pickFirst.click();
 await dialog.waitFor();
 assert.equal(await dialog.getByRole('radio',{name:/alpha-server-note/}).count(),1);
 await dialog.getByRole('searchbox',{name:'외부 이미지 검색'}).fill('Atlas');
 await dialog.getByRole('radio',{name:/Atlas image/}).check();
 assert.equal(await dialog.getByRole('radio',{name:/Ignore PDF/}).count(),0);
 await dialog.getByRole('combobox',{name:'버전'}).selectOption('rev-1');
 await dialog.getByRole('textbox',{name:/대체 텍스트/}).fill('Alpha 원격 사진');
 await dialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('"hostAsset"'));
 const updatedFirst=await getDoc('first');
 const remote=images(updatedFirst).find(node=>node.hostAsset);
 assert.deepEqual(remote.hostAsset,{namespace:'alpha',assetId:'atlas',revisionId:'rev-1'});
 assert.equal(remote.alt,'Alpha 원격 사진');
 assert.equal(remote.src,'/fixture.svg');
 assert.deepEqual(await getDoc('second'),beforeSecond,'Other editor must not change');
 const firstCall=await page.evaluate(()=>window.__hostAssetHarness.calls.resolve[0]);
 assert.deepEqual(firstCall,{namespace:'alpha',locator:{assetId:'atlas',revisionId:'rev-1'}});

 // Replacement must be undoable without losing other host's document.
 await first.getByRole('textbox',{name:'Alpha 편집기'}).click();
 await page.keyboard.press('Control+z');
 await page.waitForFunction(()=>!document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('"hostAsset"'));
 assert.deepEqual(await getDoc('second'),beforeSecond);
 await page.keyboard.press('Control+Shift+z');
 await page.waitForFunction(()=>document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('"hostAsset"'));

 // A rejected URL cannot modify the selected image or silently drop its locator.
 await page.evaluate(()=>{window.__hostAssetHarness.mode='invalid';});
 await pickSecond.click();await dialog.waitFor();
 await dialog.getByRole('radio',{name:/Atlas image/}).check();
 await dialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await dialog.getByRole('alert').getByText(/유효하지 않습니다/).waitFor();
 assert.deepEqual(await getDoc('second'),beforeSecond);
 await dialog.getByRole('button',{name:'취소'}).click();await dialog.waitFor({state:'hidden'});

 // Expired URLs and explicit revision mismatches must also fail closed.
 for(const mode of ['expired','mismatch']){
  await page.evaluate(value=>{window.__hostAssetHarness.mode=value;},mode);
  await pickSecond.click();await dialog.waitFor();
  await dialog.getByRole('radio',{name:/Atlas image/}).check();
  if(mode==='mismatch')await dialog.getByRole('combobox',{name:'버전'}).selectOption('rev-1');
  await dialog.getByRole('button',{name:'외부 이미지 연결'}).click();
  await dialog.getByRole('alert').getByText(/유효하지 않습니다/).waitFor();
  assert.deepEqual(await getDoc('second'),beforeSecond);
  await dialog.getByRole('button',{name:'취소'}).click();await dialog.waitFor({state:'hidden'});
 }

 // Provider exceptions remain a visible, retryable picker error.
 await page.evaluate(()=>{window.__hostAssetHarness.mode='throw';});
 await pickSecond.click();await dialog.waitFor();
 await dialog.getByRole('radio',{name:/Atlas image/}).check();
 await dialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await dialog.getByRole('alert').getByText(/확인하지 못했습니다/).waitFor();
 assert.deepEqual(await getDoc('second'),beforeSecond);
 await dialog.getByRole('button',{name:'취소'}).click();await dialog.waitFor({state:'hidden'});

 // Resolves which ignore AbortSignal must still be ignored after cancellation.
 await page.evaluate(()=>{window.__hostAssetHarness.mode='deferred';});
 await pickSecond.click();await dialog.waitFor();
 await dialog.getByRole('radio',{name:/Atlas image/}).check();
 await dialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await page.waitForFunction(()=>window.__hostAssetHarness.deferred.length===1);
 await dialog.getByRole('button',{name:'취소'}).click();
 await page.evaluate(()=>{
  const h=window.__hostAssetHarness,request=h.deferred.shift();
  request.respond({assetId:request.locator.assetId,revisionId:'rev-2',
   mediaType:'image/svg+xml',url:'/fixture.svg'});
  h.mode='normal';
 });
 await sleep(50);
 assert.deepEqual(await getDoc('second'),beforeSecond,'Late cancelled resolve must not mutate editor');

 // A new image is inserted into the captured note instead of the dialog focus.
 const note=first.locator('[data-note-id="alpha-server-note"]');
 await note.waitFor();
 await note.click({position:{x:6,y:6}});
 await pickFirst.click();await dialog.waitFor();
 await dialog.getByRole('radio',{name:'현재 노트에 새 이미지 삽입'}).check();
 await dialog.getByRole('radio',{name:/Photo image/}).check();
 await dialog.getByRole('textbox',{name:/대체 텍스트/}).fill('새 노트 이미지');
 await dialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(()=>{
  const data=document.querySelector('[data-testid="host-first-json"]')?.textContent;
  return Boolean(data&&data.includes('새 노트 이미지'));
 });
 const inserted=images(await getDoc('first')).find(node=>node.alt==='새 노트 이미지');
 assert.deepEqual(inserted.hostAsset,{namespace:'alpha',assetId:'photo'});
 assert.deepEqual(await getDoc('second'),beforeSecond);
 assert.equal(await page.getByTestId('host-errors').innerText(),'');
 assert.deepEqual(errors,[]);
 console.log('Host image picker: search/filter, pinned revision, canonical host locator, undo/redo, invalid URLs, cancelled stale response, note insert and two-host isolation PASS.');
}finally{
 await browser?.close();
 server?.kill();
}
