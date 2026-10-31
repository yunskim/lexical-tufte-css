import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';

const url=process.env.EDITOR_URL||'http://127.0.0.1:5192/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5192','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
  for(let i=0;i<100;i++){
    try{if((await fetch(url)).ok)break;}catch{}
    if(i===99)throw Error('Editor server not ready');
    await sleep(100);
  }
  browser=await chromium.launch({headless:true,
    ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
    args:['--no-sandbox']});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    window.__hostCalls={search:[],revisions:[],resolve:[]};
    window.__hostMode='normal';
    window.__hostExpiryMs=3600_000;
    window.lexicalTufteAssetNamespace='test-host';
    window.lexicalTufteAssetProvider={
      async search(query,signal){
        window.__hostCalls.search.push(query);
        if(signal?.aborted)throw Error('aborted');
        return {items:[{id:'remote-image',title:'Remote image',mediaType:'image/svg+xml',
          currentRevision:'rev-2'}],nextCursor:null};
      },
      async revisions(id,query,signal){
        window.__hostCalls.revisions.push({id,query});
        if(signal?.aborted)throw Error('aborted');
        return {items:[{id:'rev-1',assetId:id},{id:'rev-2',assetId:id}],nextCursor:null};
      },
      async resolve(locator){
        window.__hostCalls.resolve.push(locator);
        if(window.__hostMode==='throw')throw Error('Temporary provider outage');
        if(window.__hostMode==='invalid')return null;
        return {assetId:locator.assetId,revisionId:locator.revisionId||'rev-2',
          mediaType:'image/svg+xml',url:'/fixture.svg',
          expiresAt:new Date(Date.now()+window.__hostExpiryMs).toISOString()};
      }
    };
  });
  await page.clock.install();
  await page.goto(url);
  const editor=page.getByRole('textbox',{name:'본문과 사이드노트 편집'});
  const button=name=>page.getByRole('button',{name,exact:true});
  await editor.click();
  await page.keyboard.press('Control+Home');
  await button('본문을 섹션으로 묶기').click();
  await editor.focus();
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('Alt+ArrowDown');
  await button('노트 이미지 삽입').click();
  await button('이미지 라이브러리에서 선택').click();
  const dialog=page.getByRole('dialog',{name:'문서 이미지 선택'});
  await dialog.getByRole('radio',{name:/Remote image/}).check();
  await dialog.getByRole('combobox',{name:'버전'}).selectOption('rev-1');
  await dialog.getByRole('textbox',{name:/대체텍스트/}).fill('외부 자산 이미지');
  await dialog.getByRole('button',{name:'선택한 외부 이미지 연결'}).click();
  await dialog.waitFor({state:'hidden'});
  assert.deepEqual((await page.evaluate(()=>window.__hostCalls.resolve))[0],
    {assetId:'remote-image',revisionId:'rev-1'});
  await button('저장').click();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('lexical-tufte-p1-document')));
  assert.ok(stored);
  const images=[];
  const scan=node=>{if(node.type==='tufte-inline-image')images.push(node);
    node.children?.forEach(scan);};
  scan(stored.lexicalState.root);
  assert.deepEqual(images[0].hostAsset,{namespace:'test-host',assetId:'remote-image',revisionId:'rev-1'});
  assert.equal(images[0].alt,'외부 자산 이미지');
  assert.equal(images[0].assetId,undefined);
  await button('불러오기').click();
  await page.waitForFunction(()=>window.__hostCalls.resolve.length>=2);
  await button('외부 이미지 URL 다시 확인').click();
  await page.waitForFunction(()=>window.__hostCalls.resolve.length>=3);
  // Invalid resolver responses must leave the existing image reference intact.
  await page.evaluate(()=>{window.__hostMode='invalid';});
  await button('외부 이미지 URL 다시 확인').click();
  await page.getByRole('status',{name:'편집 작업 상태'}).getByText(/재시도 예약/).waitFor();
  const afterInvalid=await page.evaluate(()=>document.querySelector('[data-note-id="seed-note"] img')?.getAttribute('src'));
  assert.equal(afterInvalid,'/fixture.svg');

  // Provider errors must be surfaced, not leak as unhandled page exceptions.
  await page.evaluate(()=>{window.__hostMode='throw';});
  await button('외부 이미지 URL 다시 확인').click();
  await page.getByRole('status',{name:'편집 작업 상태'}).getByText(/재시도합니다/).waitFor();
  await page.evaluate(()=>{window.__hostMode='normal';});
  await button('외부 이미지 URL 다시 확인').click();
  await page.getByRole('status',{name:'편집 작업 상태'}).getByText(/갱신: 1\/1개/).waitFor();
  // An expiring signed URL should refresh 60 seconds before expiration.
  await page.evaluate(()=>{window.__hostExpiryMs=120_000;});
  await button('외부 이미지 URL 다시 확인').click();
  await page.getByRole('status',{name:'편집 작업 상태'}).getByText(/갱신: 1\/1개/).waitFor();
  const beforeExpiry=await page.evaluate(()=>window.__hostCalls.resolve.length);
  await page.clock.runFor(59_999);
  assert.equal(await page.evaluate(()=>window.__hostCalls.resolve.length),beforeExpiry,
    'No premature refresh before expiry margin');
  await page.clock.runFor(1);
  await page.waitForFunction(count=>window.__hostCalls.resolve.length>count,beforeExpiry);
  await page.evaluate(()=>{window.__hostExpiryMs=3600_000;});

  // Automatic retry uses a five-second initial backoff.
  await page.evaluate(()=>{window.__hostMode='invalid';});
  await button('외부 이미지 URL 다시 확인').click();
  await page.getByRole('status',{name:'편집 작업 상태'}).getByText(/재시도 예약/).waitFor();
  const beforeRetry=await page.evaluate(()=>window.__hostCalls.resolve.length);
  await page.clock.runFor(4999);
  assert.equal(await page.evaluate(()=>window.__hostCalls.resolve.length),beforeRetry);
  await page.evaluate(()=>{window.__hostMode='normal';});
  await page.clock.runFor(1);
  await page.waitForFunction(count=>window.__hostCalls.resolve.length>count,beforeRetry);

  // Returning to a visible tab after the 60-second cooldown rechecks URLs.
  const beforeResume=await page.evaluate(()=>window.__hostCalls.resolve.length);
  await page.clock.runFor(60_001);
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await page.waitForFunction(count=>window.__hostCalls.resolve.length>count,beforeResume);
  assert.deepEqual(errors,[]);
  console.log('Host asset search, revisions, resolve, persistence and reload regressions written.');
}finally{
  await browser?.close();
  server?.kill();
}
