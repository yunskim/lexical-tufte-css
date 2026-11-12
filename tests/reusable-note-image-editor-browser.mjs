import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

const origin=process.env.EDITOR_URL??'http://127.0.0.1:5201/';
const url=new URL('controlled.html',origin).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5201','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Controlled note image editor server not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage();
 page.setDefaultTimeout(10000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const first=page.getByRole('textbox',{name:'첫 번째 Tufte 편집기'});
 const second=page.getByRole('textbox',{name:'두 번째 Tufte 편집기'});
 await first.waitFor();await second.waitFor();
 const button=name=>page.getByRole('button',{name,exact:true});
 const trigger=button('첫 번째 노트 이미지 속성');
 const dialog=page.getByRole('dialog',{name:'노트 이미지 선택'});
 const read=async side=>JSON.parse(await page.getByTestId(side+'-document-json').textContent());
 const findNote=doc=>{
  function walk(node){
   if(node.type==='tufte-sidenote'&&node.noteId==='first-server-note')return node;
   for(const child of node.children??[]){const hit=walk(child);if(hit)return hit;}
   return null;
  }
  return walk(doc.lexicalState.root);
 };
 const image=doc=>findNote(doc)?.children.find(n=>n.type==='tufte-inline-image');
 const identity=value=>{const {alt,width,height,...stable}=value;return stable;};
 const setCaret=async()=>{
  const target=first.locator('[data-note-id="first-server-note"] [data-lexical-text="true"]').first();
  await target.click();
  await target.evaluate(element=>{
   const node=element.firstChild;
   if(!node||node.nodeType!==Node.TEXT_NODE)throw Error('Missing note text');
   const range=document.createRange(),selection=window.getSelection();
   range.setStart(node,Math.min(2,node.textContent.length));range.collapse(true);
   selection.removeAllRanges();selection.addRange(range);
   document.dispatchEvent(new Event('selectionchange'));
  });
 };
 const waitAlt=alt=>page.waitForFunction(expected=>{
  const raw=document.querySelector('[data-testid="first-document-json"]')?.textContent;
  if(!raw)return false;
  const visit=node=>(node.type==='tufte-inline-image'&&node.alt===expected)||
   node.children?.some(visit)===true;
  return visit(JSON.parse(raw).lexicalState.root);
 },alt);
 const original=await read('first'),sibling=await read('second');
 assert.ok(image(original),'Fixture must contain a note image');
 await setCaret();await trigger.click();await dialog.waitFor();
 assert.equal(await trigger.getAttribute('aria-expanded'),'true');
 await dialog.getByRole('textbox',{name:'대체 텍스트'}).fill('공통 이미지 편집');
 await dialog.getByRole('textbox',{name:'너비 (px)'}).fill('320');
 await dialog.getByRole('textbox',{name:'높이 (px)'}).fill('240');
 await dialog.getByRole('button',{name:'이미지 변경 저장'}).click();
 await waitAlt('공통 이미지 편집');
 assert.equal(await dialog.count(),0);
 assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 const changed=await read('first');
 assert.deepEqual(identity(image(changed)),identity(image(original)));
 assert.equal(image(changed).width,320);assert.equal(image(changed).height,240);
 assert.equal(findNote(changed).noteId,'first-server-note');
 assert.deepEqual(await read('second'),sibling);
 await button('첫 번째 실행 취소').click();
 await page.waitForFunction(expected=>
  document.querySelector('[data-testid="first-document-json"]')?.textContent===JSON.stringify(expected),original);
 await button('첫 번째 다시 실행').click();await waitAlt('공통 이미지 편집');
 assert.deepEqual(await read('first'),changed);

 await button('첫 번째 읽기 전용 전환').click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] [contenteditable]')?.getAttribute('contenteditable')==='false');
 const beforeReadonly=await read('first');
 const beforeNotice=Number((await page.getByTestId('first-notice-count').textContent()).match(/\d+/)?.[0]);
 await trigger.click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-notice"]')?.textContent?.includes('읽기 전용 문서는 변경할 수 없습니다.'));
 assert.equal(Number((await page.getByTestId('first-notice-count').textContent()).match(/\d+/)?.[0]),beforeNotice+1);
 assert.equal(await dialog.count(),0);
 assert.deepEqual(await read('first'),beforeReadonly);
 await button('첫 번째 읽기 전용 전환').click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] [contenteditable]')?.getAttribute('contenteditable')==='true');

 await setCaret();await trigger.click();await dialog.waitFor();
 // The outer host can replace the canonical value even with a modal open.
 await button('첫 번째 문서 교체').evaluate(element=>element.click());
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-document-json"]')?.textContent?.includes('외부에서 교체한 문서'));
 const replaced=await read('first');
 await dialog.getByRole('textbox',{name:'대체 텍스트'}).fill('적용해서는 안 되는 편집');
 await dialog.getByRole('button',{name:'이미지 변경 저장'}).click();
 assert.match(await dialog.getByRole('alert').innerText(),/이미지 위치가 변경되었습니다/);
 assert.deepEqual(await read('first'),replaced,'Stale presentation edit must be rejected');
 await dialog.getByRole('button',{name:'취소'}).click();

 await setCaret();await trigger.click();await dialog.waitFor();
 await button('첫 번째 편집기 마운트 전환').evaluate(element=>element.click());
 await first.waitFor({state:'detached'});
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] [aria-haspopup="dialog"]')?.getAttribute('aria-expanded')==='false');
 await button('첫 번째 편집기 마운트 전환').click();
 await first.waitFor();await setCaret();await trigger.click();await dialog.waitFor();
 await dialog.getByRole('button',{name:'취소'}).click();
 assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 assert.deepEqual(await read('second'),sibling);
 assert.deepEqual(errors,[]);
 console.log('Reusable note image presentation: host commands, undo/redo, readonly, stale value, remount and isolation PASS.');
}finally{await browser?.close();server?.kill();}
