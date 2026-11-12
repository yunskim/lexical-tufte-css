import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// Two controlled editors share a React page, never a picker, request or state.
// Provider intentionally ignores AbortSignal for the deferred responses.
const base=process.env.EDITOR_URL??'http://127.0.0.1:5205/';
const url=new URL('host-assets.html',base).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5205','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt===99)throw Error('Concurrent host picker fixture not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1024,height:900}});
 page.setDefaultTimeout(10_000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const first=page.getByTestId('host-first');
 const second=page.getByTestId('host-second');
 const firstTrigger=first.getByRole('button',{name:'호스트 이미지 자산 선택'});
 const secondTrigger=second.getByRole('button',{name:'호스트 이미지 자산 선택'});
 const firstDialog=first.getByRole('dialog',{name:'호스트 이미지 자산'});
 const secondDialog=second.getByRole('dialog',{name:'호스트 이미지 자산'});
 const read=async(which)=>JSON.parse(await page.getByTestId('host-'+which+'-json').textContent());
 const hostImages=doc=>{
  const found=[];
  const scan=node=>{
   if(node.type==='tufte-inline-image'&&node.hostAsset)found.push(node);
   node.children?.forEach(scan);
  };
  scan(doc.lexicalState.root);
  return found;
 };
 const alphaBefore=await read('first');
 const betaBefore=await read('second');
 assert.equal(hostImages(alphaBefore).length,0);
 assert.equal(hostImages(betaBefore).length,0);

 await firstTrigger.click();
 await firstDialog.waitFor();
 await firstDialog.getByRole('radio',{name:/alpha-server-note/}).check();
 await firstDialog.getByRole('radio',{name:/Atlas image/}).check();
 await firstDialog.getByRole('combobox',{name:'버전'}).selectOption('rev-1');
 await firstDialog.getByRole('textbox',{name:/대체 텍스트/}).fill('Alpha discarded');
 await page.evaluate(()=>{window.__hostAssetHarness.mode='deferred';window.__hostAssetHarness.deferred=[];});
 await firstDialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await page.waitForFunction(()=>window.__hostAssetHarness.deferred.length===1);

 // Open the sibling picker while Alpha's modal is pending. Native pointer
 // events are blocked by Alpha's backdrop, so the host invokes its own button.
 await secondTrigger.evaluate(node=>node.click());
 await secondDialog.waitFor();
 assert.equal(await firstDialog.count(),1);
 assert.equal(await secondDialog.count(),1);
 await secondDialog.getByRole('radio',{name:/beta-server-note/}).check();
 await secondDialog.getByRole('radio',{name:/Photo image/}).check();
 await secondDialog.getByRole('combobox',{name:'버전'}).selectOption('rev-2');
 await secondDialog.getByRole('textbox',{name:/대체 텍스트/}).fill('Beta retained');
 await secondDialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await page.waitForFunction(()=>window.__hostAssetHarness.deferred.length===2);
 const namespaces=await page.evaluate(()=>window.__hostAssetHarness.calls.resolve.slice(-2).map(call=>call.namespace));
 assert.deepEqual(namespaces,['alpha','beta']);

 // Cancelling and unmounting Alpha must not affect Beta's pending request.
 await secondDialog.getByRole('button',{name:'취소'}).focus();
 await firstDialog.getByRole('button',{name:'취소'}).evaluate(node=>node.click());
 assert.equal(await firstDialog.count(),0);
 assert.equal(await secondDialog.count(),1);
 assert.equal(await secondDialog.getByRole('button',{name:'취소'})
  .evaluate(element=>document.activeElement===element),true,
  'Closing Alpha must not steal focus from Beta while its modal stays open');
 await page.getByRole('button',{name:'Alpha 마운트 전환'}).evaluate(node=>node.click());
 assert.equal(await firstTrigger.count(),0);
 await page.evaluate(()=>{
  const harness=window.__hostAssetHarness;
  const pending=harness.deferred.shift();
  pending.respond({assetId:pending.locator.assetId,revisionId:'rev-1',
   mediaType:'image/svg+xml',url:'/obsolete.svg',
   expiresAt:new Date(Date.now()+3600_000).toISOString()});
 });
 await delay(50);
 assert.deepEqual(await read('first'),alphaBefore,'Unmounted Alpha must reject a late resolve');
 assert.deepEqual(await read('second'),betaBefore,'Beta must remain pending');

 await page.evaluate(()=>{
  const harness=window.__hostAssetHarness;
  harness.mode='normal';
  const pending=harness.deferred.shift();
  pending.respond({assetId:pending.locator.assetId,revisionId:'rev-2',
   mediaType:'image/svg+xml',url:'/fixture.svg',
   expiresAt:new Date(Date.now()+3600_000).toISOString()});
 });
 await secondDialog.waitFor({state:'hidden'});
 await page.waitForFunction(()=>
  document.querySelector('[data-testid="host-second-json"]')?.textContent?.includes('Beta retained'));
 const betaBound=hostImages(await read('second'));
 assert.equal(betaBound.length,1);
 assert.deepEqual(betaBound[0].hostAsset,{namespace:'beta',assetId:'photo',revisionId:'rev-2'});
 assert.equal(betaBound[0].alt,'Beta retained');
 assert.deepEqual(await read('first'),alphaBefore);
 await page.waitForFunction(()=>
  document.activeElement?.closest('[data-testid="host-second"]')!==null&&
  document.activeElement?.textContent?.trim()==='호스트 이미지 자산 선택');
 await page.getByRole('button',{name:'Alpha 마운트 전환'}).click();
 await firstTrigger.waitFor();
 assert.deepEqual(await read('first'),alphaBefore);

 // Switching the sibling to readonly unmounts its picker and invalidates an
 // in-flight request even if the provider doesn't observe cancellation.
 await secondTrigger.click();
 await secondDialog.waitFor();
 await secondDialog.getByRole('radio',{name:/Atlas image/}).check();
 await page.evaluate(()=>{window.__hostAssetHarness.mode='deferred';window.__hostAssetHarness.deferred=[];});
 await secondDialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await page.waitForFunction(()=>window.__hostAssetHarness.deferred.length===1);
 const beforeReadonly=await read('second');
 await page.getByRole('button',{name:'Beta 읽기 전용 전환'}).evaluate(node=>node.click());
 await secondDialog.waitFor({state:'hidden'});
 assert.equal(await secondTrigger.count(),0);
 await page.evaluate(()=>{
  const harness=window.__hostAssetHarness;
  const pending=harness.deferred.shift();
  harness.mode='normal';
  pending.respond({assetId:pending.locator.assetId,revisionId:'rev-2',
   mediaType:'image/svg+xml',url:'/obsolete.svg',
   expiresAt:new Date(Date.now()+3600_000).toISOString()});
 });
 await delay(50);
 assert.deepEqual(await read('second'),beforeReadonly,
  'Readonly transition must discard a deferred picker result');
 assert.deepEqual(await read('first'),alphaBefore);
 await page.getByRole('button',{name:'Beta 읽기 전용 전환'}).click();
 await secondTrigger.waitFor();

 // One modal's keyboard contract must not leak to the other editor.
 await secondTrigger.click();
 await secondDialog.waitFor();
 const cancel=secondDialog.getByRole('button',{name:'취소'});
 await cancel.focus();
 await page.keyboard.press('Tab');
 assert.equal(await secondDialog.getByRole('button',{name:'닫기'}).evaluate(el=>document.activeElement===el),
  true,'Tab from last focusable item must wrap inside the active modal');
 await page.keyboard.press('Escape');
 await secondDialog.waitFor({state:'hidden'});
 await page.waitForFunction(()=>
  document.activeElement?.closest('[data-testid="host-second"]')!==null&&
  document.activeElement?.textContent?.trim()==='호스트 이미지 자산 선택');
 assert.equal(await firstDialog.count(),0);
 assert.equal(await page.getByTestId('host-errors').innerText(),'');
 assert.deepEqual(errors,[]);
 console.log('Concurrent host pickers: two pending resolves, cancel/unmount isolation, readonly transition, focus trap and Escape PASS.');
}finally{
 await browser?.close();
 server?.kill();
}
