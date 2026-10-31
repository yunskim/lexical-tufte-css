import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {renderArticle} from '../packages/render/dist/index.js';

const representative=JSON.parse(readFileSync(new URL('../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const url='http://127.0.0.1:5178/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5178','--strictPort','--force','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1440,375]){
 const page=await browser.newPage();await page.setViewportSize({width,height:1000});page.setDefaultTimeout(6000);
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
 const collect=node=>[node,...(node.children?.flatMap(collect)??[])];
 // Exercise the prototype's real localStorage restore path with the F01-F09
 // representative document before the existing composition scenario.
 await page.goto(url);
 await page.evaluate(state=>localStorage.setItem('lexical-tufte-p1',JSON.stringify(state)),representative.lexicalState);
 await page.reload();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 const representativeState=await snapshot();
 assert.deepEqual(representativeState,representative.lexicalState,'prototype restore must retain representative canonical fixture');
 // Run composition cancellation on the loaded representative itself, not only
 // on the separately constructed inline-span example below.
 const representativeText=editor.locator('section p').filter({hasText:/./}).first();
 await representativeText.evaluate(paragraph=>{
  const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT);
  const node=walker.nextNode();
  if(!node)throw Error('Representative fixture needs editable paragraph text');
  const selection=window.getSelection(),range=document.createRange();
  range.setStart(node,Math.min(1,node.textContent.length));
  range.collapse(true);
  selection.removeAllRanges();selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
 });
 await editor.focus();
 const representativeCDP=await page.context().newCDPSession(page);
 try{
  await representativeCDP.send('Input.imeSetComposition',{text:'한',selectionStart:1,selectionEnd:1});
  // Structural toolbar commands must not mutate the representative document
  // while its text selection is in an active IME composition.
  const sectionsBeforeCommand=await editor.locator('section').count();
  await action('다음 섹션 추가').click();
  assert.equal(await editor.locator('section').count(),sectionsBeforeCommand,'section insertion must be blocked during composition');
  await representativeCDP.send('Input.imeSetComposition',{text:'',selectionStart:0,selectionEnd:0});
 }finally{await representativeCDP.detach();}
 assert.deepEqual(await snapshot(),representativeState,'cancelled composition must preserve representative canonical JSON');
 const representativePublication=renderArticle({...representative,lexicalState:representativeState});
 const afterRepresentativeIME=renderArticle({...representative,lexicalState:await snapshot()});
 assert.equal(afterRepresentativeIME.ok,representativePublication.ok,'IME cancellation must preserve representative publication status');
 assert.deepEqual(afterRepresentativeIME.diagnostics,representativePublication.diagnostics,'IME cancellation must preserve publication diagnostics');
 assert.equal(afterRepresentativeIME.html,representativePublication.html,'IME cancellation must preserve representative published HTML');
 await page.evaluate(()=>localStorage.removeItem('lexical-tufte-p1'));
 await page.reload();
 await editor.waitFor();
 await editor.click();await page.keyboard.press('Control+Home');
 await action('본문을 섹션으로 묶기').click();
 await action('다음 섹션 추가').click();
 await page.keyboard.insertText('Before selected After');
 // Select exactly one part of one text node using the browser's real DOM selection.
 await page.evaluate(()=>{
  const paragraph=[...document.querySelectorAll('.editor section p')].find(p=>p.textContent==='Before selected After');
  const node=paragraph?document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT).nextNode():null;
  if(!node||node.nodeType!==Node.TEXT_NODE)throw Error('Expected a simple text node');
  const range=document.createRange();range.setStart(node,7);range.setEnd(node,15);
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
 });
 await page.waitForFunction(()=>window.getSelection()?.toString()==='selected');
 if(width===375){await action('선택 텍스트 newthought').focus();await page.keyboard.press('Space');}
 else await action('선택 텍스트 newthought').click();
 const wrapped=await snapshot();
 const span=collect(wrapped.root).find(node=>node.type==='tufte-span'&&node.kind==='newthought');
 assert.ok(span,'Selection should create a semantic Tufte span');
 assert.equal(span.children.map(node=>node.text).join(''),'selected');
 assert.equal(await editor.locator('.newthought').innerText(),'selected');
 // Wrapping must form a single undoable history boundary before persistence.
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 const undoneWrap=await snapshot();
 assert.equal(collect(undoneWrap.root).some(node=>node.type==='tufte-span'),false,'Undo must remove the newly created wrapper');
 assert.equal(await editor.locator('section').last().innerText(),'Before selected After');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();
 assert.deepEqual(await snapshot(),wrapped,'Redo must restore the same semantic wrapper');
 const published=renderArticle({schemaVersion:1,id:'inline-span-case',locale:'ko-KR',title:'인라인 속성',assets:[],lexicalState:wrapped});
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
 assert.match(published.html,/class="newthought"/);
 await page.getByRole('button',{name:'저장',exact:true}).click();
 await page.reload();await editor.waitFor();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 assert.deepEqual(await snapshot(),wrapped,'Browser save/reopen must preserve the wrapper');
 // Actual browser composition must not let a toolbar action remove its span.
 await editor.locator('.newthought').evaluate(span=>{
  const node=document.createTreeWalker(span,NodeFilter.SHOW_TEXT).nextNode();
  const range=document.createRange();range.setStart(node,2);range.collapse(true);
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
 });
 await editor.focus();
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.imeSetComposition',{text:'한',selectionStart:1,selectionEnd:1});
 assert.match(await editor.locator('.newthought').innerText(),/한/);
 await action('인라인 속성 해제').click();
 assert.equal(await editor.locator('.newthought').count(),1,'Composition keeps the span intact');
 await cdp.send('Input.imeSetComposition',{text:'',selectionStart:0,selectionEnd:0});
 assert.deepEqual(await snapshot(),wrapped,'Cancelled composition and rejected unwrap preserve canonical JSON');
 // The representative edited document has multiple sections and a semantic
 // inline node; cancellation must preserve their placement, not just text.
 const afterCancel=await snapshot();
 const beforeSections=collect(wrapped.root).filter(node=>node.type==='section').length;
 const afterSections=collect(afterCancel.root).filter(node=>node.type==='section').length;
 assert.ok(beforeSections>=2,'IME regression requires a multi-section editor document');
 assert.equal(afterSections,beforeSections,'IME cancellation must preserve section structure');
 assert.equal(collect(afterCancel.root).filter(node=>node.type==='tufte-span'&&node.kind==='newthought').length,1,'IME cancellation must preserve the inline node');

 const afterComposition=await snapshot();
 const compositionPublication=renderArticle({schemaVersion:1,id:'inline-span-case',locale:'ko-KR',title:'인라인 속성',assets:[],lexicalState:afterComposition});
 assert.equal(compositionPublication.ok,true,JSON.stringify(compositionPublication.diagnostics));
 assert.equal(compositionPublication.html,published.html,'Cancelled IME and rejected command must preserve published HTML');

 await cdp.detach();
 for(const kind of ['sans','numeral','danger']){
  await editor.locator('.newthought').click();await action(`인라인 ${kind}`).click();
  const changed=await snapshot();
  assert.equal(collect(changed.root).find(n=>n.type==='tufte-span').kind,kind);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
  assert.deepEqual(await snapshot(),wrapped,'Kind change is one undo step');
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();
  assert.deepEqual(await snapshot(),changed,'Redo retains note identity and changed kind');
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
  assert.deepEqual(await snapshot(),wrapped);
 }
 await editor.locator('.newthought').click();
 if(width===375){await action('인라인 속성 해제').focus();await page.keyboard.press('Space');}
 else await action('인라인 속성 해제').click();
 const unwrapped=await snapshot();
 assert.equal(collect(unwrapped.root).some(node=>node.type==='tufte-span'&&node.kind==='newthought'),false);
 assert.equal(await editor.locator('.newthought').count(),0);
 assert.equal(await editor.locator('section').last().innerText(),'Before selected After');
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 assert.deepEqual(await snapshot(),wrapped,'Undo must restore original wrapper');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();
 assert.deepEqual(await snapshot(),unwrapped,'Redo must remove wrapper again');
 // Exercise real toolbar commands and History rather than direct node edits.
 for(const [buttonName,nodeType] of [['번호 목록 삽입','list'],['인용문 삽입','quote']]){
  await editor.locator('section').last().click();
  const baseline=await snapshot();
  await action(buttonName).click();
  const changed=await snapshot();
  assert.notDeepEqual(changed,baseline,buttonName+' must change canonical editor JSON');
  assert.ok(collect(changed.root).some(node=>node.type===nodeType||nodeType==='quote'&&node.type==='tufte-quote'),buttonName+' must create a semantic node');
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
  assert.deepEqual(await snapshot(),baseline,buttonName+' undo must restore JSON');
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();
  assert.deepEqual(await snapshot(),changed,buttonName+' redo must restore JSON');
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 }
 assert.deepEqual(errors,[]);
 console.log(`P2.2.b.1 ${width}px: real selection, wrap/unwrap undo/redo, save/reopen and composition cancellation/guard PASS.`);
 await page.close();
 }
}finally{await browser?.close();server.kill();}
