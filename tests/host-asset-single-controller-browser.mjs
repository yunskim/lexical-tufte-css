import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// Standalone legacy example must mount exactly one host URL refresh controller.
// It keeps its historic button/status contract but reuses HostAssetRefresh.
const url=process.env.EDITOR_URL??'http://127.0.0.1:5203/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5203','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt===99)throw Error('Standalone host controller server not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage();
 page.setDefaultTimeout(10_000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.__singleRefreshCalls=[];
  window.lexicalTufteAssetNamespace='single-host';
  window.lexicalTufteAssetProvider={
   async search(){return {items:[{id:'image-one',title:'Fixture host image',
    mediaType:'image/svg+xml'}],nextCursor:null};},
   async revisions(assetId){return {items:[{id:'revision-one',assetId}],nextCursor:null};},
   async resolve(locator){
    window.__singleRefreshCalls.push({...locator});
    return {assetId:locator.assetId,revisionId:locator.revisionId??'latest',
     mediaType:'image/svg+xml',url:'/fixture.svg',
     expiresAt:new Date(Date.now()+3600_000).toISOString()};
   }
  };
 });
 await page.goto(url);
 const button=name=>page.getByRole('button',{name,exact:true});
 const manual=button('외부 이미지 URL 다시 확인');
 assert.equal(await manual.count(),1,'Only the shared controller renders the legacy manual action');
 const editable=page.getByRole('textbox',{name:'본문과 사이드노트 편집'});
 await editable.click();await page.keyboard.press('Control+Home');
 await button('본문을 섹션으로 묶기').click();
 await editable.focus();await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await button('노트 이미지 삽입').click();
 await button('호스트 이미지 자산 선택').click();
 const dialog=page.getByRole('dialog',{name:'호스트 이미지 자산'});
 await dialog.waitFor();
 await dialog.getByRole('radio',{name:/Fixture host image/}).check();
 await dialog.getByRole('combobox',{name:'버전'}).selectOption('revision-one');
 await dialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await dialog.waitFor({state:'hidden'});
 // First resolve is the chooser, second the single reactive refresh.
 await page.waitForFunction(()=>window.__singleRefreshCalls.length>=2);
 await page.getByRole('status',{name:'편집 작업 상태'})
  .getByText(/외부 이미지 URL 갱신: 1\/1개/).waitFor();
 const before=await page.evaluate(()=>window.__singleRefreshCalls.length);
 assert.equal(await manual.count(),1);
 await manual.click();
 await page.waitForFunction(previous=>window.__singleRefreshCalls.length===previous+1,before);
 await page.getByRole('status',{name:'편집 작업 상태'})
  .getByText(/외부 이미지 URL 갱신: 1\/1개/).waitFor();
 await delay(75);
 assert.equal(await page.evaluate(()=>window.__singleRefreshCalls.length),before+1,
  'One click must issue one resolve, not old and new controllers together');
 await page.evaluate(()=>{
  window.dispatchEvent(new Event('pageshow'));
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await delay(75);
 assert.equal(await page.evaluate(()=>window.__singleRefreshCalls.length),before+1,
  'Resume signals before the cooldown must not start duplicate refreshes');
 await button('저장').click();
 const snapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('lexical-tufte-p1-document')));
 assert.ok(snapshot);
 const images=[];
 const visit=node=>{
  if(node.type==='tufte-inline-image')images.push(node);
  for(const child of node.children??[])visit(child);
 };
 visit(snapshot.lexicalState.root);
 assert.equal(images.length,1);
 assert.deepEqual(images[0].hostAsset,{
  namespace:'single-host',assetId:'image-one',revisionId:'revision-one'
 });
 await button('불러오기').click();
 await page.waitForFunction(prev=>window.__singleRefreshCalls.length>prev,before+1);
 assert.equal(await manual.count(),1,'Restore must not mount another controller');
 assert.deepEqual(errors,[]);
 console.log('Standalone host URL refresh: single controller, manual one-resolve, cooldown, restore and locator retention PASS.');
}finally{await browser?.close();server?.kill();}
