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
 const page=await browser.newPage();page.setDefaultTimeout(5000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const editor=page.getByRole('textbox',{name:'본문과 사이드노트 편집'});
 await editor.waitFor();
 const inNote=()=>page.evaluate(()=>Boolean(window.getSelection()?.anchorNode?.parentElement?.closest('[data-note-id]')));
 await editor.click();await page.keyboard.press('Control+Home');
 await page.keyboard.press('Alt+ArrowDown');
 assert.equal(await inNote(),true,'Alt+Down enters next note');
 await page.keyboard.insertText('검증 ');
 await page.getByRole('button',{name:'노트 링크 삽입',exact:true}).click();
 await page.getByRole('button',{name:'노트 이미지 삽입',exact:true}).click();
 assert.equal(await page.locator('[data-note-id] a').count(),1);
 assert.equal(await page.locator('[data-note-id] img').count(),1);
 await page.getByRole('button',{name:'굵게',exact:true}).click();
 await page.keyboard.insertText('굵은글');
 await page.getByRole('button',{name:'굵게',exact:true}).click();
 await page.getByRole('button',{name:'기울임',exact:true}).click();
 await page.keyboard.insertText('기울임글');
 await page.getByRole('button',{name:'기울임',exact:true}).click();
 await page.getByRole('button',{name:'코드',exact:true}).click();
 await page.keyboard.insertText('code_test');
 await page.getByRole('button',{name:'코드',exact:true}).click();
 assert.match(await page.locator('[data-note-id] .text-bold').innerText(),/굵은글/);
 assert.match(await page.locator('[data-note-id] .text-italic').innerText(),/기울임글/);
 assert.match(await page.locator('[data-note-id] .text-code').innerText(),/code_test/);
 await page.getByRole('button',{name:'노트 삽입',exact:true}).click();
 assert.equal(await page.locator('[data-note-id]').count(),1,'nested insertion rejected');
 await page.keyboard.press('Escape');assert.equal(await inNote(),false,'Escape exits into body');
 await page.keyboard.insertText('본문검증');
 await page.getByRole('button',{name:'노트 삽입',exact:true}).click();
 assert.equal(await page.locator('[data-note-id]').count(),2);
 assert.equal(await inNote(),true,'insertion enters new note');
 await page.keyboard.insertText('새주석검증');
 await page.getByRole('button',{name:'저장',exact:true}).click();
 await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
 await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
 const before=await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue();
 const html=await page.getByRole('textbox',{name:'발행 HTML',exact:true}).inputValue();
 assert.match(html,/class="sidenote"/);assert.match(html,/code_test/);assert.match(html,/alt="프로토타입의 파란 막대 그림"/);
 const valid=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  return [...doc.querySelectorAll('[data-tufte-note]')].every(n=>{
   const [label,input,payload]=n.children;
   return label?.tagName==='LABEL'&&input?.tagName==='INPUT'&&payload?.className==='sidenote'&&label.htmlFor===input.id;
  });
 },html);assert.equal(valid,true,'export keeps adjacent label/input/payload');
 await page.reload();await editor.waitFor();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
 await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
 const after=await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue();
 assert.deepEqual(JSON.parse(after),JSON.parse(before),'save/reload retains rich note JSON');
 assert.deepEqual(errors,[],'no browser runtime errors');
 console.log('P1.1 Chromium: insertion, keyboard entry/exit, bold/italic/code/link/image, nested rejection, JSON save/reload and HTML structure passed.');
}finally{await browser.close();server?.kill();}
