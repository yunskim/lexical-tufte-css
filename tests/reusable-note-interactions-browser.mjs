import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

const origin=process.env.EDITOR_URL??'http://127.0.0.1:5197/';
const url=new URL('controlled.html',origin).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5197','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let n=0;n<100;n++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(n===99)throw Error('Controlled note fixture server not ready');
  await delay(100);
 }
 browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage();
 page.setDefaultTimeout(10_000);
 const runtimeErrors=[];
 page.on('pageerror',error=>runtimeErrors.push(error.message));
 await page.goto(url);
 const first=page.getByRole('textbox',{name:'첫 번째 Tufte 편집기'});
 const second=page.getByRole('textbox',{name:'두 번째 Tufte 편집기'});
 const firstSection=page.getByTestId('first-editor');
 const secondSection=page.getByTestId('second-editor');
 const selectionOwner=()=>page.evaluate(()=>{
  const anchor=window.getSelection()?.anchorNode;
  const element=anchor instanceof Element?anchor:anchor?.parentElement;
  const note=element?.closest('[data-note-id]');
  if(!note)return null;
  return note.closest('[data-testid]')?.getAttribute('data-testid')??null;
 });
 await first.waitFor();await second.waitFor();
 await first.locator('[data-note-id]').first().waitFor();
 await second.locator('[data-note-id]').first().waitFor();
 const firstCount=firstSection.getByTestId('first-notice-count');
 const secondCount=secondSection.getByTestId('second-notice-count');
 assert.match(await firstCount.innerText(),/0회/);
 assert.match(await secondCount.innerText(),/0회/);

 // The reusable controlled editor must install the same note navigation
 // and clipboard/IME plugin as the original example.
 await first.click();
 await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await page.waitForFunction(()=>{
  const a=window.getSelection()?.anchorNode;
  const el=a instanceof Element?a:a?.parentElement;
  return el?.closest('[data-note-id]')?.closest('[data-testid]')?.getAttribute('data-testid')==='first-editor';
 });
 assert.equal(await selectionOwner(),'first-editor');
 assert.match(await firstSection.getByTestId('first-notice').innerText(),/노트 안입니다/);
 assert.match(await firstCount.innerText(),/1회/,'A single note entry must issue exactly one host notice');
 assert.match(await secondCount.innerText(),/0회/);
 assert.equal(await secondSection.getByTestId('second-notice').innerText(),'');
 await page.keyboard.insertText('공통 플러그인 ');
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] .editor')?.textContent?.includes('공통 플러그인'));
 assert.doesNotMatch(await second.innerText(),/공통 플러그인/);

 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>{
  const a=window.getSelection()?.anchorNode;
  const el=a instanceof Element?a:a?.parentElement;
  return Boolean(el?.closest('[data-testid="first-editor"]')&&!el?.closest('[data-note-id]'));
 });
 assert.equal(await selectionOwner(),null);
 assert.match(await firstSection.getByTestId('first-notice').innerText(),/본문으로 돌아왔습니다/);
 assert.match(await firstCount.innerText(),/2회/,'A single note exit must issue exactly one host notice');

 await second.click();
 await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await page.waitForFunction(()=>{
  const a=window.getSelection()?.anchorNode;
  const el=a instanceof Element?a:a?.parentElement;
  return el?.closest('[data-note-id]')?.closest('[data-testid]')?.getAttribute('data-testid')==='second-editor';
 });
 assert.equal(await selectionOwner(),'second-editor');
 assert.match(await secondSection.getByTestId('second-notice').innerText(),/노트 안입니다/);
 assert.match(await secondCount.innerText(),/1회/,'Second editor must have one independent note entry');
 assert.match(await firstCount.innerText(),/2회/,'Second editor must not invoke first editor callback');
 assert.match(await firstSection.getByTestId('first-notice').innerText(),/본문으로 돌아왔습니다/);
 await page.keyboard.press('Escape');
 assert.match(await secondCount.innerText(),/2회/);

 // Readonly unmounts the note interaction handlers; after switching back the
 // original editor instance must still have exactly one functional handler.
 await page.getByRole('button',{name:'첫 번째 읽기 전용 전환'}).click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] .editor')?.getAttribute('contenteditable')==='false');
 await page.getByRole('button',{name:'첫 번째 읽기 전용 전환'}).click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] .editor')?.getAttribute('contenteditable')==='true');
 await first.click();await page.keyboard.press('Control+Home');await page.keyboard.press('Alt+ArrowDown');
 await page.waitForFunction(()=>{
  const a=window.getSelection()?.anchorNode;
  const el=a instanceof Element?a:a?.parentElement;
  return el?.closest('[data-note-id]')?.closest('[data-testid]')?.getAttribute('data-testid')==='first-editor';
 });
 await page.keyboard.press('Escape');
 assert.match(await firstSection.getByTestId('first-notice').innerText(),/본문으로 돌아왔습니다/);
 assert.match(await firstCount.innerText(),/4회/,'Re-enabling readonly must not duplicate note handlers');
 assert.match(await secondCount.innerText(),/2회/);

 // After a full composer unmount/remount, note commands must still register
 // exactly once and must not deliver messages to the other instance.
 await page.getByRole('button',{name:'첫 번째 편집기 마운트 전환'}).click();
 assert.equal(await first.count(),0);
 await page.getByRole('button',{name:'첫 번째 편집기 마운트 전환'}).click();
 await first.waitFor();
 await first.locator('[data-note-id]').first().waitFor();
 await first.click();await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await page.waitForFunction(()=>{
  const a=window.getSelection()?.anchorNode;
  const el=a instanceof Element?a:a?.parentElement;
  return el?.closest('[data-note-id]')?.closest('[data-testid]')?.getAttribute('data-testid')==='first-editor';
 });
 assert.match(await firstCount.innerText(),/5회/,'Remount note entry must notify once');
 await page.keyboard.press('Escape');
 assert.match(await firstCount.innerText(),/6회/,'Remount note exit must notify once');
 assert.match(await secondCount.innerText(),/2회/,'Remount must not leak callbacks across editor instances');
 assert.deepEqual(runtimeErrors,[]);
 console.log('Reusable note interactions: Alt+Down/Escape navigation, notices, per-editor isolation, readonly/remount callback cardinality PASS');
}finally{
 await browser?.close();
 server?.kill();
}
