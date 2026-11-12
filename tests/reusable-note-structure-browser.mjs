import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

/** Host toolbar exercises exported commands through TufteEditor.editorRef. */
const origin=process.env.EDITOR_URL??'http://127.0.0.1:5200/';
const url=new URL('controlled.html',origin).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5200','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let n=0;n<100;n++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(n===99)throw new Error('Controlled note structure server not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const results=[];
 const notes=doc=>{
  const all=[];
  const visit=node=>{
   if(node.type==='tufte-sidenote'||node.type==='tufte-marginnote')all.push(node);
   node.children?.forEach(visit);
  };
  visit(doc.lexicalState.root);
  return all;
 };
 const read=async(page,side)=>JSON.parse(await page.getByTestId(side+'-document-json').textContent());
 const waitNotes=(page,count)=>page.waitForFunction(expected=>{
  const raw=document.querySelector('[data-testid="first-document-json"]')?.textContent;
  if(!raw)return false;
  try{
   const doc=JSON.parse(raw),found=[];
   const visit=node=>{if(node.type==='tufte-sidenote'||node.type==='tufte-marginnote')found.push(node);node.children?.forEach(visit);};
   visit(doc.lexicalState.root);
   return found.length===expected;
  }catch{return false;}
 },count);
 const setCaret=async (target,offset)=>{
  await target.waitFor();
  await target.click();
  await target.evaluate((element,at)=>{
   const text=element.firstChild;
   if(!text||text.nodeType!==Node.TEXT_NODE)throw new Error('Required Lexical text span is missing');
   const selection=window.getSelection(),range=document.createRange();
   range.setStart(text,Math.min(at,text.textContent.length));range.collapse(true);
   selection.removeAllRanges();selection.addRange(range);
   document.dispatchEvent(new Event('selectionchange'));
  },offset);
 };
 const start=async()=>{
  const page=await browser.newPage();
  page.setDefaultTimeout(10_000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  const first=page.getByRole('textbox',{name:'첫 번째 Tufte 편집기'});
  const second=page.getByRole('textbox',{name:'두 번째 Tufte 편집기'});
  await first.waitFor();await second.waitFor();
  return {page,first,second,errors};
 };
 const scenario=async(name,run)=>{
  const context=await start();
  try{await run(context);assert.deepEqual(context.errors,[]);results.push({name,status:'passed'});}
  catch(error){results.push({name,status:'failed',error:String(error.stack??error)});}
  finally{await context.page.close();}
 };

 await scenario('host-owned insert and undo/redo preserve other editor',async({page,first})=>{
  const original=await read(page,'first'),sibling=await read(page,'second');
  const ids=notes(original).map(note=>note.noteId);
  const body=first.locator('p').first().locator(':scope > [data-lexical-text="true"]').first();
  await setCaret(body,2);
  await page.getByRole('button',{name:'첫 번째 노트 삽입'}).click();
  await waitNotes(page,ids.length+1);
  const changed=await read(page,'first');
  const next=notes(changed);
  assert.equal(new Set(next.map(note=>note.noteId)).size,next.length);
  assert.ok(ids.every(id=>next.some(note=>note.noteId===id)));
  assert.equal(next.find(note=>!ids.includes(note.noteId)).type,'tufte-sidenote');
  assert.deepEqual(await read(page,'second'),sibling);
  await page.getByRole('button',{name:'첫 번째 실행 취소'}).click();
  await waitNotes(page,ids.length);
  assert.deepEqual(await read(page,'first'),original,'Undo restores the canonical document');
  await page.getByRole('button',{name:'첫 번째 다시 실행'}).click();
  await waitNotes(page,ids.length+1);
  assert.deepEqual(await read(page,'first'),changed,'Redo restores newly allocated note ID');

  await page.getByRole('button',{name:'첫 번째 읽기 전용 전환'}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] [contenteditable]')?.getAttribute('contenteditable')==='false');
  const locked=await read(page,'first');
  await page.getByRole('button',{name:'첫 번째 노트 삽입'}).click();
  assert.deepEqual(await read(page,'first'),locked,'Readonly editor must reject external structural commands');
  await page.getByRole('button',{name:'첫 번째 읽기 전용 전환'}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] [contenteditable]')?.getAttribute('contenteditable')==='true');
  await setCaret(body,1);
  await page.getByRole('button',{name:'첫 번째 여백 주석 삽입'}).click();
  await waitNotes(page,ids.length+2);
  assert.ok(notes(await read(page,'first')).some(note=>note.type==='tufte-marginnote'&&!ids.includes(note.noteId)));
  assert.deepEqual(await read(page,'second'),sibling);
 });

 await scenario('split and merge rich notes preserve payload/identities',async({page,first})=>{
  const initial=await read(page,'first'),sibling=await read(page,'second');
  const before=notes(initial),target=before.find(note=>note.noteId==='first-server-note');
  assert.ok(target?.children.some(node=>node.type==='link'));
  assert.ok(target?.children.some(node=>node.type==='tufte-inline-image'));
  const text=first.locator('[data-note-id="first-server-note"] [data-lexical-text="true"]').first();
  await setCaret(text,2);
  await page.getByRole('button',{name:'첫 번째 노트 나누기'}).click();
  await waitNotes(page,before.length+1);
  const split=await read(page,'first');
  assert.equal(new Set(notes(split).map(note=>note.noteId)).size,before.length+1);
  assert.ok(notes(split).some(note=>note.noteId==='first-server-note'));
  const splitNotes=notes(split).filter(note=>note.type==='tufte-sidenote');
  assert.equal(splitNotes.flatMap(note=>note.children).filter(node=>node.type==='link').length,1);
  assert.equal(splitNotes.flatMap(note=>note.children).filter(node=>node.type==='tufte-inline-image').length,1);
  await page.getByRole('button',{name:'첫 번째 실행 취소'}).click();
  await waitNotes(page,before.length);
  assert.deepEqual(await read(page,'first'),initial);
  await page.getByRole('button',{name:'첫 번째 다시 실행'}).click();
  await waitNotes(page,before.length+1);
  await setCaret(first.locator('[data-note-id="first-server-note"] [data-lexical-text="true"]').first(),1);
  await page.getByRole('button',{name:'첫 번째 노트 합치기'}).click();
  await waitNotes(page,before.length);
  const merged=notes(await read(page,'first')).find(note=>note.noteId==='first-server-note');
  assert.ok(merged.children.some(node=>node.type==='link'));
  assert.ok(merged.children.some(node=>node.type==='tufte-inline-image'));
  assert.deepEqual(await read(page,'second'),sibling);
 });

 await scenario('move and reject unsupported context without mutation',async({page,first})=>{
  const initial=await read(page,'first'),sibling=await read(page,'second');
  const body=first.locator('p').first();
  await setCaret(first.locator('[data-note-id="first-server-note"] [data-lexical-text="true"]').first(),2);
  await page.getByRole('button',{name:'첫 번째 노트 앞으로'}).click();
  await page.waitForFunction(()=>{
   const value=document.querySelector('[data-testid="first-document-json"]')?.textContent;
   return value&&JSON.parse(value).lexicalState.root.children[0].children[0].children[0]?.noteId==='first-server-note';
  });
  assert.equal((await read(page,'first')).lexicalState.root.children[0].children[0].children[0].noteId,'first-server-note');
  await page.getByRole('button',{name:'첫 번째 실행 취소'}).click();
  await page.waitForFunction(expected=>{
   const value=document.querySelector('[data-testid="first-document-json"]')?.textContent;
   return value&&JSON.stringify(JSON.parse(value))===JSON.stringify(expected);
  },initial);
  assert.deepEqual(await read(page,'first'),initial,'Undo restores note order');
  await setCaret(first.locator('[data-note-id="first-server-note"] [data-lexical-text="true"]').first(),2);
  await page.getByRole('button',{name:'첫 번째 노트 뒤로'}).click();
  await page.waitForFunction(()=>{
   const value=document.querySelector('[data-testid="first-document-json"]')?.textContent;
   if(!value)return false;
   const children=JSON.parse(value).lexicalState.root.children[0].children[0].children;
   return children.at(-1)?.noteId==='first-server-note';
  });
  await page.getByRole('button',{name:'첫 번째 실행 취소'}).click();
  await page.waitForFunction(expected=>{
   const value=document.querySelector('[data-testid="first-document-json"]')?.textContent;
   return value&&JSON.stringify(JSON.parse(value))===JSON.stringify(expected);
  },initial);
  assert.deepEqual(await read(page,'first'),initial,'Undo restores the second move as well');

  await setCaret(first.locator('[data-note-id="first-server-note"] [data-lexical-text="true"]').first(),2);
  const nestedBefore=await read(page,'first');
  await page.getByRole('button',{name:'첫 번째 노트 삽입'}).click();
  assert.deepEqual(await read(page,'first'),nestedBefore,'Nested insertion must be rejected');
  assert.match(await page.getByTestId('first-notice').innerText(),/노트 안에 노트를 넣을 수 없습니다/);

  await setCaret(body.locator(':scope > [data-lexical-text="true"]').first(),2);
  const outsideBefore=await read(page,'first');
  await page.getByRole('button',{name:'첫 번째 노트 나누기'}).click();
  assert.deepEqual(await read(page,'first'),outsideBefore,'Split outside any note is a no-op');
  assert.match(await page.getByTestId('first-notice').innerText(),/먼저 노트 안으로 이동하세요/);
  assert.deepEqual(await read(page,'second'),sibling);
 });

 await scenario('unmount clears host editorRef and remount re-registers commands once',async({page,first})=>{
  const initial=await read(page,'first');
  const sibling=await read(page,'second');
  await page.getByRole('button',{name:'첫 번째 편집기 마운트 전환'}).click();
  assert.equal(await first.count(),0);
  await page.getByRole('button',{name:'첫 번째 노트 삽입'}).click();
  assert.deepEqual(await read(page,'first'),initial);
  await page.getByRole('button',{name:'첫 번째 편집기 마운트 전환'}).click();
  await first.waitFor();
  await setCaret(first.locator('p').first().locator(':scope > [data-lexical-text="true"]').first(),2);
  await page.getByRole('button',{name:'첫 번째 노트 삽입'}).click();
  await waitNotes(page,notes(initial).length+1);
  assert.deepEqual(await read(page,'second'),sibling);
 });

 assert.equal(results.filter(item=>item.status==='failed').length,0,JSON.stringify(results,null,2));
 console.log('Reusable note structure commands: '+JSON.stringify(results));
}finally{await browser?.close();server?.kill();}
