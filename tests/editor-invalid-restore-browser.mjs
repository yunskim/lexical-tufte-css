import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

// Regression: a malformed persisted document must not replace the live editor.
// Run separately after building; deliberately excluded from CI scripts for now.
const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174',
 '--strictPort','--config','../../tests/vite-publication.config.mjs'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try {
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');
  await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage();page.setDefaultTimeout(6000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 const editor=page.locator('.editor');await editor.waitFor();
 const snapshot=async()=>{
  await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
  return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
 };
 await editor.click();await page.keyboard.press('Control+End');
 await page.keyboard.insertText('KEEP-LIVE-EDITOR');
 const before=await snapshot();
 // Establish a separate history step before rejected imports. Lexical may
 // merge nearby text insertions within its default 1-second history window.
 await page.waitForTimeout(1200);
 await editor.click();await page.keyboard.press('Control+End');
 await page.keyboard.insertText(' HISTORY-MARKER');
 const historyState=await snapshot();
 assert.notDeepEqual(historyState,before);
 // The saved-document loader is the actual import boundary. A malformed
 // JSON payload must be rejected without clearing the current Lexical tree.
 await page.evaluate(()=>localStorage.setItem('lexical-tufte-p1','{invalid-json'));
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/불러오지 못했습니다/);
 assert.deepEqual(await snapshot(),historyState,'Malformed saved JSON replaced live editor');
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),'{invalid-json',
  'Rejected data must remain available for manual recovery');
 assert.match(await editor.innerText(),/KEEP-LIVE-EDITOR/);
 // A structurally invalid Lexical root is also an invalid import.
 await page.evaluate(()=>localStorage.setItem('lexical-tufte-p1',JSON.stringify({
  root:{type:'unknown-node',version:1,children:[]}
 })));
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 // Snapshot export updates the UI status. Assert the failure diagnostic first.
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/불러오지 못했습니다/);
 assert.deepEqual(await snapshot(),historyState,'Invalid Lexical root replaced live editor');
 assert.match(await editor.innerText(),/KEEP-LIVE-EDITOR/);
 // Rejected imports must not silently clear the undo/redo history.
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 const undone=await snapshot();
 assert.deepEqual(undone,before,'Rejected imports must retain undo history');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();
 assert.deepEqual(await snapshot(),historyState,'Rejected imports must retain redo history');
 // Recovery must remain usable after rejected input.
 await editor.click();await page.keyboard.press('Control+End');
 await page.keyboard.insertText(' AFTER-REJECTION');
 const after=await snapshot();
 assert.notDeepEqual(after,before);
 assert.match(await editor.innerText(),/AFTER-REJECTION/);
 // After failed imports the editor must still save a valid canonical state.
 await page.getByRole('button',{name:'저장',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lexical-tufte-p1')??'null'));
 assert.deepEqual(saved,after,'Saving after rejected imports must persist current editor state');
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/저장했습니다/);
 await page.reload();await page.locator('.editor').waitFor();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 assert.deepEqual(await snapshot(),after,'Saved document must reopen after rejected imports');
 // An invalid live structure must never overwrite the last good save.
 // The editor offers a layout fixture and structure inspector; exercise this
 // invariant separately once a deterministic invalid-structure fixture exists.
 assert.deepEqual(errors,[],'Rejected imports caused uncaught browser exceptions');
 console.log('Malformed persisted JSON/root: live Lexical state preserved and subsequent editing works.');
}finally{await browser?.close();server?.kill();}
