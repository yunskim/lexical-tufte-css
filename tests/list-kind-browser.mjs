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
 // Snapshot opens external inspection UI: explicitly restore the caret inside this list.
 await editor.locator('section ul > li').click();
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
 // Structural nested lists are an editor operation, not a CSS-only indent.
 await editor.locator('section ol > li').first().click();
 await action('목록 항목 추가').click();
 await page.keyboard.insertText('Second list item');
 assert.equal(await editor.locator('section ol > li').count(),2);
 await action('목록 들여쓰기').click();
 await page.waitForFunction(()=>document.querySelector('.editor section ol ol li')?.textContent?.includes('Second list item'));
 const nested=await snapshot();
 assert.equal(extractList(nested).listType,'number');
 assert.match(JSON.stringify(nested),/Second list item/);
 await editor.locator('section ol ol li').first().click();
 await action('목록 내어쓰기').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.editor section ol > li')].some(li=>li.textContent?.includes('Second list item')));
 const flattened=await snapshot();
 assert.equal(extractList(flattened).children.length,2);
 assert.equal(await editor.locator('section ol ol li').count(),0);
 // A flat list converts back to paragraphs while retaining each item's text.
 await editor.locator('section ol > li').first().click();
 await action('목록을 문단으로 해제').click();
 const unwrapped=await snapshot();
 assert.equal(extractList(unwrapped),undefined);
 assert.deepEqual(await editor.locator('section').last().locator('p').allInnerTexts(),['List introduction','First list item','Second list item']);
 const publishedUnwrapped=renderArticle({schemaVersion:1,id:'list-unwrap-scenario',locale:'ko-KR',title:'목록 해제',assets:[],lexicalState:unwrapped});
 assert.equal(publishedUnwrapped.ok,true,JSON.stringify(publishedUnwrapped.diagnostics));
 assert.doesNotMatch(publishedUnwrapped.html,/<ol>|<ul>/);
 assert.match(publishedUnwrapped.html,/First list item/);
 assert.match(publishedUnwrapped.html,/Second list item/);
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 assert.deepEqual(await snapshot(),flattened,'Undo restores the flat list after unwrap');
 // Keyboard boundary regression: keep the published list roundtrip above intact.
 // Start from a normal paragraph so the list shortcut never steals toolbar focus.
 await editor.locator('section').last().locator('p').last().click();
 await action('글머리표 목록 삽입').click();
 await page.keyboard.insertText('Keyboard first');
 await action('목록 항목 추가').click();
 await page.keyboard.insertText('Keyboard second');
 const keyboardList=editor.locator('section ul').last();
 await keyboardList.locator('li').last().click();
 await page.keyboard.press('Tab');
 await page.waitForFunction(()=>[...document.querySelectorAll('.editor section ul ul li')].some(li=>li.textContent?.includes('Keyboard second')));
 await page.keyboard.press('Shift+Tab');
 await page.waitForFunction(()=>[...document.querySelectorAll('.editor section ul > li')].some(li=>li.textContent?.includes('Keyboard second')));
 await keyboardList.locator('li').last().click();
 await action('목록 항목 추가').click();
 await page.keyboard.press('Enter');
 await page.waitForFunction(()=>[...document.querySelectorAll('.editor section p')].some(p=>p.previousElementSibling?.tagName==='UL'));
 const afterEnter=await snapshot();
 assert.ok(extractList(afterEnter),'Other lists remain after keyboard exit');
 assert.match(JSON.stringify(afterEnter),/Keyboard first/);
 assert.match(JSON.stringify(afterEnter),/Keyboard second/);
 // Browser Backspace: empty first item must be removed without touching the next.
 await editor.locator('section').last().locator('p').last().click();
 await action('글머리표 목록 삽입').click();
 await action('목록 항목 추가').click();
 await page.keyboard.insertText('Keep after Backspace');
 const backspaceList=editor.locator('section ul').last();
 await backspaceList.locator('li').first().click();
 await page.keyboard.press('Backspace');
 await page.waitForFunction(()=>[...document.querySelectorAll('.editor section ul')].some(ul=>ul.querySelectorAll(':scope > li').length===1&&ul.textContent?.includes('Keep after Backspace')));
 assert.deepEqual(errors,[]);
 console.log('P2.2.b list browser: ul/ol conversion, structural indent/outdent, safe unwrap, history, save/reopen, renderer, reject PASS.');
}finally{await browser?.close();server.kill();}
