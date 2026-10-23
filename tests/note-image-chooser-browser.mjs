import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

// Wagtail-style image library: choose by thumbnail, then edit properties.
const url=process.env.EDITOR_URL||'http://127.0.0.1:5188/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188',
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
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const editor=page.getByRole('textbox',{name:'본문과 사이드노트 편집'});
 await editor.waitFor();
 const button=name=>page.getByRole('button',{name,exact:true});
 await editor.click();
 await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await button('노트 이미지 삽입').click();
 await button('노트 이미지 삽입').click();
 assert.equal(await page.locator('.tufte-note-editor img').count(),2);
 const chooser=button('노트 이미지 선택');
 await chooser.click();
 assert.equal(await chooser.getAttribute('aria-expanded'),'true');
 const dialog=page.getByRole('dialog',{name:'노트 이미지 선택'});
 await dialog.waitFor();
 const choices=dialog.getByRole('group',{name:'현재 노트의 이미지 선택'});
 assert.equal(await choices.locator('li').count(),2);
 const bounds=await choices.boundingBox();
 assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=375,
  'Chooser must fit 375px without overflow: '+JSON.stringify(bounds));
 assert.equal(await dialog.locator('img').count(),3,'Two thumbnails and a selected preview');
 const second=choices.getByRole('button',{name:/이미지 2:/});
 await second.click();
 assert.equal(await second.getAttribute('aria-pressed'),'true');
 await dialog.getByRole('textbox',{name:'대체 텍스트'}).fill('두 번째 이미지의 설명');
 await dialog.getByRole('button',{name:'이미지 변경 저장'}).click();
 assert.equal(await dialog.count(),0);
 assert.equal(await chooser.getAttribute('aria-expanded'),'false');
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/이미지의 대체 텍스트와 표시 크기/);
 await page.waitForFunction(()=>document.querySelectorAll('.tufte-note-editor img')[1]?.alt==='두 번째 이미지의 설명');
 assert.equal(await page.locator('.tufte-note-editor img').first().getAttribute('alt'),'프로토타입의 파란 막대 그림');

 await button('저장').click();
 await button('JSON·HTML 확인').click();
 await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
 const read=async()=>JSON.parse(await page.getByRole('textbox',{name:'문서 JSON'}).inputValue());
 const before=await read();
 const note=before.root.children[0].children.find(n=>n.type==='tufte-sidenote');
 assert.ok(note&&note.noteId==='seed-note');
 const imageNodes=note.children.filter(n=>n.type==='tufte-inline-image');
 assert.equal(imageNodes.length,2);
 assert.equal(imageNodes[0].alt,'프로토타입의 파란 막대 그림');
 assert.equal(imageNodes[1].alt,'두 번째 이미지의 설명');
 const html=await page.getByRole('textbox',{name:'발행 HTML'}).inputValue();
 assert.match(html,/alt="두 번째 이미지의 설명"/);

 await page.reload();
 await editor.waitFor();
 await button('불러오기').click();
 await button('JSON·HTML 확인').click();
 await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
 assert.deepEqual(await read(),before,'Image choice and alt survive JSON roundtrip');

 // Search reduces the choice list; Escape cancels without mutating JSON.
 await editor.click();
 await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 await chooser.click();
 await dialog.waitFor();
 await dialog.getByRole('searchbox',{name:'이미지 검색'}).fill('두 번째 이미지');
 assert.equal(await choices.locator('li').count(),1);
 await page.keyboard.press('Escape');
 assert.equal(await dialog.count(),0);
 assert.deepEqual(errors,[]);
 console.log('Wagtail-style note image chooser: mobile grid, second-image selection, metadata, JSON/HTML and cancel covered.');
}finally{
 await browser?.close();
 server?.kill();
}
