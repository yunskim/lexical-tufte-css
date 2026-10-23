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
const golden=JSON.parse(readFileSync('packages/lexical/test/golden/lexical-0.52.0-all-nodes.json','utf8'));
try {
 const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 // Test the actual React example registry and local save/reopen, not only a headless editor.
 await page.goto(url);await page.locator('.editor').waitFor();
 await page.locator('.editor p').first().click();await page.keyboard.press('End');await page.keyboard.insertText(' 이전 문서 수정');
 await page.evaluate(state=>localStorage.setItem('lexical-tufte-p1',JSON.stringify(state)),golden.lexicalState);
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 async function exported(){
  await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
  if(!await page.locator('details').evaluate(e=>e.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
  return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
 }
 assert.deepEqual(await exported(),golden.lexicalState);
 for(const name of ['실행 취소','다시 실행']){await page.getByRole('button',{name,exact:true}).click();assert.deepEqual(await exported(),golden.lexicalState);}
 assert.equal(await page.locator('.editor > section').count(),2);
 assert.equal(await page.locator('.editor .epigraph').count(),1);assert.equal(await page.locator('.editor pre').count(),2);
 await page.getByText('용어',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.insertText(' 수정');
 const edited=await exported();assert.match(JSON.stringify(edited),/용어 수정/);
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await exported(),golden.lexicalState);
 await page.evaluate(()=>localStorage.setItem('lexical-tufte-p1','{invalid JSON'));
 await page.getByRole('button',{name:'불러오기',exact:true}).click();await page.getByRole('status').filter({hasText:'문서를 불러오지 못했습니다.'}).waitFor();
 assert.deepEqual(await exported(),golden.lexicalState);
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.deepEqual(await exported(),edited);
 await page.evaluate(state=>localStorage.setItem('lexical-tufte-p1',JSON.stringify(state)),golden.lexicalState);
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 for(const name of ['실행 취소','다시 실행']){await page.getByRole('button',{name,exact:true}).click();assert.deepEqual(await exported(),golden.lexicalState);}
 await page.getByText('용어',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.insertText(' 수정');assert.deepEqual(await exported(),edited);
 const collect=n=>[n,...(n.children?.flatMap(collect)??[])];
 const nodes=collect(edited.root);assert.deepEqual([...new Set(nodes.map(n=>n.type))].sort(),[...new Set(collect(golden.lexicalState.root).map(n=>n.type))].sort());
 assert.deepEqual(nodes.filter(n=>n.type==='code-highlight').map(n=>n.highlightType),['keyword','number',null]);
 const noteTypes=new Set(['tufte-sidenote','tufte-marginnote']);
 const noteSignatures=items=>items.filter(n=>noteTypes.has(n.type)).map(n=>[n.type,n.noteId]);
 assert.deepEqual(noteSignatures(nodes),noteSignatures(collect(golden.lexicalState.root)),'concrete note kinds and identities survive edit/undo/redo');
 await page.getByRole('button',{name:'저장',exact:true}).click();await page.reload();await page.locator('.editor').waitFor();await page.getByRole('button',{name:'불러오기',exact:true}).click();assert.deepEqual(await exported(),edited);
 // Invalid raw layout states remain recoverable, cannot replace the valid save or emit HTML.
 for(const [kind,make] of [
  ['section',state=>{state.root.children[0].children=[];}],
  ['figure',state=>{collect(state.root).find(n=>n.type==='tufte-figure').children.shift();}],
  ['table-layout',state=>{collect(state.root).find(n=>n.type==='tufte-table-layout').children=[];}],
 ]){
  const invalid=structuredClone(edited);make(invalid);
  await page.evaluate(state=>localStorage.setItem('lexical-tufte-p1',JSON.stringify(state)),invalid);
  await page.getByRole('button',{name:'불러오기',exact:true}).click();
  const panel=page.getByRole('alert',{name:'문서 구조 복구'});await panel.waitFor();
  assert.deepEqual(await exported(),invalid);
  assert.equal(await page.getByRole('textbox',{name:'발행 HTML',exact:true}).inputValue(),'');
  await panel.locator('li button').first().click();assert.equal(await page.locator('.editor').evaluate(e=>e.contains(document.activeElement)),true);
  // A normal save must not overwrite the previous valid document.
  await page.evaluate(state=>localStorage.setItem('lexical-tufte-p1',JSON.stringify(state)),edited);
  await page.getByRole('button',{name:'저장',exact:true}).click();
  const stored=await page.evaluate(()=>({normal:JSON.parse(localStorage.getItem('lexical-tufte-p1')),recovery:JSON.parse(localStorage.getItem('lexical-tufte-recovery-v1'))}));
  assert.deepEqual(stored.normal,edited,kind);assert.deepEqual(stored.recovery,invalid,kind);
  await panel.getByRole('button',{name:'마지막 정상 구조로 복구',exact:true}).click();await panel.waitFor({state:'detached'});assert.deepEqual(await exported(),edited);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();await panel.waitFor();assert.deepEqual(await exported(),invalid);
  await page.getByRole('button',{name:'복구용 사본 열기',exact:true}).click();assert.deepEqual(await exported(),invalid);
  await panel.getByRole('button',{name:'마지막 정상 구조로 복구',exact:true}).click();await panel.waitFor({state:'detached'});assert.deepEqual(await exported(),edited);
 }
 assert.deepEqual(errors,[]);
 console.log('R02/R03.d browser: history boundary and actual React editor loads all registered types, edits definition text, saves/reopens without losing code tokens, note IDs or structure.');
}finally{await browser.close();server?.kill();}
