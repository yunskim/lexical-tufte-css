import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// Independent legacy-consumer bridge regression. The shared React provider
// components are tested in controlled-host-*.mjs; this is the older prototype.
const url=process.env.EDITOR_URL??'http://127.0.0.1:5202/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5202','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt===99)throw Error('Legacy host asset fixture server not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']});
 const page=await browser.newPage();
 page.setDefaultTimeout(10000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.__legacyMode='normal';
  window.__legacyPending=[];
  window.lexicalTufteAssetNamespace='test-host';
  window.lexicalTufteAssetProvider={
   async search(_query,_signal){
    return {items:[{id:'remote-image',title:'Remote image',mediaType:'image/svg+xml',
     currentRevision:'rev-2'}],nextCursor:null};
   },
   async revisions(assetId,_query,_signal){
    return {items:[{id:'rev-1',assetId},{id:'rev-2',assetId}],nextCursor:null};
   },
   async resolve(locator){
    const valid={assetId:locator.assetId,revisionId:locator.revisionId??'rev-2',
     mediaType:'image/svg+xml',url:'/fixture.svg',
     expiresAt:new Date(Date.now()+3600_000).toISOString()};
    const mode=window.__legacyMode;
    if(mode==='deferred')return await new Promise(resolve=>{
     window.__legacyPending.push({locator,resolve});
    });
    if(mode==='expired')return {...valid,expiresAt:new Date(Date.now()-1).toISOString()};
    if(mode==='missing-revision'){const {revisionId,...other}=valid;return other;}
    if(mode==='revision-mismatch')return {...valid,revisionId:'rev-2'};
    if(mode==='missing-media'){const {mediaType,...other}=valid;return other;}
    if(mode==='unsafe-url')return {...valid,url:'javascript:alert(1)'};
    if(mode==='wrong-asset')return {...valid,assetId:'different-image'};
    return valid;
   }
  };
 });
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
 const original=await page.locator('[data-note-id="seed-note"] img').first().getAttribute('src');
 assert.equal(original,'/fixture.svg');
 const chooser=()=>page.getByRole('dialog',{name:'호스트 이미지 자산'});
 async function openHost(){
  await button('호스트 이미지 자산 선택').click();
  await chooser().waitFor();
  await chooser().getByRole('radio',{name:/Remote image/}).check();
  await chooser().getByRole('combobox',{name:'버전'}).selectOption('rev-1');
  await chooser().getByRole('textbox',{name:/대체 텍스트/}).fill('검증된 외부 이미지');
 }
 await openHost();
 for(const mode of ['expired','missing-revision','revision-mismatch','missing-media','unsafe-url','wrong-asset']){
  await page.evaluate(value=>{window.__legacyMode=value;},mode);
  await chooser().getByRole('button',{name:'외부 이미지 연결'}).click();
  await chooser().getByRole('alert').getByText(/유효하지 않습니다/).waitFor();
  assert.equal(await chooser().count(),1,mode+' must not close the dialog');
  assert.equal(await page.locator('[data-note-id="seed-note"] img').first().getAttribute('src'),
   original,mode+' must preserve the image');
 }
 // A validated response still connects after the rejected candidates.
 await page.evaluate(()=>{window.__legacyMode='normal';});
 await chooser().getByRole('button',{name:'외부 이미지 연결'}).click();
 await chooser().waitFor({state:'hidden'});
 await button('저장').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lexical-tufte-p1-document')));
 assert.ok(saved);
 const scan=(node,hits=[])=>{
  if(node.type==='tufte-inline-image')hits.push(node);
  for(const child of node.children??[])scan(child,hits);
  return hits;
 };
 const bound=scan(saved.lexicalState.root)[0];
 assert.deepEqual(bound.hostAsset,{namespace:'test-host',assetId:'remote-image',revisionId:'rev-1'});
 assert.equal(bound.alt,'검증된 외부 이미지');

 // Keep a deferred resolve in flight while the user replaces the editor tree.
 // The old request must not restore or rebind the original target.
 await openHost();
 await page.evaluate(()=>{window.__legacyMode='deferred';window.__legacyPending=[];});
 await chooser().getByRole('button',{name:'외부 이미지 연결'}).click();
 await page.waitForFunction(()=>window.__legacyPending.length===1);
 await button('레이아웃 예제 불러오기').evaluate(node=>node.click());
 const replacement=await page.locator('[data-note-id="seed-note"] img').count();
 assert.equal(replacement,0,'Layout replacement removes the selected note image');
 await page.evaluate(()=>{
  window.__legacyMode='normal';
  const pending=window.__legacyPending.shift();
  pending.resolve({assetId:pending.locator.assetId,revisionId:pending.locator.revisionId,
   mediaType:'image/svg+xml',url:'/obsolete.svg',
   expiresAt:new Date(Date.now()+3600_000).toISOString()});
 });
 await chooser().getByRole('alert').getByText(/연결 대상 이미지가 변경되었습니다/).waitFor();
 assert.equal(await page.locator('img[src="/obsolete.svg"]').count(),0,
  'Late provider completion must not restore a replaced node');
 await chooser().getByRole('button',{name:'취소'}).click();
 await chooser().waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);
 console.log('Legacy host asset bridge: shared URL/revision validation, late-response rejection and old dialog compatibility PASS.');
}finally{
 await browser?.close();
 server?.kill();
}
