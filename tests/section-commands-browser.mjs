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
import {renderArticle} from '../packages/render/dist/index.js';
try{
 const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url);const editor=page.locator('.editor');await editor.waitFor();
 async function snapshot(){await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();if(!await page.locator('details').evaluate(e=>e.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());}
 const click=name=>page.getByRole('button',{name,exact:true}).click();
 await editor.click();await page.keyboard.press('Control+Home');const initial=await snapshot();
 await click('본문을 섹션으로 묶기');const wrapped=await snapshot();assert.equal(wrapped.root.children.length,1);assert.equal(wrapped.root.children[0].type,'tufte-section');assert.deepEqual(wrapped.root.children[0].children,initial.root.children);
 await click('본문 제목 h2');assert.match(await page.getByRole('status',{name:'편집 작업 상태',exact:true}).innerText(),/주석/);assert.deepEqual(await snapshot(),wrapped);
 await click('다음 섹션 추가');await page.keyboard.insertText('제목 검증');assert.equal(await editor.locator(':scope > section').count(),2);
 const paragraph=await snapshot();await click('본문 제목 h2');const heading=await snapshot();assert.equal(await editor.locator('h2').innerText(),'제목 검증');
 await click('실행 취소');assert.deepEqual(await snapshot(),paragraph);await click('다시 실행');assert.deepEqual(await snapshot(),heading);
 await click('본문 제목 h3');assert.equal(await editor.locator('h3').innerText(),'제목 검증');await click('본문 문단');assert.equal(await editor.locator('h3').count(),0);
 await page.getByText('제목 검증',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.insertText('둘째 블록');await click('현재 블록 앞에서 섹션 나누기');
 assert.equal(await editor.locator(':scope > section').count(),3);assert.equal(await editor.locator(':scope > section').nth(2).innerText(),'둘째 블록');
 await page.getByText('제목 검증',{exact:true}).click();await click('다음 섹션과 합치기');assert.equal(await editor.locator(':scope > section').count(),2);assert.match(await editor.locator(':scope > section').nth(1).innerText(),/제목 검증[\s\S]*둘째 블록/);
 const merged=await snapshot();
 await page.getByText('제목 검증',{exact:true}).click();
 await click('구분선 삽입');
 const withRule=await snapshot();
 assert.equal(withRule.root.children[1].children.filter(n=>n.type==='horizontalrule').length,1);
 assert.deepEqual(withRule.root.children[0],merged.root.children[0],'F07 must not mutate the preceding section');
 assert.deepEqual(withRule.root.children[1].children.filter(n=>n.type!=='horizontalrule'),merged.root.children[1].children,'F07 must preserve every existing block');
 assert.equal(await editor.locator('hr').count(),1);
 const publishedRule=renderArticle({schemaVersion:1,id:'section-rule',locale:'ko-KR',title:'구분선 검증',assets:[],lexicalState:withRule});
 assert.equal(publishedRule.ok,true,JSON.stringify(publishedRule.diagnostics));
 assert.match(publishedRule.html,/<hr>/);
 await click('실행 취소');assert.deepEqual(await snapshot(),merged);
 await click('다시 실행');assert.deepEqual(await snapshot(),withRule);
 await click('실행 취소');assert.deepEqual(await snapshot(),merged);
 await page.getByText('노트에서 링크·강조·코드·이미지를 편집합니다.',{exact:true}).click();await click('다음 섹션 추가');assert.deepEqual(await snapshot(),merged);assert.equal(await editor.locator('[data-note-id="seed-note"]').count(),1);
 await click('저장');await page.reload();await editor.waitFor();await click('불러오기');assert.deepEqual(await snapshot(),merged);
 const result=renderArticle({schemaVersion:1,id:'section-commands',locale:'ko-KR',title:'명령 검증',assets:[],lexicalState:merged});assert.equal(result.ok,true,JSON.stringify(result.diagnostics));assert.equal((result.html.match(/<section>/g)??[]).length,2);assert.match(result.html,/seed-note/);assert.doesNotMatch(result.html,/contenteditable|data-lexical/);assert.deepEqual(errors,[]);
 console.log('P2.2.a actual React commands: explicit section wrap/add/split/merge, h2/h3/paragraph, note rejection, undo/redo, save/reopen and authoritative render PASS.');
}finally{await browser.close();server?.kill();}
