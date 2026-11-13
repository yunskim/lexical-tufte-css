import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// Repeated lifecycle test for a real controlled TufteEditor with an AssetProvider.
// The fixture deliberately ignores AbortSignal for outstanding resolve() calls.
const base=process.env.EDITOR_URL??'http://127.0.0.1:5206/';
const url=new URL('host-assets.html',base).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5206','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Host lifecycle server not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']});
 const page=await browser.newPage();
 page.setDefaultTimeout(10_000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const alpha=page.getByTestId('host-first');
 const beta=page.getByTestId('host-second');
 const trigger=alpha.getByRole('button',{name:'호스트 이미지 자산 선택'});
 const picker=alpha.getByRole('dialog',{name:'호스트 이미지 자산'});
 const toggle=page.getByRole('button',{name:'Alpha 마운트 전환'});
 const read=async side=>JSON.parse(await page.getByTestId('host-'+side+'-json').textContent());
 const alphaInitial=await read('first'),betaInitial=await read('second');
 const snapshot=()=>page.evaluate(()=>({
  search:window.__hostAssetHarness.calls.search.filter(x=>x.namespace==='alpha').length,
  resolve:window.__hostAssetHarness.calls.resolve.filter(x=>x.namespace==='alpha').length,
  pending:window.__hostAssetHarness.deferred.length
 }));
 assert.equal((await snapshot()).resolve,0);
 const cycles=10;
 for(let round=0;round<cycles;round++){
  assert.equal(await trigger.count(),1,'One mounted Alpha picker trigger');
  assert.equal(await alpha.getByRole('button',{name:'호스트 이미지 URL 다시 확인'}).count(),1,
   'One mounted Alpha refresh controller');
  await trigger.click();await picker.waitFor();
  await picker.getByRole('radio',{name:/alpha-server-note/}).check();
  await picker.getByRole('radio',{name:/Atlas image/}).check();
  await picker.getByRole('combobox',{name:'버전'}).selectOption('rev-1');
  await page.evaluate(()=>{window.__hostAssetHarness.mode='deferred';});
  await picker.getByRole('button',{name:'외부 이미지 연결'}).click();
  await page.waitForFunction(expected=>window.__hostAssetHarness.deferred.length===expected,1);
  const before=await snapshot();
  assert.equal(before.pending,1);
  await toggle.evaluate(button=>button.click()); // overlay intentionally covers host controls
  await trigger.waitFor({state:'detached'});
  assert.equal(await picker.count(),0);
  assert.equal(await alpha.getByRole('button',{name:'호스트 이미지 URL 다시 확인'}).count(),0);
  await page.evaluate(()=>{
   const h=window.__hostAssetHarness;
   const deferred=h.deferred.shift();
   h.mode='normal';
   deferred.respond({assetId:deferred.locator.assetId,revisionId:'rev-1',
    mediaType:'image/svg+xml',url:'/obsolete.svg',
    expiresAt:new Date(Date.now()+3600_000).toISOString()});
  });
  await delay(20);
  assert.deepEqual(await read('first'),alphaInitial,
   'Unmounted editor must not accept round '+round+' provider result');
  assert.deepEqual(await read('second'),betaInitial,
   'Sibling document must survive round '+round);
  assert.equal((await snapshot()).pending,0,'One pending request must be removed');
  await toggle.click();
  await trigger.waitFor();
  assert.equal(await trigger.count(),1,'Remount must not duplicate its picker');
  assert.equal(await alpha.getByRole('button',{name:'호스트 이미지 URL 다시 확인'}).count(),1);
 }
 const totals=await snapshot();
 assert.equal(totals.search,cycles,'Exactly one provider search per picker opening');
 assert.equal(totals.resolve,cycles,'Exactly one pending resolve per picker opening');
 assert.equal(totals.pending,0);
 // A simulated resume after all cancelled requests must not resurrect a timer.
 await page.evaluate(()=>{
  window.dispatchEvent(new Event('pageshow'));
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await delay(70);
 assert.equal((await snapshot()).resolve,cycles,'No leaked refresh timers for unlinked images');

 // Final successful commit verifies the final remounted editor is still usable.
 await trigger.click();await picker.waitFor();
 await picker.getByRole('radio',{name:/alpha-server-note/}).check();
 await picker.getByRole('radio',{name:/Photo image/}).check();
 await picker.getByRole('combobox',{name:'버전'}).selectOption('rev-2');
 await picker.getByRole('textbox',{name:/대체 텍스트/}).fill('Lifecycle committed image');
 await picker.getByRole('button',{name:'외부 이미지 연결'}).click();
 await picker.waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('Lifecycle committed image'));
 const updated=await read('first');
 const findImages=(node,hits=[])=>{
  if(node.type==='tufte-inline-image'&&node.hostAsset)hits.push(node);
  for(const child of node.children??[])findImages(child,hits);
  return hits;
 };
 assert.equal(findImages(updated.lexicalState.root).length,1);
 assert.deepEqual(findImages(updated.lexicalState.root)[0].hostAsset,{
  namespace:'alpha',assetId:'photo',revisionId:'rev-2'
 });
 assert.deepEqual(await read('second'),betaInitial);
 assert.match(await alpha.getByTestId('host-first-changes').innerText(),/1회/,
  'Ten cancelled resolves must not produce onChange');
 assert.equal(await beta.getByRole('button',{name:'호스트 이미지 자산 선택'}).count(),1);
 assert.equal(await page.getByTestId('host-errors').innerText(),'');
 assert.deepEqual(errors,[]);
 console.log('Ten remount cycles: no request, timer, picker, sibling-state or onChange leakage PASS.');
}finally{
 await browser?.close();
 server?.kill();
}
