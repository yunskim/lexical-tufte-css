import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {renderArticle} from '../packages/render/dist/index.js';

const url='http://127.0.0.1:5178/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5178','--strictPort','--force','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();page.setDefaultTimeout(6000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const editor=page.locator('.editor');await editor.waitFor();
 const toolbar=page.getByRole('toolbar',{name:'노트 편집',exact:true});
 const action=name=>toolbar.getByRole('button',{name,exact:true});
 const snapshot=async()=>{
  await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
  return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
 };
 const collect=node=>[node,...(node.children?.flatMap(collect)??[])];
 await editor.click();await page.keyboard.press('Control+Home');
 await action('본문을 섹션으로 묶기').click();
 await action('다음 섹션 추가').click();
 await page.keyboard.insertText('Before selected After');
 // Select exactly one part of one text node using the browser's real DOM selection.
 await page.evaluate(()=>{
  const paragraph=[...document.querySelectorAll('.editor section p')].find(p=>p.textContent==='Before selected After');
  const node=paragraph?.firstChild;
  if(!node||node.nodeType!==Node.TEXT_NODE)throw Error('Expected a simple text node');
  const range=document.createRange();range.setStart(node,7);range.setEnd(node,15);
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
 });
 await page.waitForFunction(()=>window.getSelection()?.toString()==='selected');
 await action('선택 텍스트 newthought').click();
 const wrapped=await snapshot();
 const span=collect(wrapped.root).find(node=>node.type==='tufte-span'&&node.kind==='newthought');
 assert.ok(span,'Selection should create a semantic Tufte span');
 assert.equal(span.children.map(node=>node.text).join(''),'selected');
 assert.equal(await editor.locator('.newthought').innerText(),'selected');
 const published=renderArticle({schemaVersion:1,id:'inline-span-case',locale:'ko-KR',title:'인라인 속성',assets:[],lexicalState:wrapped});
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
 assert.match(published.html,/class="newthought"/);
 await page.getByRole('button',{name:'저장',exact:true}).click();
 await page.reload();await editor.waitFor();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 assert.deepEqual(await snapshot(),wrapped,'Browser save/reopen must preserve the wrapper');
 await editor.locator('.newthought').click();
 await action('인라인 속성 해제').click();
 const unwrapped=await snapshot();
 assert.equal(collect(unwrapped.root).some(node=>node.type==='tufte-span'&&node.kind==='newthought'),false);
 assert.equal(await editor.locator('.newthought').count(),0);
 assert.equal(await editor.locator('section').last().innerText(),'Before selected After');
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 assert.deepEqual(await snapshot(),wrapped,'Undo must restore original wrapper');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();
 assert.deepEqual(await snapshot(),unwrapped,'Redo must remove wrapper again');
 assert.deepEqual(errors,[]);
 console.log('P2.2.b browser: selected-text span wrapping, pure renderer, save/reopen, unwrap and undo/redo PASS.');
}finally{await browser?.close();server.kill();}
