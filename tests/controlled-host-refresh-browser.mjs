import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

// Real React/Lexical bridge: independent expiry timer, retry, cancellation and
// external controlled-document replacement. No real DAM or backend is used.
const base=process.env.EDITOR_URL??'http://127.0.0.1:5196/';
const url=new URL('host-assets.html',base).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5196','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt===99)throw Error('Host refresh fixture server not ready');
  await delay(100);
 }
 browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.setDefaultTimeout(10_000);
 await page.clock.install({time:new Date('2026-11-03T00:00:00.000Z')});
 await page.goto(url);
 const first=page.getByTestId('host-first'),second=page.getByTestId('host-second');
 const alpha=first.getByRole('textbox',{name:'Alpha 편집기'});
 const beta=second.getByRole('textbox',{name:'Beta 편집기'});
 await alpha.waitFor();await beta.waitFor();
 const manual=first.getByRole('button',{name:'호스트 이미지 URL 다시 확인'});
 const message=first.locator('.host-asset-refresh-controls [role=status]');
 const count=()=>page.evaluate(()=>
  window.__hostAssetHarness.calls.resolve.filter(call=>call.namespace==='alpha').length);
 const betaCount=()=>page.evaluate(()=>
  window.__hostAssetHarness.calls.resolve.filter(call=>call.namespace==='beta').length);
 const read=async()=>JSON.parse(await page.getByTestId('host-first-json').innerText());
 const findHost=(doc)=>{
  const hits=[];const visit=node=>{
   if(node.type==='tufte-inline-image'&&node.hostAsset)hits.push(node);
   node.children?.forEach(visit);
  };
  visit(doc.lexicalState.root);
  return hits;
 };

 // Start without host-linked images: no network calls on idle editors.
 assert.equal(await count(),0);assert.equal(await betaCount(),0);
 await page.evaluate(()=>{window.__hostAssetHarness.expiryMs=120_000;});
 await first.getByRole('button',{name:'호스트 이미지 자산 선택'}).click();
 const picker=page.getByRole('dialog',{name:'호스트 이미지 자산'});
 await picker.waitFor();
 await picker.getByRole('radio',{name:/alpha-server-note/}).check();
 await picker.getByRole('radio',{name:/Atlas image/}).check();
 await picker.getByRole('combobox',{name:'버전'}).selectOption('rev-1');
 await picker.getByRole('button',{name:'외부 이미지 연결'}).click();
 await picker.waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('"hostAsset"'));
 await message.getByText(/갱신: 1\/1개/).waitFor();
 const firstDocument=await read();
 const bound=findHost(firstDocument);
 assert.equal(bound.length,1);
 assert.deepEqual(bound[0].hostAsset,{namespace:'alpha',assetId:'atlas',revisionId:'rev-1'});
 const beforeExpiry=await count();
 assert.ok(beforeExpiry>=2,'Picker and initial URL refresh should each resolve the asset');
 await page.clock.runFor(59_999);
 assert.equal(await count(),beforeExpiry,'Expiry refresh must not fire before the 60-second margin');
 await page.clock.runFor(1);
 await page.waitForFunction(n=>window.__hostAssetHarness.calls.resolve.filter(call=>call.namespace==='alpha').length>n,beforeExpiry);
 assert.equal(await betaCount(),0,'Alpha timer must not query Beta');
 assert.deepEqual(findHost(await read())[0].hostAsset,bound[0].hostAsset);

 // Manual refresh must replace an obsolete short deadline with a newer long one.
 await page.evaluate(()=>{window.__hostAssetHarness.expiryMs=3600_000;});
 await manual.click();
 await message.getByText(/갱신: 1\/1개/).waitFor();
 const longExpiryCount=await count();
 await page.clock.runFor(60_001);
 assert.equal(await count(),longExpiryCount,'Old expiry timer must be cancelled by a successful refresh');

 // A transient resolver error is visible and retries first after five seconds.
 await page.evaluate(()=>{window.__hostAssetHarness.mode='throw';});
 await manual.click();
 await message.getByText(/실패 1개/).waitFor();
 const beforeRetry=await count();
 await page.clock.runFor(4_999);
 assert.equal(await count(),beforeRetry,'Failure retry fired before its backoff');
 await page.evaluate(()=>{window.__hostAssetHarness.mode='normal';});
 await page.clock.runFor(1);
 await page.waitForFunction(n=>window.__hostAssetHarness.calls.resolve.filter(call=>call.namespace==='alpha').length>n,beforeRetry);
 await message.getByText(/갱신: 1\/1개/).waitFor();
 assert.equal(await betaCount(),0);

 // A manual recovery cancels the outstanding failed-request retry.
 await page.evaluate(()=>{window.__hostAssetHarness.mode='invalid';});
 await manual.click();await message.getByText(/실패 1개/).waitFor();
 await page.evaluate(()=>{window.__hostAssetHarness.mode='normal';});
 await manual.click();await message.getByText(/갱신: 1\/1개/).waitFor();
 const afterManual=await count();
 await page.clock.runFor(5_000);
 assert.equal(await count(),afterManual,'Stale retry should not execute after manual recovery');

 // Delayed response cannot resurrect a host asset removed by external document replacement.
 await page.evaluate(()=>{window.__hostAssetHarness.mode='deferred';window.__hostAssetHarness.deferred=[];});
 await manual.click();
 await page.waitForFunction(()=>window.__hostAssetHarness.deferred.length===1);
 await page.getByRole('button',{name:'Alpha 문서 교체'}).click();
 await page.waitForFunction(()=>!document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('"hostAsset"'));
 await page.evaluate(()=>{
  const h=window.__hostAssetHarness;
  const request=h.deferred.shift();
  request.respond({assetId:request.locator.assetId,revisionId:'rev-1',
   mediaType:'image/svg+xml',url:'/obsolete.svg',
   expiresAt:new Date(Date.now()+3600_000).toISOString()});
  h.mode='normal';
 });
 await delay(60);
 assert.equal(findHost(await read()).length,0,'Old response must not reinsert an externally replaced image');

 // New host URL refresh controller instances must be unmounted without leaking
 // delayed callbacks. The sibling editor remains operational.
 await first.getByRole('button',{name:'호스트 이미지 자산 선택'}).click();
 await picker.waitFor();
 await picker.getByRole('radio',{name:/alpha-server-note/}).check();
 await picker.getByRole('radio',{name:/Atlas image/}).check();
 await picker.getByRole('button',{name:'외부 이미지 연결'}).click();
 await picker.waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('"hostAsset"'));
 await page.evaluate(()=>{window.__hostAssetHarness.mode='deferred';window.__hostAssetHarness.deferred=[];});
 await manual.click();await page.waitForFunction(()=>window.__hostAssetHarness.deferred.length===1);
 const beforeUnmount=await read();
 await page.getByRole('button',{name:'Alpha 마운트 전환'}).click();
 assert.equal(await alpha.count(),0);
 await page.evaluate(()=>{
  const h=window.__hostAssetHarness;
  const request=h.deferred.shift();
  request.respond({assetId:request.locator.assetId,revisionId:'rev-2',
   mediaType:'image/svg+xml',url:'/obsolete.svg'});
  h.mode='normal';
 });
 await delay(60);
 assert.deepEqual(await read(),beforeUnmount,'Unmounted refresh must not mutate its parent value');
 await page.getByRole('button',{name:'Alpha 마운트 전환'}).click();
 await alpha.waitFor();
 await message.getByText(/갱신: 1\/1개/).waitFor();
 assert.notEqual(findHost(await read())[0].src,'/obsolete.svg');
 assert.equal(await betaCount(),0);
 assert.equal(await page.getByTestId('host-errors').innerText(),'');
 assert.deepEqual(errors,[]);
 console.log('Host refresh: expiry boundary, timer replacement, retry, manual recovery, external replacement, unmount, namespace isolation PASS.');
}finally{
 await browser?.close();
 server?.kill();
}
