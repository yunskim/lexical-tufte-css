import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {renderArticle} from '../packages/render/dist/index.js';
const url='http://127.0.0.1:5188/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188','--strictPort','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}if(i===99)throw Error('Editor not ready');await setTimeout(100);}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1440,375]){
  const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(8000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'domcontentloaded'});
  const editor=page.locator('.editor');await editor.waitFor();
  const action=name=>page.getByRole('toolbar',{name:'노트 편집',exact:true}).getByRole('button',{name,exact:true});
  const keyboardAction=async (name,key='Enter')=>{
   const button=action(name);await button.focus();await button.press(key);
   assert.equal(await editor.evaluate(el=>el.contains(document.activeElement)),true,`${name} returns keyboard focus to editor`);
  };
  // The inspector takes DOM focus. Never use snapshot() between a focus assertion and typing.
  const snapshot=async()=>{
   await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
   if(!await page.locator('details').evaluate(el=>el.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
   return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
  };
  const assertDocumentUnchanged=async(before,context)=>{
   const after=await snapshot();
   assert.deepEqual(after,before,`${context}: canonical JSON changed unexpectedly at ${width}px`);
  };
  const assertUndoRedo=async(before,after,context)=>{
   await page.getByRole('button',{name:'실행 취소',exact:true}).click();
   assert.deepEqual(await snapshot(),before,`${context}: undo failed at ${width}px`);
   await page.getByRole('button',{name:'다시 실행',exact:true}).click();
   assert.deepEqual(await snapshot(),after,`${context}: redo failed at ${width}px`);
  };
  // Start once before the toolbar; reach every action using native Tab events.
  const quotationLabels=['인용문 삽입','Epigraph 삽입','섹션 출처 삽입','구분선 삽입','인용문 출처 추가','섹션 문헌 추가','인용문 URL 수정','Epigraph 항목 추가','Epigraph 항목 위로','Epigraph 항목 아래로','인용문 URL 해제','문헌 삭제','인용 출처 삭제','인용문 삭제','Epigraph 전체 삭제','섹션 출처 삭제','구분선 삭제'];
  await page.evaluate(()=>{
   const toolbar=document.querySelector('[role="toolbar"][aria-label="노트 편집"]');
   const start=document.createElement('button');start.id='quotation-tab-start';start.textContent='Tab start';toolbar.before(start);start.focus();
  });
  const forward=[];
  for(let i=0;i<250;i++){
   await page.keyboard.press('Tab');
   const active=await page.evaluate(()=>{
    const el=document.activeElement,toolbar=document.querySelector('[role="toolbar"][aria-label="노트 편집"]');
    return {inside:toolbar.contains(el),label:el.getAttribute('aria-label')||el.textContent.trim()};
   });
   if(!active.inside)break;forward.push(active.label);if(i===249)throw Error('Toolbar Tab trap');
  }
  assert.deepEqual(forward.filter(label=>quotationLabels.includes(label)),quotationLabels,'Native Tab reaches quotation actions in DOM order');
  const backward=[];
  for(let i=0;i<250;i++){
   await page.keyboard.press('Shift+Tab');
   const active=await page.evaluate(()=>({id:document.activeElement.id,label:document.activeElement.getAttribute('aria-label')||document.activeElement.textContent.trim()}));
   if(active.id==='quotation-tab-start')break;backward.push(active.label);if(i===249)throw Error('Reverse Tab trap');
  }
  assert.deepEqual(backward.filter(label=>quotationLabels.includes(label)),[...quotationLabels].reverse());
  await page.locator('#quotation-tab-start').evaluate(el=>el.remove());
  const lastSection=()=>editor.locator('section').last();
  await editor.click();await page.keyboard.press('Control+Home');await action('본문을 섹션으로 묶기').click();
  await action('다음 섹션 추가').click();await page.keyboard.insertText('Quotation test');
  await keyboardAction('인용문 삽입');
  const quote=()=>lastSection().locator(':scope > blockquote');
  await quote().click();await page.keyboard.press('End');await page.keyboard.insertText(' Body edit');
  assert.match(await quote().innerText(),/Body edit/);await keyboardAction('인용문 출처 추가');
  await quote().locator('cite').click();await page.keyboard.press('End');await page.keyboard.insertText(' Cite edit');assert.match(await quote().locator('cite').innerText(),/Cite edit/);const original=await snapshot();
  const originalOutput=renderArticle({schemaVersion:1,id:'quotation-order',locale:'ko-KR',title:'Order',assets:[],lexicalState:original});
  assert.equal(originalOutput.ok,true,JSON.stringify(originalOutput.diagnostics));
  const readingOrder=await page.evaluate(html=>{
   const dom=new DOMParser().parseFromString(html,'text/html'),q=[...dom.querySelectorAll('section > blockquote')].at(-1);
   const footer=q.querySelector(':scope > footer'),cite=footer.querySelector(':scope > cite');
   return {text:q.textContent,footerText:footer.textContent,citeText:cite.textContent,footerLast:q.lastElementChild===footer,citeLast:footer.lastElementChild===cite,hidden:!!q.querySelector('[aria-hidden="true"]')};
  },originalOutput.html);
  assert.match(readingOrder.text,/인용문 Body edit.*— .*출처 Cite edit/s);
  assert.match(readingOrder.footerText,/— .*출처 Cite edit/s);assert.match(readingOrder.citeText,/출처 Cite edit/);
  assert.equal(readingOrder.footerLast,true);assert.equal(readingOrder.citeLast,true);assert.equal(readingOrder.hidden,false);
  await quote().locator('cite').click();await keyboardAction('문헌 삭제','Space');
  const deleted=await snapshot();assert.equal(await quote().locator('cite').count(),0);
  assert.match(await quote().innerText(),/인용문/);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await snapshot(),original);
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.deepEqual(await snapshot(),deleted);
  await quote().click();page.once('dialog',dialog=>dialog.accept('https://example.com/source'));
  await action('인용문 URL 수정').click();assert.equal(await quote().getAttribute('cite'),'https://example.com/source');
  const cited=await snapshot();
  const output=renderArticle({schemaVersion:1,id:'quotation-ui',locale:'ko-KR',title:'Quotation',assets:[],lexicalState:cited});
  assert.equal(output.ok,true,JSON.stringify(output.diagnostics));assert.match(output.html,/cite="https:\/\/example.com\/source"/);
  await quote().click();await keyboardAction('인용문 URL 해제');assert.equal(await quote().getAttribute('cite'),null);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await snapshot(),cited);
  await quote().locator('footer').click();await keyboardAction('인용 출처 삭제');assert.equal(await quote().locator('footer').count(),0);
  await quote().click();await keyboardAction('인용문 삭제');assert.equal(await quote().count(),0);
  await lastSection().locator('p').click();await keyboardAction('Epigraph 삽입');
  await lastSection().locator('.epigraph blockquote').click();await keyboardAction('Epigraph 항목 추가');
  assert.equal(await lastSection().locator('.epigraph > blockquote').count(),2);
  await page.keyboard.insertText(' Second');const appended=await snapshot();
  await lastSection().locator('.epigraph > blockquote').last().click();await keyboardAction('Epigraph 항목 위로');
  assert.match(await lastSection().locator('.epigraph > blockquote').first().innerText(),/Second/);const moved=await snapshot();
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await snapshot(),appended);
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.deepEqual(await snapshot(),moved);
  await lastSection().locator('.epigraph > blockquote').first().click();await keyboardAction('Epigraph 항목 아래로');assert.deepEqual(await snapshot(),appended);
  // Reopen actual DOM-produced canonical JSON, then compare semantic order in both HTML exporters.
  const input={schemaVersion:1,id:'quotation-roundtrip',locale:'ko-KR',title:'Quotation',assets:[],lexicalState:appended};
  const harnessPath='/@fs'+new URL('../packages/lexical/test/publication-browser-harness.mjs',import.meta.url).pathname;
  const roundtripPage=await browser.newPage();await roundtripPage.goto(url,{waitUntil:'domcontentloaded'});
  const roundtrip=await roundtripPage.evaluate(async({input,harnessPath})=>{
   const {mountPublicationHarness}=await import(harnessPath);
   const first=mountPublicationHarness(input);await new Promise(requestAnimationFrame);const a=first.snapshot();first.dispose();
   const second=mountPublicationHarness(JSON.parse(JSON.stringify(a.document)));await new Promise(requestAnimationFrame);const b=second.snapshot();second.dispose();return {a,b};
  },{input,harnessPath});
  await roundtripPage.close();
  assert.deepEqual(roundtrip.b.document,roundtrip.a.document);
  const pure=renderArticle(roundtrip.a.document);assert.equal(pure.ok,true,JSON.stringify(pure.diagnostics));
  const semantic=html=>page.evaluate(html=>[...new DOMParser().parseFromString(html,'text/html').querySelectorAll('.epigraph > blockquote')].map(n=>({text:n.textContent,cite:n.getAttribute('cite')})),html);
  assert.deepEqual(await semantic(roundtrip.a.html),await semantic(pure.html));
  assert.deepEqual(await semantic(roundtrip.b.html),await semantic(pure.html));
  assert.equal((await semantic(pure.html)).length,2);
  assert.match((await semantic(pure.html))[1].text,/Second/);
  // Keyboard activation must return focus to the editor with the moved quote selected.
  await lastSection().locator('.epigraph > blockquote').last().click();
  await keyboardAction('Epigraph 항목 위로','Space');
  assert.match(await lastSection().locator('.epigraph > blockquote').first().innerText(),/Second/);
  const focusMoved=await snapshot();
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
  assert.deepEqual(await snapshot(),appended);
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();
  assert.deepEqual(await snapshot(),focusMoved);
  await lastSection().locator('.epigraph > blockquote').first().click();
  await keyboardAction('Epigraph 항목 아래로','Enter');
  // Type before opening the JSON inspector: snapshot() moves DOM focus to its button.
  await page.keyboard.insertText(' Focus retained');
  assert.match(await lastSection().locator('.epigraph > blockquote').last().innerText(),/Focus retained/);
  const focusEdited=await snapshot();
  assert.match(JSON.stringify(focusEdited),/Focus retained/);
  assert.equal(focusEdited.root.children[0].type,appended.root.children[0].type);
  // Boundary actions must not mutate the canonical document.
  await lastSection().locator('.epigraph > blockquote').first().click();
  const boundaryBefore=await snapshot();
  await keyboardAction('Epigraph 항목 위로');
  await assertDocumentUnchanged(boundaryBefore,'first epigraph item moving up');
  await lastSection().locator('.epigraph > blockquote').last().click();
  await keyboardAction('Epigraph 항목 아래로');
  await assertDocumentUnchanged(boundaryBefore,'last epigraph item moving down');
  // Delete one of two items, undo it, and verify that both order and content return.
  await lastSection().locator('.epigraph > blockquote').last().click();
  await keyboardAction('인용문 삭제');
  assert.equal(await lastSection().locator('.epigraph > blockquote').count(),1);
  const oneItem=await snapshot();
  await assertUndoRedo(boundaryBefore,oneItem,'epigraph item deletion');
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
  assert.deepEqual(await snapshot(),boundaryBefore);
  await lastSection().locator('.epigraph > blockquote').last().click();await keyboardAction('인용문 삭제');
  await lastSection().locator('.epigraph blockquote').click();await keyboardAction('인용문 삭제');assert.equal(await lastSection().locator('.epigraph').count(),0);
  await lastSection().locator('p').click();await keyboardAction('섹션 출처 삽입');
  await lastSection().locator(':scope > footer').click();await page.keyboard.press('End');await page.keyboard.insertText(' Footer edit');assert.match(await lastSection().locator(':scope > footer').innerText(),/Footer edit/);await keyboardAction('섹션 문헌 추가');
  await lastSection().locator(':scope > footer cite').click();await keyboardAction('문헌 삭제','Space');
  assert.equal(await lastSection().locator(':scope > footer cite').count(),0);
  await lastSection().locator(':scope > footer').click();await keyboardAction('섹션 출처 삭제');assert.equal(await lastSection().locator(':scope > footer').count(),0);
  await lastSection().locator('p').click();await keyboardAction('구분선 삽입');
  await lastSection().locator('hr').click();await keyboardAction('구분선 삭제');assert.equal(await lastSection().locator('hr').count(),0);
  assert.deepEqual(errors,[]);console.log(`Quotation editing UI ${width}px PASS`);await page.close();
 }
}finally{await browser?.close();server.kill();}
