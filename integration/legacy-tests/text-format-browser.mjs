import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL ? null : spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort','--force','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
for(let i=0;i<100;i++){
 try{const response=await fetch(url);if(response.ok)break;}catch{}
 if(i===99){server?.kill();throw Error('Editor server did not become ready');}
 await setTimeout(100);
}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']}).catch(error=>{server?.kill();throw error;});
import {readFileSync} from 'node:fs';
import {renderArticle} from '../packages/render/dist/index.js';
const base=JSON.parse(readFileSync('fixtures/tufte/server-document.json','utf8'));
try{
 const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);await page.locator('.editor').waitFor();
 await page.evaluate(state=>localStorage.setItem('lexical-tufte-p1',JSON.stringify(state)),base.lexicalState);
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 async function snapshot(){
  await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
  if(!await page.locator('details').evaluate(e=>e.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
  return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
 }
 async function select(text){
  await page.locator('.editor').focus();
  await page.evaluate(text=>{
   const walker=document.createTreeWalker(document.querySelector('.editor'),NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode())if(node.textContent===text){const range=document.createRange();range.selectNodeContents(node);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));return;}
   throw Error('Text target missing: '+text);
  },text);
  await page.waitForFunction(text=>getSelection()?.toString()===text,text);
 }
 const collect=n=>[n,...(n.children?.flatMap(collect)??[])];
 const editedText={};
 const bits=async text=>{const nodes=collect((await snapshot()).root).filter(n=>n.type==='text'&&n.text===text);assert.equal(nodes.length,1);return nodes[0].format;};
 for(const [original,initial,replacement]of [['서버 본문 & <script> 금지 ',0,'포맷 본문'],['주석 <내용>',1,'포맷 주석'],['문서',0,'포맷 링크']]){
  let expected=initial;
  for(const [name,flag]of [['밑줄',8],['취소선',4],['마크',128]]){
   await select(original);await page.getByRole('toolbar',{name:'노트 편집',exact:true}).getByRole('button',{name,exact:true}).click();expected|=flag;assert.equal(await bits(original),expected);
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.equal(await bits(original),expected&~flag);
   await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.equal(await bits(original),expected);
  }
  for(const [name,flag]of [['밑줄',8],['취소선',4],['마크',128]]){await select(original);await page.getByRole('toolbar',{name:'노트 편집',exact:true}).getByRole('button',{name,exact:true}).click();expected&=~flag;assert.equal(await bits(original),expected);}
  assert.equal(expected,initial);
  for(const name of ['밑줄','취소선','마크']){await select(original);await page.getByRole('toolbar',{name:'노트 편집',exact:true}).getByRole('button',{name,exact:true}).click();}
  if(original==='문서')assert.ok(collect((await snapshot()).root).some(n=>n.type==='link'&&n.url==='https://lexical.dev'&&n.children.some(c=>c.text===original)));
  await select(original);await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');await page.keyboard.insertText(replacement);
  const changed=original.slice(0,1)+replacement+original.slice(1);editedText[replacement]=changed;assert.equal(await bits(changed),initial|140);
 }
 const edited=await snapshot();
 const result=renderArticle({...base,lexicalState:edited});assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<mark><u><s>/);assert.match(result.html,/포맷 본문/);assert.match(result.html,/포맷 주석/);
 const published=await browser.newPage({javaScriptEnabled:false});await published.setContent(result.html);
 for(const text of ['포맷 본문','포맷 주석','포맷 링크']){const target=published.getByText(editedText[text],{exact:true});assert.equal(await target.evaluate(e=>Boolean(e.closest('mark')&&e.closest('u')&&e.closest('s'))),true);}
 assert.equal(await published.getByText(editedText['포맷 링크'],{exact:true}).evaluate(e=>e.closest('a')?.getAttribute('href')),'https://lexical.dev',result.html);
 assert.equal(await published.getByText(editedText['포맷 주석'],{exact:true}).evaluate(e=>Boolean(e.closest('strong')&&e.closest('.sidenote'))),true);
 await page.getByRole('button',{name:'저장',exact:true}).click();await page.reload();await page.locator('.editor').waitFor();await page.getByRole('button',{name:'불러오기',exact:true}).click();assert.deepEqual(await snapshot(),edited);
 const style=await page.getByText(editedText['포맷 본문'],{exact:true}).evaluate(e=>({line:getComputedStyle(e).textDecorationLine,background:getComputedStyle(e).backgroundColor}));assert.match(style.line,/underline/);assert.match(style.line,/line-through/);assert.notEqual(style.background,'rgba(0, 0, 0, 0)');
 await select(editedText['포맷 본문']);await page.keyboard.press('Control+c');await select('번호 없는 주석');await page.keyboard.press('Control+v');
 const pasted=await snapshot(),margin=collect(pasted.root).find(n=>n.type==='tufte-marginnote'&&n.noteId==='server-margin');assert.ok(margin.children.some(n=>n.type==='text'&&n.text===editedText['포맷 본문']&&n.format===140));
 assert.deepEqual(errors,[]);console.log('R10: body/note/link format bits, combinations, toggle off/on, undo/redo, edit, reopen, combined CSS and semantic publication passed.');
}finally{await browser.close();server?.kill();}
