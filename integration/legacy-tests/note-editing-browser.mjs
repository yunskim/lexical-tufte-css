import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL ? null : spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort','--force'],{cwd:'examples/editor',stdio:'ignore'});
for(let i=0;i<100;i++){
 try{const response=await fetch(url);if(response.ok)break;}catch{}
 if(i===99){server?.kill();throw Error('Editor server did not become ready');}
 await setTimeout(100);
}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']}).catch(error=>{server?.kill();throw error;});
try {
 const results=[];
 async function scenario(name,fn){
  const page=await browser.newPage();page.setDefaultTimeout(5000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto(url);await page.locator('.editor').waitFor();await fn(page);assert.deepEqual(errors,[]);results.push({name,status:'passed'});}
  catch(e){results.push({name,status:'failed',message:e.stack});}
  finally{await page.close();}
 }
 async function enter(page){await page.locator('.editor').click();await page.keyboard.press('Control+Home');await page.keyboard.press('Alt+ArrowDown');}
 async function state(page){
  await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
  if(!await page.locator('details').evaluate(e=>e.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
  return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
 }
 async function selectNote(page){
  await page.locator('.editor').focus();
  await page.locator('[data-note-id]').first().evaluate(node=>{const r=document.createRange();r.selectNode(node);const s=window.getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
 }
 await scenario('copy/paste creates independent note identity',async page=>{
  await enter(page);await page.getByRole('button',{name:'노트 링크 삽입',exact:true}).click();
  await page.getByRole('button',{name:'노트 이미지 삽입',exact:true}).click();
  await selectNote(page);await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+End');await page.keyboard.press('Control+v');
  
  await page.waitForFunction(()=>document.querySelectorAll('[data-note-id]').length===2);
  const ids=await page.locator('[data-note-id]').evaluateAll(es=>es.map(e=>e.dataset.noteId));assert.equal(new Set(ids).size,2);
  assert.equal(await page.locator('[data-note-id] a').count(),2);assert.equal(await page.locator('[data-note-id] img').count(),2);
 });
 await scenario('note edge typing inserts exactly once and remains inside note',async page=>{
  await enter(page);
  const before=await page.locator('[data-note-id]').innerText();
  await page.keyboard.type('Z');
  const after=await page.locator('[data-note-id]').innerText();
  assert.equal(after,'Z'+before);
  const json=await state(page);
  const note=json.root.children[0].children.find(n=>n.type==='tufte-sidenote');
  assert.ok(note,'note remains in paragraph');
  assert.equal(note.children.map(n=>n.text??'').join('').startsWith('Z'),true);
 });
 await scenario('ordinary body typing does not get intercepted by note guard',async page=>{
  await page.locator('.editor').click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.type('Q');
  const json=await state(page);
  assert.equal(json.root.children[0].children[0].text.startsWith('Q'),true);
  assert.equal(await page.locator('[data-note-id]').count(),1);
 });
 await scenario('whole note delete/undo/redo preserves atomic payload',async page=>{
  const before=await state(page);await selectNote(page);await page.keyboard.press('Backspace');
  assert.equal(await page.locator('[data-note-id]').count(),0);
  await page.keyboard.press('Control+z');assert.equal(await page.locator('[data-note-id]').count(),1);
  assert.deepEqual(await state(page),before);
  await page.locator('.editor').focus();await page.keyboard.press('Control+Shift+z');assert.equal(await page.locator('[data-note-id]').count(),0);
 });
 await scenario('body paragraph split and merge keeps note identity',async page=>{
  await enter(page);await page.keyboard.press('Escape');await page.keyboard.press('Enter');
  assert.equal(await page.locator('.editor > p').count(),2);
  assert.equal(await page.locator('[data-note-id]').getAttribute('data-note-id'),'seed-note');
  await page.keyboard.press('Backspace');assert.equal(await page.locator('.editor > p').count(),1);
  assert.equal(await page.locator('[data-note-id]').getAttribute('data-note-id'),'seed-note');
 });
 await scenario('Enter inside note keeps phrasing-only structure',async page=>{
  await enter(page);await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  const json=await state(page);
  const notes=[];function scan(n){if(['tufte-sidenote','tufte-marginnote'].includes(n.type))notes.push(n);n.children?.forEach(scan);}scan(json.root);
  assert.equal(notes.length,1);assert.equal(await page.locator('[data-note-id] p,[data-note-id] div').count(),0);
  assert.equal(await page.locator('[data-note-id] br').count(),1,'Enter inserts phrasing line break');
 });
 await scenario('Korean composition at note start commits inside note',async page=>{
  await enter(page);const cdp=await page.context().newCDPSession(page);
  for(const text of ['ㅎ','하','한'])await cdp.send('Input.imeSetComposition',{text,selectionStart:text.length,selectionEnd:text.length});
  await cdp.send('Input.insertText',{text:'한'});
  assert.match(await page.locator('[data-note-id]').innerText(),/^한/);
  assert.doesNotMatch(await page.locator('.editor > p > span').first().innerText(),/한/);
 });
 await scenario('Korean composition cancellation leaves payload unchanged',async page=>{
  await enter(page);const before=await page.locator('[data-note-id]').innerText();const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition',{text:'한',selectionStart:1,selectionEnd:1});
  await cdp.send('Input.imeSetComposition',{text:'',selectionStart:0,selectionEnd:0});
  assert.equal(await page.locator('[data-note-id]').innerText(),before);
 });
 await scenario('rich note split/merge and undo/redo preserve content',async page=>{
  await enter(page);await page.getByRole('button',{name:'노트 링크 삽입',exact:true}).click();
  await page.getByRole('button',{name:'노트 이미지 삽입',exact:true}).click();
  const original=await page.locator('[data-note-id]').innerText();
  await page.locator('.editor').focus();await page.keyboard.press('Control+Home');await page.keyboard.press('Alt+ArrowDown');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  await page.getByRole('button',{name:'노트 나누기',exact:true}).click();
  assert.equal(await page.locator('[data-note-id]').count(),2);
  assert.equal((await page.locator('[data-note-id]').allInnerTexts()).join(''),original);
  const ids=await page.locator('[data-note-id]').evaluateAll(es=>es.map(e=>e.dataset.noteId));assert.equal(new Set(ids).size,2);assert.equal(ids[0],'seed-note');
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.equal(await page.locator('[data-note-id]').count(),1);
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.equal(await page.locator('[data-note-id]').count(),2);
  await page.locator('.editor').focus();await page.keyboard.press('Control+Home');await page.keyboard.press('Alt+ArrowDown');
  await page.getByRole('button',{name:'다음 노트와 합치기',exact:true}).click();
  assert.equal(await page.locator('[data-note-id]').count(),1);assert.equal(await page.locator('[data-note-id]').innerText(),original);
  assert.equal(await page.locator('[data-note-id] a').count(),1,'merged link count');assert.equal(await page.locator('[data-note-id] img').count(),1,'merged image count');
 });
 await scenario('whole note move retains identity and can undo',async page=>{
  const original=await page.locator('.editor').innerText();await enter(page);
  await page.getByRole('button',{name:'노트 앞으로 이동',exact:true}).click();
  assert.equal(await page.locator('.editor p > :first-child').getAttribute('data-note-id'),'seed-note');
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.equal(await page.locator('.editor').innerText(),original);
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();
  assert.equal(await page.locator('.editor p > :first-child').getAttribute('data-note-id'),'seed-note');
 });
 await scenario('cut/paste moves a whole note without changing identity',async page=>{
  await selectNote(page);await page.keyboard.press('Control+x');
  assert.equal(await page.locator('[data-note-id]').count(),0);
  await page.keyboard.press('Control+End');await page.keyboard.press('Control+v');
  await page.waitForFunction(()=>document.querySelectorAll('[data-note-id]').length===1);
  assert.equal(await page.locator('[data-note-id]').getAttribute('data-note-id'),'seed-note');
 });
 await scenario('Korean composition at end commits without invisible marker',async page=>{
  await enter(page);await page.locator('[data-note-id]').evaluate(node=>{const r=document.createRange();r.selectNodeContents(node);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
  const cdp=await page.context().newCDPSession(page);
  for(const text of ['ㄱ','가','각'])await cdp.send('Input.imeSetComposition',{text,selectionStart:1,selectionEnd:1});
  await cdp.send('Input.insertText',{text:'각'});
  assert.match(await page.locator('[data-note-id]').innerText(),/각$/);
  const json=await state(page);assert.doesNotMatch(JSON.stringify(json),/\u200b/);
 });
 await scenario('plain multiline paste at note edge stays phrasing content',async page=>{
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);
  await page.evaluate(()=>navigator.clipboard.writeText('여러\n줄'));
  await enter(page);await page.keyboard.press('Control+v');
  assert.match(await page.locator('[data-note-id]').innerText(),/^여러\n줄/);
  assert.equal(await page.locator('[data-note-id] br').count(),1);
  assert.equal(await page.locator('[data-note-id] p').count(),0);
 });
 await scenario('paste a copied note into another note is explicitly refused',async page=>{
  const before=await page.locator('[data-note-id]').innerText();await selectNote(page);await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+Home');await page.keyboard.press('Alt+ArrowDown');await page.keyboard.press('Control+v');
  assert.equal(await page.locator('[data-note-id]').count(),1);assert.equal(await page.locator('[data-note-id]').innerText(),before);
  assert.match(await page.getByRole('status',{name:'편집 작업 상태',exact:true}).innerText(),/붙여넣을 수 없습니다/);
 });
 await scenario('Backspace at note start exits without flattening note',async page=>{
  const before=await page.locator('[data-note-id]').innerText();await enter(page);await page.keyboard.press('Backspace');
  assert.equal(await page.locator('[data-note-id]').innerText(),before);
  assert.equal(await page.evaluate(()=>Boolean(window.getSelection()?.anchorNode?.parentElement?.closest('[data-note-id]'))),false);
 });
 await scenario('committed Korean composition undoes without a leftover marker',async page=>{
  const before=await state(page);await enter(page);const cdp=await page.context().newCDPSession(page);
  for(const text of ['ㅎ','하','한'])await cdp.send('Input.imeSetComposition',{text,selectionStart:1,selectionEnd:1});
  await cdp.send('Input.insertText',{text:'한'});
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
  assert.deepEqual(await state(page),before);
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();
  assert.match(await page.locator('[data-note-id]').innerText(),/^한/);
  assert.doesNotMatch(JSON.stringify(await state(page)),/\u200b/);
 });
 await scenario('Delete at note end exits without deleting payload',async page=>{
  await enter(page);const before=await page.locator('[data-note-id]').innerText();
  await page.locator('[data-note-id]').evaluate(node=>{const r=document.createRange();r.selectNodeContents(node);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
  await page.keyboard.press('Delete');assert.equal(await page.locator('[data-note-id]').innerText(),before);
  assert.equal(await page.evaluate(()=>Boolean(window.getSelection()?.anchorNode?.parentElement?.closest('[data-note-id]'))),false);
 });
 console.log(JSON.stringify(results,null,2));
 if(results.some(r=>r.status==='failed'))process.exitCode=1;
}finally{await browser.close();server?.kill();}
