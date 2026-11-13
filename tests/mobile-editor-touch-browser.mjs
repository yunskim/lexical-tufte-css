import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// Chromium mobile viewport + real touch pointer events, not an iOS Safari run.
const base=process.env.EDITOR_URL??'http://127.0.0.1:5207/';
const url=new URL('host-assets.html',base).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5207','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser,context;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt===99)throw Error('Mobile host picker fixture server not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']});
 context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
 });
 const page=await context.newPage();
 page.setDefaultTimeout(10_000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.__touchPointers=[];
  document.addEventListener('pointerdown',event=>{
   window.__touchPointers.push({type:event.pointerType,label:event.target?.textContent??''});
  },{capture:true});
 });
 await page.goto(url);
 const alpha=page.getByTestId('host-first'),beta=page.getByTestId('host-second');
 const beforeSecond=await beta.getByTestId('host-second-json').textContent();
 const trigger=alpha.getByRole('button',{name:'호스트 이미지 자산 선택'});
 const picker=alpha.getByRole('dialog',{name:'호스트 이미지 자산'});
 const assertFits=async()=>{
  const rect=await picker.boundingBox();
  assert.ok(rect&&rect.width>0,'Modal must have a visible bounding box');
  const width=await page.evaluate(()=>document.documentElement.clientWidth);
  assert.ok(rect.x>=-2&&rect.x+rect.width<=width+2,
   'Host dialog must fit the mobile viewport horizontally');
  assert.ok(rect.y>=-2&&rect.y+rect.height<=844+2,
   'Host dialog must fit the mobile viewport vertically');
 };
 await trigger.tap();await picker.waitFor();
 await assertFits();
 assert.equal(await trigger.getAttribute('aria-expanded'),'true');
 const target=picker.getByRole('radio',{name:/alpha-server-note/});
 assert.equal(await target.count(),1);
 const touchTargetHeight=await target.evaluate(node=>node.closest('label').getBoundingClientRect().height);
 assert.ok(touchTargetHeight>=43,'Mobile radio option needs a 44px touch target');
 await target.tap();
 const search=picker.getByRole('searchbox',{name:'외부 이미지 검색'});
 await search.fill('Atlas');
 await picker.getByRole('radio',{name:/Atlas image/}).tap();
 await picker.getByRole('combobox',{name:'버전'}).selectOption('rev-1');
 await picker.getByRole('textbox',{name:/대체 텍스트/}).fill('터치 이미지');
 const connect=picker.getByRole('button',{name:'외부 이미지 연결'});
 const actionHeight=await connect.evaluate(button=>button.getBoundingClientRect().height);
 assert.ok(actionHeight>=43,'Primary mobile action needs a 44px touch target');
 await connect.tap();
 await picker.waitFor({state:'hidden'});
 await page.waitForFunction(()=>
  document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('터치 이미지'));
 assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 const firstDocument=JSON.parse(await alpha.getByTestId('host-first-json').textContent());
 const hostImages=[];
 const visit=node=>{
  if(node.type==='tufte-inline-image'&&node.hostAsset)hostImages.push(node);
  node.children?.forEach(visit);
 };
 visit(firstDocument.lexicalState.root);
 assert.equal(hostImages.length,1);
 assert.deepEqual(hostImages[0].hostAsset,{
  namespace:'alpha',assetId:'atlas',revisionId:'rev-1'
 });
 assert.equal(hostImages[0].alt,'터치 이미지');
 assert.equal(await beta.getByTestId('host-second-json').textContent(),beforeSecond,
  'Touching Alpha must not edit Beta');

 // Touch selects an actual Lexical text node; insertText exercises beforeinput
 // without pretending to reproduce an OS virtual keyboard or Korean IME.
 const editable=alpha.getByRole('textbox',{name:'Alpha 편집기'});
 await editable.locator('p').first().tap();
 assert.equal(await editable.getAttribute('contenteditable'),'true');
 await page.keyboard.insertText('모바일 본문 입력 ');
 await page.waitForFunction(()=>
  document.querySelector('[data-testid="host-first-json"]')?.textContent?.includes('모바일 본문 입력 '));
 assert.equal(await beta.getByTestId('host-second-json').textContent(),beforeSecond,
  'Touch caret and simulated text input must not edit Beta');

 // Reopen, then cancel by touch; verify modal accessibility and no document edit.
 const snapshot=await alpha.getByTestId('host-first-json').textContent();
 await trigger.tap();await picker.waitFor();await assertFits();
 await picker.getByRole('button',{name:'취소'}).tap();
 await picker.waitFor({state:'hidden'});
 assert.equal(await alpha.getByTestId('host-first-json').textContent(),snapshot);
 assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 const pointerTypes=await page.evaluate(()=>window.__touchPointers.map(event=>event.type));
 assert.ok(pointerTypes.length>=5,'The test must exercise multiple pointer actions');
 assert.ok(pointerTypes.every(type=>type==='touch'),
  'Mobile path must use touch pointer input instead of synthetic mouse clicks');
 assert.equal(await page.getByTestId('host-errors').innerText(),'');
 assert.deepEqual(errors,[]);
 console.log('Mobile Chromium emulation: 390px bounds, 44px targets, touch linking, caret + simulated text input, cancellation and isolation PASS.');
}finally{
 await context?.close();
 await browser?.close();
 server?.kill();
}
