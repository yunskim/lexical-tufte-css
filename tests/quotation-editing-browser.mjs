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
  const snapshot=async()=>{
   await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
   if(!await page.locator('details').evaluate(el=>el.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
   return JSON.parse(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue());
  };
  const lastSection=()=>editor.locator('section').last();
  await editor.click();await page.keyboard.press('Control+Home');await action('본문을 섹션으로 묶기').click();
  await action('다음 섹션 추가').click();await page.keyboard.insertText('Quotation test');
  await action('인용문 삽입').click();
  const quote=()=>lastSection().locator(':scope > blockquote');
  await quote().click();await action('인용문 출처 추가').click();
  await quote().locator('cite').click();const original=await snapshot();
  await quote().locator('cite').click();await action('문헌 삭제').click();
  const deleted=await snapshot();assert.equal(await quote().locator('cite').count(),0);
  assert.match(await quote().innerText(),/인용문/);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await snapshot(),original);
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.deepEqual(await snapshot(),deleted);
  await quote().click();page.once('dialog',dialog=>dialog.accept('https://example.com/source'));
  await action('인용문 URL 수정').click();assert.equal(await quote().getAttribute('cite'),'https://example.com/source');
  const cited=await snapshot();
  const output=renderArticle({schemaVersion:1,id:'quotation-ui',locale:'ko-KR',title:'Quotation',assets:[],lexicalState:cited});
  assert.equal(output.ok,true,JSON.stringify(output.diagnostics));assert.match(output.html,/cite="https:\/\/example.com\/source"/);
  await quote().click();await action('인용문 URL 해제').click();assert.equal(await quote().getAttribute('cite'),null);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await snapshot(),cited);
  await quote().locator('footer').click();await action('인용 출처 삭제').click();assert.equal(await quote().locator('footer').count(),0);
  await quote().click();await action('인용문 삭제').click();assert.equal(await quote().count(),0);
  await lastSection().locator('p').click();await action('Epigraph 삽입').click();
  await lastSection().locator('.epigraph blockquote').click();await action('인용문 삭제').click();assert.equal(await lastSection().locator('.epigraph').count(),0);
  await lastSection().locator('p').click();await action('섹션 출처 삽입').click();
  await lastSection().locator(':scope > footer').click();await action('섹션 문헌 추가').click();
  await lastSection().locator(':scope > footer cite').click();await action('문헌 삭제').click();
  assert.equal(await lastSection().locator(':scope > footer cite').count(),0);
  await lastSection().locator(':scope > footer').click();await action('섹션 출처 삭제').click();assert.equal(await lastSection().locator(':scope > footer').count(),0);
  await lastSection().locator('p').click();await action('구분선 삽입').click();
  await lastSection().locator('hr').click();await action('구분선 삭제').click();assert.equal(await lastSection().locator('hr').count(),0);
  assert.deepEqual(errors,[]);console.log(`Quotation editing UI ${width}px PASS`);await page.close();
 }
}finally{await browser?.close();server.kill();}
