import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {renderArticle} from '../packages/render/dist/index.js';

const url='http://127.0.0.1:5180/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5180','--strictPort','--force','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
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
  if(!await page.locator('details').evaluate(element=>element.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
  return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
 };
 const findList=state=>state.root.children.flatMap(section=>section.children).find(node=>node.type==='tufte-definition-list');
 await editor.click();await page.keyboard.press('Control+Home');
 await action('본문을 섹션으로 묶기').click();
 await action('다음 섹션 추가').click();
 await page.keyboard.insertText('Glossary introduction');
 await action('정의목록 삽입').click();
 assert.equal(await editor.locator('section dl > dt').count(),1);
 await editor.locator('section dl dt').first().click();
 await page.keyboard.press('End');await page.keyboard.insertText(' 1');
 await editor.locator('section dl dd').first().click();
 await page.keyboard.press('End');await page.keyboard.insertText(' 1');
 await action('정의목록 항목 추가').click();
 assert.equal(await editor.locator('section dl > dt').count(),2);
 await editor.locator('section dl dt').last().click();
 await page.keyboard.press('End');await page.keyboard.insertText(' 2');
 await editor.locator('section dl dd').last().click();
 await page.keyboard.press('End');await page.keyboard.insertText(' 2');
 const original=await snapshot();
 assert.deepEqual(findList(original).children.map(n=>n.type),['tufte-term','tufte-definition','tufte-term','tufte-definition']);
 // Snapshot may move the DOM focus: place the caret in the second pair before the move.
 await editor.locator('section dl dt').last().click();
 await action('정의 쌍 위로 이동').click();
 assert.deepEqual(await editor.locator('section dl dt').allInnerTexts(),['용어 2','용어 1']);
 assert.deepEqual(await editor.locator('section dl dd').allInnerTexts(),['설명 2','설명 1']);
 const moved=await snapshot();
 assert.notDeepEqual(moved,original);
 const published=renderArticle({schemaVersion:1,id:'definition-pairs-case',locale:'ko-KR',title:'정의목록 편집',assets:[],lexicalState:moved});
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
 assert.match(published.html,/<dl>/);
 assert.match(published.html,/<dt>[\s\S]*용어 2[\s\S]*<\/dt>[\s\S]*<dd>[\s\S]*설명 2[\s\S]*<\/dd>/);
 await page.getByRole('button',{name:'저장',exact:true}).click();
 await page.reload();await editor.waitFor();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 assert.deepEqual(await snapshot(),moved,'Saved definition list must reopen unchanged');
 await editor.locator('section dl dt').first().click();
 await action('정의 쌍 삭제').click();
 const remaining=await snapshot();
 assert.deepEqual(await editor.locator('section dl dt').allInnerTexts(),['용어 1']);
 assert.deepEqual(await editor.locator('section dl dd').allInnerTexts(),['설명 1']);
 await editor.locator('section dl dt').first().click();
 await action('정의 쌍 삭제').click();
 assert.deepEqual(await snapshot(),remaining,'Removing the final pair must reject without an invalid empty dl');
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 assert.deepEqual(await snapshot(),moved,'Undo restores the deleted pair');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();
 assert.deepEqual(await snapshot(),remaining,'Redo repeats removal');
 assert.deepEqual(errors,[]);
 console.log('P2.2.b definition browser: pair move/delete, final-pair rejection, JSON save/reopen, canonical HTML, undo/redo PASS.');
}finally{await browser?.close();server.kill();}
