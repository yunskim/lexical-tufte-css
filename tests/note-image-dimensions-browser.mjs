import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

const url=process.env.EDITOR_URL||'http://127.0.0.1:5189/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5189',
 '--strictPort','--force'
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
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const editor=page.getByRole('textbox',{name:'본문과 사이드노트 편집'});
 await editor.waitFor();
 await editor.click();
 await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await page.getByRole('button',{name:'노트 이미지 삽입',exact:true}).click();
 const image=page.locator('[data-note-id="seed-note"] img');
 assert.equal(await image.count(),1);
 const open=async()=>{
  await page.getByRole('button',{name:'노트 이미지 선택',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'노트 이미지 선택'});
  await dialog.waitFor();
  return dialog;
 };
 let dialog=await open();
 const set=async(width,height)=>{
  await dialog.getByRole('textbox',{name:'너비 (px)'}).fill(width);
  await dialog.getByRole('textbox',{name:'높이 (px)'}).fill(height);
 };
 await set('0','240');
 await dialog.getByRole('button',{name:'이미지 변경 저장'}).click();
 assert.match(await dialog.getByRole('alert').innerText(),/양의 정수/);
 assert.equal(await image.getAttribute('width'),null,'Invalid dimensions must not mutate the note');
 await set('320','240');
 await dialog.getByRole('button',{name:'이미지 변경 저장'}).click();
 assert.equal(await dialog.count(),0);
 assert.equal(await image.getAttribute('width'),'320');
 assert.equal(await image.getAttribute('height'),'240');
 await page.getByRole('button',{name:'JSON·HTML 확인'}).click();
 await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
 const json=JSON.parse(await page.getByRole('textbox',{name:'문서 JSON'}).inputValue());
 const note=json.root.children[0].children.find(node=>node.type==='tufte-sidenote');
 assert.ok(note);
 const stored=note.children.find(node=>node.type==='tufte-inline-image');
 assert.equal(stored.width,320);
 assert.equal(stored.height,240);
 const html=await page.getByRole('textbox',{name:'발행 HTML'}).inputValue();
 assert.match(html,/src="\/fixture.svg" alt="프로토타입의 파란 막대 그림" width="320" height="240"/);
 await page.getByRole('button',{name:'저장'}).click();
 await page.reload();
 await editor.waitFor();
 await page.getByRole('button',{name:'불러오기'}).click();
 assert.equal(await image.getAttribute('width'),'320');
 assert.equal(await image.getAttribute('height'),'240');

 await editor.click();
 await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 dialog=await open();
 await set('','');
 await dialog.getByRole('button',{name:'이미지 변경 저장'}).click();
 assert.equal(await image.getAttribute('width'),null);
 assert.equal(await image.getAttribute('height'),null);
 assert.deepEqual(errors,[]);
 console.log('Note image properties UI: valid, invalid, restore and cleared dimensions covered.');
}finally{
 await browser?.close();
 server?.kill();
}
