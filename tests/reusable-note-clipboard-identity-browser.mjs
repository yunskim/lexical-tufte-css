import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

/**
 * Clipboard identity regressions for the reusable TufteNoteInteractionPlugin.
 * The prototype already tests these paths; this test uses the public controlled
 * TufteEditor with two simultaneous Lexical instances and canonical JSON state.
 */
const origin=process.env.EDITOR_URL??'http://127.0.0.1:5199/';
const url=new URL('controlled.html',origin).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port','5199','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let n=0;n<100;n++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(n===99)throw new Error('Reusable note clipboard fixture server not ready');
  await delay(100);
 }
 browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage();
 page.setDefaultTimeout(10_000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);

 const first=page.getByRole('textbox',{name:'첫 번째 Tufte 편집기'});
 const second=page.getByRole('textbox',{name:'두 번째 Tufte 편집기'});
 await first.waitFor();await second.waitFor();
 const json=async(side)=>JSON.parse(await page.getByTestId(side+'-document-json').textContent());
 const notes=doc=>{
  const found=[];
  const visit=node=>{
   if(node.type==='tufte-sidenote'||node.type==='tufte-marginnote')found.push(node);
   node.children?.forEach(visit);
  };
  visit(doc.lexicalState.root);
  return found;
 };
 const noteIds=doc=>notes(doc).map(note=>note.noteId);
 const countType=(node,type)=>{
  let count=node.type===type?1:0;
  for(const child of node.children??[])count+=countType(child,type);
  return count;
 };
 const selectNote=async id=>{
  await first.focus();
  await first.locator('[data-note-id="'+id+'"]').evaluate(element=>{
   const range=document.createRange();
   range.selectNode(element);
   const selection=window.getSelection();
   selection.removeAllRanges();
   selection.addRange(range);
   document.dispatchEvent(new Event('selectionchange'));
  });
 };
 const placeCaretAfterNote=async()=>{
  // The fixture's first paragraph ends in a text span after its sidenote.
  // Do not use Control+End: the full Tufte fixture ends in other block types.
  const paragraph=first.locator('p').first();
  await paragraph.locator('[data-lexical-text="true"]').last().click();
  await page.keyboard.press('End');
 };
 const originalFirst=await json('first');
 const originalSecond=await json('second');
 const originalIds=noteIds(originalFirst);
 const originalSidenote=notes(originalFirst).find(note=>note.noteId==='first-server-note');
 assert.ok(originalSidenote,'Controlled fixture must contain the first named sidenote');
 assert.ok(countType(originalSidenote,'link')>0);
 assert.ok(countType(originalSidenote,'tufte-inline-image')>0);

 // COPY duplicates the note and its rich payload, but must allocate a new
 // canonical note ID instead of silently creating two identical identities.
 await selectNote('first-server-note');
 await page.keyboard.press('Control+c');
 await placeCaretAfterNote();
 await page.keyboard.press('Control+v');
 await page.waitForFunction(count=>document.querySelectorAll(
  '[data-testid="first-editor"] [data-note-id]'
 ).length===count+1,originalIds.length);
 const afterCopy=await json('first');
 const copiedIds=noteIds(afterCopy);
 assert.equal(copiedIds.length,originalIds.length+1);
 assert.equal(new Set(copiedIds).size,copiedIds.length,
  'Copied note must receive a distinct ID');
 assert.ok(originalIds.every(id=>copiedIds.includes(id)),
  'Copy must keep existing note identifiers stable');
 const copiedId=copiedIds.find(id=>!originalIds.includes(id));
 assert.ok(copiedId);
 const copiedNote=notes(afterCopy).find(note=>note.noteId===copiedId);
 assert.equal(countType(copiedNote,'link'),countType(originalSidenote,'link'));
 assert.equal(countType(copiedNote,'tufte-inline-image'),countType(originalSidenote,'tufte-inline-image'));
 assert.deepEqual(await json('second'),originalSecond,'Copy must not modify the other editor');

 // CUT + PASTE is a move, so the original ID should survive. It must not
 // be regenerated as a fresh copy and must not erase the new duplicate.
 await selectNote('first-server-note');
 await page.keyboard.press('Control+x');
 await page.waitForFunction(()=>!document.querySelector(
  '[data-testid="first-editor"] [data-note-id="first-server-note"]'
 ));
 await placeCaretAfterNote();
 await page.keyboard.press('Control+v');
 await page.waitForFunction(()=>Boolean(document.querySelector(
  '[data-testid="first-editor"] [data-note-id="first-server-note"]'
 )));
 const afterMove=await json('first');
 assert.equal(noteIds(afterMove).length,copiedIds.length);
 assert.deepEqual(new Set(noteIds(afterMove)),new Set(copiedIds),
  'Cut/paste must retain original identity and the other copied identity');
 assert.deepEqual(await json('second'),originalSecond);

 // A rich pasted note is forbidden inside another note. Rejecting it must
 // leave canonical state identical (not merely keep the DOM count constant).
 await selectNote(copiedId);
 await page.keyboard.press('Control+c');
 await first.locator('[data-note-id="first-server-note"] [data-lexical-text="true"]').first().click();
 await page.keyboard.press('End');
 const beforeReject=await json('first');
 await page.keyboard.press('Control+v');
 await page.getByTestId('first-notice').getByText(/노트 안에는 다른 노트를 붙여넣을 수 없습니다/).waitFor();
 assert.deepEqual(await json('first'),beforeReject,
  'Nested note paste rejection must be a canonical no-op');
 assert.deepEqual(await json('second'),originalSecond);
 assert.equal(await page.getByTestId('errors').innerText(),'');
 assert.deepEqual(errors,[]);
 console.log('Reusable note clipboard: copied IDs unique, cut/paste ID preserved, nested note paste refused, two-editor state isolation PASS');
}finally{
 await browser?.close();
 server?.kill();
}
