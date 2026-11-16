import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// This fixture dispatches the real public Lexical commands from a host toolbar
// into the reusable controlled TufteEditor, without any standalone main.tsx.
const base=process.env.EDITOR_URL??'http://127.0.0.1:5209/';
const url=new URL('controlled.html',base).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5209','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt===99)throw Error('Controlled document commands fixture not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']});
 const page=await browser.newPage();
 page.setDefaultTimeout(10_000);
 const runtimeErrors=[];
 page.on('pageerror',error=>runtimeErrors.push(error.message));
 await page.goto(url);
 const first=page.getByTestId('first-editor');
 const second=page.getByTestId('second-editor');
 const editor=first.getByRole('textbox',{name:'첫 번째 Tufte 편집기'});
 const host=name=>page.getByRole('button',{name,exact:true});
 const read=async(which)=>JSON.parse(await page.getByTestId(which+'-document-json').textContent());
 const count=(node,type)=>Number(node.type===type)+
  (node.children??[]).reduce((sum,child)=>sum+count(child,type),0);
 const sibling=await read('second');
 const initial=await read('first');
 const focus=async()=>{
  const text=editor.locator('[data-lexical-text="true"]').first();
  await text.click();
  assert.equal(await text.evaluate(element=>Boolean(element.closest('[data-note-id]'))),false,
   'Test must target a body paragraph, not the sidenote');
 };
 const cases=[
  {button:'첫 번째 섹션 추가',type:'tufte-section'},
  {button:'첫 번째 목록 삽입',type:'list'},
  {button:'첫 번째 정의목록 삽입',type:'tufte-definition-list'},
  {button:'첫 번째 인용문 삽입',type:'quote'},
  {button:'첫 번째 그림 삽입',type:'tufte-figure'}
 ];
 for(const {button,type} of cases){
  await focus();
  const before=await read('first');
  const expected=count(before.lexicalState.root,type)+1;
  await host(button).click();
  await page.waitForFunction(({type,expected})=>{
   const raw=document.querySelector('[data-testid="first-document-json"]')?.textContent;
   if(!raw)return false;
   const walk=node=>Number(node.type===type)+(node.children??[])
    .reduce((sum,child)=>sum+walk(child),0);
   return walk(JSON.parse(raw).lexicalState.root)===expected;
  },{type,expected});
  const after=await read('first');
  assert.equal(count(after.lexicalState.root,type),expected,
   button+' must be registered in TufteEditor');
  assert.equal((await read('second')).id,sibling.id);
  assert.deepEqual(await read('second'),sibling,
   button+' must not modify the sibling editor');
  await host('첫 번째 문서 교체').click();
  await page.waitForFunction(({type,original})=>{
   const raw=document.querySelector('[data-testid="first-document-json"]')?.textContent;
   if(!raw)return false;
   const doc=JSON.parse(raw);
   const walk=node=>Number(node.type===type)+(node.children??[])
    .reduce((sum,child)=>sum+walk(child),0);
   return doc.lexicalState.root.children.length===original.rootCount&&
    walk(doc.lexicalState.root)===original.typeCount;
  },{type,original:{rootCount:initial.lexicalState.root.children.length,
   typeCount:count(initial.lexicalState.root,type)}});
 }
 // A host may dispatch a command directly while the editor is readonly.
 // A high-priority guard must consume it exactly once without a JSON mutation.
 await host('첫 번째 읽기 전용 전환').click();
 await page.waitForFunction(()=>
  document.querySelector('[data-testid="first-editor"] [contenteditable]')?.getAttribute('contenteditable')==='false');
 const locked=await read('first');
 const noticeCount=async()=>Number(
  (await first.getByTestId('first-notice-count').innerText()).match(/\d+/)?.[0]??'0');
 const beforeNotice=await noticeCount();
 await host('첫 번째 목록 삽입').click();
 await page.waitForFunction(n=>{
  const v=document.querySelector('[data-testid="first-notice-count"]')?.textContent??'';
  return Number(v.match(/\d+/)?.[0]??0)===n+1;
 },beforeNotice);
 assert.match(await first.getByTestId('first-notice').innerText(),/읽기 전용 문서는 변경할 수 없습니다/);
 assert.deepEqual(await read('first'),locked,'Readonly host dispatch must be harmless');
 assert.deepEqual(await read('second'),sibling);

 await host('첫 번째 읽기 전용 전환').click();
 await page.waitForFunction(()=>
  document.querySelector('[data-testid="first-editor"] [contenteditable]')?.getAttribute('contenteditable')==='true');
 await host('첫 번째 편집기 마운트 전환').click();
 await editor.waitFor({state:'detached'});
 await host('첫 번째 편집기 마운트 전환').click();
 await editor.waitFor();
 await focus();
 const beforeInvalid=await read('first');
 const priorNotice=await noticeCount();
 await host('첫 번째 span 종류 변경').click();
 await page.waitForFunction(n=>{
  const v=document.querySelector('[data-testid="first-notice-count"]')?.textContent??'';
  return Number(v.match(/\d+/)?.[0]??0)>=n+1;
 },priorNotice);
 assert.equal(await noticeCount(),priorNotice+1,
  'Remount must not duplicate registered command listeners or diagnostics');
 assert.match(await first.getByTestId('first-notice').innerText(),/같은 Tufte 인라인 요소 안에서만/);
 assert.deepEqual(await read('first'),beforeInvalid,'Rejected command must not mutate the document');
 assert.deepEqual(await read('second'),sibling);
 assert.equal(await page.getByTestId('errors').innerText(),'');
 assert.deepEqual(runtimeErrors,[]);
 console.log('Controlled document commands: section/list/definition/quote/figure, readonly, single diagnostic, remount and isolation PASS.');
}finally{
 await browser?.close();
 server?.kill();
}
