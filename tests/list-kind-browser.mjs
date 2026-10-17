import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {renderArticle} from '../packages/render/dist/index.js';

const url='http://127.0.0.1:5179/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179','--strictPort','--force','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
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
 async function snapshot(){
  await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
  return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
 }
 const extractList=s=>s.root.children.flatMap(n=>n.children).find(n=>n.type==='list');
 await editor.click();await page.keyboard.press('Control+Home');
 await action('본문을 섹션으로 묶기').click();
 await action('다음 섹션 추가').click();
 await page.keyboard.insertText('List introduction');
 await action('글머리표 목록 삽입').click();
 await page.keyboard.insertText('First list item');
 assert.equal(await editor.locator('section ul > li').count(),1);
 const initial=await snapshot();
 assert.equal(extractList(initial).listType,'bullet');
 await action('현재 목록 번호로').click();
 const changed=await snapshot();
 assert.equal(extractList(changed).listType,'number');
 assert.equal(extractList(changed).tag,'ol');
 assert.equal(await editor.locator('section ol > li').innerText(),'First list item');
 assert.equal(extractList(changed).children[0].children[0].text,'First list item');
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 assert.deepEqual(await snapshot(),initial,'Undo must restore the original list kind');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();
 assert.deepEqual(await snapshot(),changed,'Redo must restore number list');
 await page.getByRole('button',{name:'저장',exact:true}).click();
 await page.reload();await editor.waitFor();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 assert.deepEqual(await snapshot(),changed,'Save/reopen must preserve the list kind');
 const published=renderArticle({schemaVersion:1,id:'list-kind-scenario',locale:'ko-KR',title:'목록 변환',assets:[],lexicalState:changed});
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
 assert.match(published.html,/<ol>/);
 assert.match(published.html,/<li>/);
 assert.match(published.html,/First list item/);
 await editor.locator('section p').first().click();
 const beforeReject=await snapshot();
 await action('현재 목록 글머리표로').click();
 assert.deepEqual(await snapshot(),beforeReject,'Plain paragraph must not change a list elsewhere');
 assert.deepEqual(errors,[]);
 console.log('P2.2.b list kind browser: ul/ol conversion, history, save/reopen, canonical renderer and reject PASS.');
}finally{await browser?.close();server.kill();}
