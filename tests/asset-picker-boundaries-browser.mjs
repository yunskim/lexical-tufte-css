import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const url=process.env.EDITOR_URL??'http://127.0.0.1:5204/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5204','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Asset picker boundary fixture server not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']});
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.setDefaultTimeout(10_000);
 await page.addInitScript(()=>{
  window.__boundaryCalls={search:0,revisions:0,resolve:0};
  window.lexicalTufteAssetNamespace='picker-boundary';
  window.lexicalTufteAssetProvider={
   async search(){
    window.__boundaryCalls.search++;
    return {items:[{id:'external-image',title:'External photo',
     mediaType:'image/svg+xml'}],nextCursor:null};
   },
   async revisions(assetId){
    window.__boundaryCalls.revisions++;
    return {items:[{id:'rev-one',assetId}],nextCursor:null};
   },
   async resolve(locator){
    window.__boundaryCalls.resolve++;
    return {assetId:locator.assetId,revisionId:locator.revisionId??'rev-one',
     mediaType:'image/svg+xml',url:'/fixture.svg',
     expiresAt:new Date(Date.now()+3600_000).toISOString()};
   }
  };
 });
 await page.goto(url);
 const button=name=>page.getByRole('button',{name,exact:true});
 const localButton=button('이미지 라이브러리에서 선택');
 const hostButton=button('호스트 이미지 자산 선택');
 assert.equal(await localButton.count(),1);
 assert.equal(await hostButton.count(),1);
 const localDialog=page.getByRole('dialog',{name:'문서 이미지 선택'});
 const hostDialog=page.getByRole('dialog',{name:'호스트 이미지 자산'});
 await localButton.click();await localDialog.waitFor();
 assert.equal(await localDialog.locator('section[aria-label="외부 이미지 자산"]').count(),0,
  'Local chooser must not reimplement external DAM search');
 assert.equal(await hostDialog.count(),0,'The host dialog must be independent');
 assert.equal(await page.evaluate(()=>window.__boundaryCalls.search),0,
  'Opening the local picker must not call AssetProvider.search');
 await localDialog.getByRole('button',{name:'취소'}).click();
 await localDialog.waitFor({state:'hidden'});

 const editable=page.getByRole('textbox',{name:'본문과 사이드노트 편집'});
 await editable.click();await page.keyboard.press('Control+Home');
 await button('본문을 섹션으로 묶기').click();
 await editable.focus();await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await button('노트 이미지 삽입').click();
 const prompts=['catalog-image','/fixture.svg','image/svg+xml','80','60'];
 const acceptPrompt=dialog=>{assert.equal(dialog.type(),'prompt');void dialog.accept(prompts.shift());};
 page.on('dialog',acceptPrompt);
 try{await button('문서 이미지 자산 등록').click();}
 finally{page.off('dialog',acceptPrompt);}
 assert.equal(prompts.length,0);
 await localButton.click();await localDialog.waitFor();
 await localDialog.getByRole('radio',{name:/catalog-image/}).check();
 await localDialog.getByRole('button',{name:'선택한 이미지 연결'}).click();
 await localDialog.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>window.__boundaryCalls.search),0,
  'Document-local connection must not contact an external asset provider');
 await button('저장').click();
 let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('lexical-tufte-p1-document')));
 assert.ok(stored);
 const images=document=>{
  const found=[];
  const walk=n=>{if(n.type==='tufte-inline-image')found.push(n);n.children?.forEach(walk);};
  walk(document.lexicalState.root);
  return found;
 };
 assert.equal(images(stored).length,1);
 assert.equal(images(stored)[0].assetId,'catalog-image');
 assert.equal(images(stored)[0].hostAsset,undefined);

 await hostButton.click();await hostDialog.waitFor();
 await page.waitForFunction(()=>window.__boundaryCalls.search===1);
 assert.equal(await localDialog.count(),0,'The local picker must not also open');
 assert.equal(await hostDialog.getByRole('radio',{name:/seed-note/}).count(),1);
 await hostDialog.getByRole('radio',{name:/External photo/}).check();
 await hostDialog.getByRole('combobox',{name:'버전'}).selectOption('rev-one');
 await hostDialog.getByRole('textbox',{name:/대체 텍스트/}).fill('Remote caption');
 await hostDialog.getByRole('button',{name:'외부 이미지 연결'}).click();
 await hostDialog.waitFor({state:'hidden'});
 await page.waitForFunction(()=>window.__boundaryCalls.resolve>=1);
 page.once('dialog',dialog=>{
  assert.equal(dialog.type(),'confirm');
  void dialog.accept();
 });
 await button('저장').click();
 stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('lexical-tufte-p1-document')));
 assert.equal(stored.assets.length,1,'The host provider cannot remove document-local catalog assets');
 assert.equal(stored.assets[0].id,'catalog-image');
 assert.equal(images(stored).length,1,'The one-image preference replaces instead of inserting');
 assert.equal(images(stored)[0].assetId,undefined);
 assert.deepEqual(images(stored)[0].hostAsset,{
  namespace:'picker-boundary',assetId:'external-image',revisionId:'rev-one'
 });
 assert.equal(images(stored)[0].alt,'Remote caption');

 // Opening the local catalog again cannot wake up the external picker.
 const beforeSearch=await page.evaluate(()=>window.__boundaryCalls.search);
 await localButton.click();await localDialog.waitFor();
 await localDialog.getByRole('button',{name:'취소'}).click();
 assert.equal(await page.evaluate(()=>window.__boundaryCalls.search),beforeSearch);
 assert.deepEqual(errors,[]);
 console.log('Asset pickers: local/host UI separation, provider isolation, local catalog preservation and host replacement PASS.');
}finally{
 await browser?.close();
 server?.kill();
}
