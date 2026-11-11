import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

/**
 * Regression for the reusable note plugin's PASTE_COMMAND path.
 * Uses Chromium clipboard permissions and Ctrl+V. Real OS clipboard/IME
 * acceptance is a separate gate.
 */
const origin=process.env.EDITOR_URL??'http://127.0.0.1:5198/';
const url=new URL('controlled.html',origin).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port','5198','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt===99)throw new Error('Reusable note paste fixture server not ready');
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
 const firstNote=first.locator('[data-note-id="first-server-note"]');
 const secondNote=second.locator('[data-note-id="second-server-note"]');
 await firstNote.waitFor();
 await secondNote.waitFor();

 const snapshot=async identity=>JSON.parse(
  await page.getByTestId(identity+'-document-json').textContent()
 );
 const noteNodes=document=>{
  const found=[];
  const visit=node=>{
   if(node.type==='tufte-sidenote'||node.type==='tufte-marginnote')found.push(node);
   node.children?.forEach(visit);
  };
  visit(document.lexicalState.root);
  return found;
 };
 const selectedNote=(document,id)=>noteNodes(document).find(note=>note.noteId===id);
 const countTypes=(node,type)=>{
  let count=node.type===type?1:0;
  for(const child of node.children??[])count+=countTypes(child,type);
  return count;
 };

 // The source fixture contains a link and image inside each note, so a
 // plain-text paste must not accidentally replace these nontext descendants.
 const originalFirst=await snapshot('first');
 const originalSecond=await snapshot('second');
 const firstIds=noteNodes(originalFirst).map(note=>note.noteId);
 const secondIds=noteNodes(originalSecond).map(note=>note.noteId);
 const originalNote=selectedNote(originalFirst,'first-server-note');
 assert.ok(originalNote,'First controlled document must contain its sidenote');
 assert.equal(countTypes(originalNote,'link'),1);
 assert.equal(countTypes(originalNote,'tufte-inline-image'),1);
 assert.equal(countTypes(originalNote,'linebreak'),0);

 // Give Lexical a real range selection, then paste through Chromium's
 // clipboard integration (as in the existing note-editing-browser suite).
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.evaluate(()=>navigator.clipboard.writeText('첫째줄\r\n둘째줄'));
 await firstNote.locator('[data-lexical-text="true"]').first().click();
 await page.keyboard.press('End');
 await page.keyboard.press('Control+v');
 await page.waitForFunction(()=>{
  const text=document.querySelector('[data-testid="first-document-json"]')?.textContent??'';
  return text.includes('첫째줄')&&text.includes('둘째줄');
 });
 const afterFirst=await snapshot('first');
 const modifiedNote=selectedNote(afterFirst,'first-server-note');
 assert.ok(modifiedNote);
 assert.deepEqual(noteNodes(afterFirst).map(note=>note.noteId),firstIds,
  'Plain paste must preserve sidenote and marginnote IDs');
 assert.equal(countTypes(modifiedNote,'link'),1,'Paste must preserve note link');
 assert.equal(countTypes(modifiedNote,'tufte-inline-image'),1,'Paste must preserve note image');
 assert.equal(countTypes(modifiedNote,'linebreak'),1,
  'CRLF must become exactly one Lexical line break, not an unsupported block');
 assert.deepEqual(await snapshot('second'),originalSecond,
  'First editor paste must never modify the sibling controlled document');
 assert.match(await page.getByTestId('first-changes').innerText(),/변경 알림 [1-9][0-9]*회/);
 assert.match(await page.getByTestId('second-changes').innerText(),/0회/);

 // A separate paste into the other editor may reuse the same command
 // registration, but it must have its own selection and canonical state.
 await page.evaluate(()=>navigator.clipboard.writeText('독립-첫줄\n독립-둘째줄'));
 await secondNote.locator('[data-lexical-text="true"]').first().click();
 await page.keyboard.press('End');
 await page.keyboard.press('Control+v');
 await page.waitForFunction(()=>{
  const text=document.querySelector('[data-testid="second-document-json"]')?.textContent??'';
  return text.includes('독립-첫줄')&&text.includes('독립-둘째줄');
 });
 const afterSecond=await snapshot('second');
 assert.deepEqual(noteNodes(afterSecond).map(note=>note.noteId),secondIds);
 assert.equal(countTypes(selectedNote(afterSecond,'second-server-note'),'linebreak'),1);
 assert.deepEqual(await snapshot('first'),afterFirst,
  'Second editor paste must not change the first editor document');
 assert.equal(await page.getByTestId('errors').innerText(),'');
 assert.deepEqual(runtimeErrors,[]);
 console.log('Reusable note paste: plain text CRLF, canonical linebreak, link/image and ID preservation, two-editor isolation PASS');
}finally{
 await browser?.close();
 server?.kill();
}
