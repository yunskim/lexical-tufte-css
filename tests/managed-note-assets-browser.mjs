import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

const url=process.env.EDITOR_URL||'http://127.0.0.1:5191/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5191','--strictPort','--force'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');
  await setTimeout(100);
 }
 browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage();
 page.setDefaultTimeout(5000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const editor=page.getByRole('textbox',{name:'본문과 사이드노트 편집'});
 const toolbar=page.getByRole('toolbar',{name:'노트 편집'});
 const button=name=>page.getByRole('button',{name,exact:true});
 await editor.waitFor();
 await editor.click();
 await page.keyboard.press('Control+Home');
 await button('본문을 섹션으로 묶기').click();
 await editor.focus();
 await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await button('노트 이미지 삽입').click();
 assert.equal(await page.locator('[data-note-id="seed-note"] img').count(),1);

 async function registerAsset(id,src,mime,width,height){
  const inputs=[id,src,mime,width,height];
  const listener=dialog=>{
   assert.equal(dialog.type(),'prompt');
   void dialog.accept(inputs.shift());
  };
  page.on('dialog',listener);
  try{await button('문서 이미지 자산 등록').click();}
  finally{page.off('dialog',listener);}
  assert.equal(inputs.length,0,'All asset fields were requested');
 }
 await registerAsset('fixture-image','/fixture.svg','image/svg+xml','640','480');
 const catalog=page.getByRole('group',{name:'문서 이미지 자산'});
 assert.match(await catalog.innerText(),/문서 자산 1개/);
 await catalog.getByRole('button',{
  name:'선택한 노트 이미지에 fixture-image 연결'
 }).click();

 const image=page.locator('[data-note-id="seed-note"] img');
 await page.waitForFunction(()=>{
  const image=document.querySelector('[data-note-id="seed-note"] img');
  return image?.getAttribute('width')==='640'&&image?.getAttribute('height')==='480';
 });
 assert.equal(await image.getAttribute('alt'),'프로토타입의 파란 막대 그림');
 await button('저장').click();
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/한 문서로 저장/);
 const saved=await page.evaluate(()=>{
  const data=localStorage.getItem('lexical-tufte-p1-document');
  return data&&JSON.parse(data);
 });
 assert.ok(saved,'Canonical document stored in one localStorage slot');
 assert.equal(saved.schemaVersion,1);
 assert.equal(saved.assets.length,1);
 assert.deepEqual(saved.assets[0],{
  id:'fixture-image',src:'/fixture.svg',mimeType:'image/svg+xml',
  width:640,height:480
 });
 const notes=[];
 const visit=node=>{
  if(node.type==='tufte-sidenote'||node.type==='tufte-marginnote')notes.push(node);
  node.children?.forEach(visit);
 };
 visit(saved.lexicalState.root);
 const note=notes.find(item=>item.noteId==='seed-note');
 assert.ok(note);
 const storedImage=note.children.find(node=>node.type==='tufte-inline-image');
 assert.equal(storedImage.assetId,'fixture-image');
 assert.equal(storedImage.src,saved.assets[0].src);
 assert.equal(storedImage.width,saved.assets[0].width);
 assert.equal(storedImage.height,saved.assets[0].height);
 await button('JSON·HTML 확인').click();
 await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
 const published=await page.getByRole('textbox',{name:'발행 HTML'}).inputValue();
 assert.match(published,/src="\/fixture.svg" alt="프로토타입의 파란 막대 그림" width="640" height="480"/);
 const exported=JSON.parse(await page.getByRole('textbox',{name:'관리 문서 JSON'}).inputValue());
 assert.deepEqual(exported,saved,'Export uses same validated document envelope');

 // A duplicate ID must not mutate the catalog or saved envelope.
 await registerAsset('fixture-image','/another.svg','image/svg+xml','','');
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/자산 등록 거부/);
 assert.match(await catalog.innerText(),/문서 자산 1개/);
 const originalSnapshot=JSON.stringify(saved);
 await page.waitForFunction(()=>{
  const keys=Object.keys(localStorage).filter(key=>key.startsWith('lexical-tufte-recovery-v2:'));
  return keys.some(key=>{
   try{
    const snapshot=JSON.parse(localStorage.getItem(key));
    const images=[];
    const collect=node=>{
     if(node.type==='tufte-inline-image')images.push(node);
     node.children?.forEach(collect);
    };
    collect(snapshot.state.root);
    return snapshot.assets?.[0]?.id==='fixture-image'&&
     images.some(image=>image.assetId==='fixture-image');
   }catch{return false;}
  });
 },null,{timeout:5000});

 await page.reload();
 await editor.waitFor();
 await button('불러오기').click();
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/함께 불러왔습니다/);
 assert.match(await catalog.innerText(),/문서 자산 1개/);
 assert.equal(await image.getAttribute('width'),'640');
 assert.equal(await image.getAttribute('height'),'480');
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1-document')),
  originalSnapshot);

 // Corrupted canonical envelope may not silently fall back to an old raw slot.
 await page.evaluate(()=>{
  localStorage.setItem('lexical-tufte-p1-document','{"schemaVersion":1}');
  localStorage.setItem('lexical-tufte-p1','{"root":{}}');
 });
 await button('불러오기').click();
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/관리 문서 검증 실패/);
 assert.equal(await image.getAttribute('width'),'640');
 assert.match(await catalog.innerText(),/문서 자산 1개/);

 // A complete recovery snapshot restores both sides even if the normal
 // managed-save slot is corrupt. The old raw slot must not be used.
 await page.evaluate(saved=>{
  const key='lexical-tufte-recovery-v2:fixture-test';
  localStorage.setItem(key,JSON.stringify({
   savedAt:'2030-01-01T00:00:00.000Z',state:saved.lexicalState,assets:saved.assets
  }));
 },saved);
 page.on('dialog',dialog=>{
  if(dialog.type()==='prompt')void dialog.accept('0');
  else if(dialog.type()==='confirm')void dialog.accept();
 });
 await button('복구용 사본 열기').click();
 await page.waitForFunction(()=>document.querySelector('[aria-label="편집 작업 상태"]')
  ?.textContent?.includes('복구본의 본문과 자산 목록'));
 assert.match(await catalog.innerText(),/문서 자산 1개/);
 assert.equal(await image.getAttribute('width'),'640');
 assert.equal(await image.getAttribute('height'),'480');
 assert.deepEqual(errors,[]);
 console.log('Managed image catalog, same-envelope save/restore, publication, duplicate and corruption regressions written.');
}finally{
 await browser?.close();
 server?.kill();
}
