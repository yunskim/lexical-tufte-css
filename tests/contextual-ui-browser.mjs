import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5177','--strictPort','--config','../../tests/vite-publication.config.mjs'],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){
  try{if((await fetch('http://127.0.0.1:5177/')).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5177/');const editor=page.locator('.editor');await editor.waitFor();
 const main=page.getByRole('toolbar',{name:'노트 편집',exact:true});
 await editor.click();await page.keyboard.press('Control+Home');await main.getByRole('button',{name:'본문을 섹션으로 묶기',exact:true}).click();
 await main.getByRole('button',{name:'다음 섹션 추가',exact:true}).click();await page.keyboard.insertText('선택 영역 검사');
 await page.keyboard.press('Home');await page.keyboard.down('Shift');await page.keyboard.press('End');await page.keyboard.up('Shift');
 const floating=page.getByRole('toolbar',{name:'선택 영역 서식',exact:true});await floating.waitFor();
 assert.equal(await floating.getByRole('button').count(),6);
 await floating.getByRole('button',{name:'굵게',exact:true}).click();assert.equal(await editor.locator('strong').innerText(),'선택 영역 검사');
 await page.keyboard.press('Alt+Shift+f');await page.waitForFunction(()=>document.activeElement?.closest('.selection-toolbar'));
 await page.keyboard.press('Escape');await floating.waitFor({state:'hidden'});
 await page.waitForTimeout(100);assert.equal(await floating.count(),0);
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+F10');
 const group=page.getByRole('menu',{name:'블록 유형',exact:true});await group.waitFor();
 await page.waitForFunction(()=>document.activeElement?.textContent==='본문 문단');
 await page.keyboard.press('End');assert.equal(await page.locator(':focus').innerText(),'인용문 삽입');
 await page.keyboard.press('Home');assert.equal(await page.locator(':focus').innerText(),'본문 문단');
 await page.keyboard.press('ArrowDown');assert.equal(await page.locator(':focus').innerText(),'제목 h2');
 await page.keyboard.press('Enter');assert.equal(await editor.locator('h2').innerText(),'선택 영역 검사');
 await page.waitForFunction(()=>document.querySelector('.block-context-menu > button')?.textContent?.includes('제목 h2'));
 await page.keyboard.press('Shift+F10');await group.waitFor();
 await page.waitForFunction(()=>document.activeElement?.textContent==='본문 문단');
 await page.keyboard.press('Escape');await group.waitFor({state:'hidden'});
 // Right-click a different block, then act on that target rather than the prior caret.
 await editor.locator('section').first().locator('p').first().click({button:'right',position:{x:20,y:10}});
 await group.waitFor();
 // Heading conversion is hidden when the paragraph contains a note that heading schema disallows.
 await page.waitForFunction(()=>document.querySelector('#tufte-block-menu')?.querySelectorAll('[role=menuitem]').length===8);
 assert.equal(await group.getByRole('menuitem',{name:'제목 h3',exact:true}).count(),0);
 assert.equal(await group.getByRole('menuitem',{name:'제목 h2',exact:true}).count(),0);
 assert.equal(await group.getByRole('menuitem',{name:'글머리표 목록 삽입',exact:true}).count(),1);
 await page.keyboard.press('Escape');await group.waitFor({state:'hidden'});
 // Refusing an unsupported conversion must leave the note and other block content intact.
 assert.equal(await editor.locator('[data-note-id="seed-note"]').count(),1);
 assert.equal(await editor.locator('h3').count(),0);
 assert.equal(await editor.locator('h2').innerText(),'선택 영역 검사');
 await editor.locator('h2').click({button:'right'});await group.waitFor();
 await page.waitForFunction(()=>document.activeElement?.textContent==='본문 문단');
 const menuBounds=await page.locator('.block-context-menu.is-floating').boundingBox();
 assert.ok(menuBounds&&menuBounds.x>=0&&menuBounds.y>=0&&menuBounds.x+menuBounds.width<=await page.evaluate(()=>innerWidth)&&menuBounds.y+menuBounds.height<=await page.evaluate(()=>innerHeight),JSON.stringify(menuBounds));
 await page.waitForFunction(()=>document.activeElement?.textContent==='본문 문단');
 await page.keyboard.press('End');assert.equal(await page.locator(':focus').innerText(),'인용문 삽입');
 await page.keyboard.press('Home');assert.equal(await page.locator(':focus').innerText(),'본문 문단');
 await group.getByRole('menuitem',{name:'제목 h3',exact:true}).click();
 assert.equal(await editor.locator('h3').innerText(),'선택 영역 검사');
 await page.waitForFunction(()=>document.querySelector('.block-context-menu > button')?.textContent?.includes('제목 h3'));
 await page.setViewportSize({width:375,height:812});
 await editor.locator('h3').click({button:'right'});await group.waitFor();
 await page.waitForFunction(()=>document.activeElement?.textContent==='본문 문단');
 const narrowMenu=await page.locator('.block-context-menu.is-floating').boundingBox();
 assert.ok(narrowMenu&&narrowMenu.x>=0&&narrowMenu.y>=0&&narrowMenu.x+narrowMenu.width<=375&&narrowMenu.y+narrowMenu.height<=812,JSON.stringify(narrowMenu));
 await page.keyboard.press('Escape');await group.waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.activeElement?.closest('.editor'));
 assert.equal(await page.locator('.block-context-menu.is-floating').count(),0);
 await editor.locator('h3').click({button:'right'});await group.waitFor();
 await page.locator('header').first().click({position:{x:5,y:5}});
 await group.waitFor({state:'hidden'});
 assert.equal(await page.locator('.block-context-menu.is-floating').count(),0);
 // Tab and Shift+Tab must dismiss the popup rather than leave an invisible active menu.
 await editor.locator('h3').click({button:'right'});await group.waitFor();
 await page.waitForFunction(()=>document.activeElement?.textContent==='본문 문단');
 await page.keyboard.press('Tab');await group.waitFor({state:'hidden'});
 assert.equal(await page.locator('.block-context-menu.is-floating').count(),0);
 assert.equal(await page.evaluate(()=>document.activeElement?.matches('#tufte-block-menu button')),false);
 await editor.locator('h3').click({button:'right'});await group.waitFor();
 await page.waitForFunction(()=>document.activeElement?.textContent==='본문 문단');
 await page.keyboard.press('Shift+Tab');await group.waitFor({state:'hidden'});
 assert.equal(await page.locator('.block-context-menu.is-floating').count(),0);
 assert.equal(await page.evaluate(()=>document.activeElement?.matches('#tufte-block-menu button')),false);

 await editor.locator('h3').click();await page.keyboard.press('Home');await page.keyboard.down('Shift');await page.keyboard.press('End');await page.keyboard.up('Shift');await floating.waitFor();
 const box=await floating.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=375,JSON.stringify(box));
 // Section-level insertion actions reuse existing schema-checked commands.
 await editor.locator('h3').click({button:'right'});await group.waitFor();
 await group.getByRole('menuitem',{name:'글머리표 목록 삽입',exact:true}).click();
 assert.equal(await editor.locator('section ul > li').count(),1);
 assert.equal(await editor.locator('h3').innerText(),'선택 영역 검사');
 await editor.locator('h3').click({button:'right'});await group.waitFor();
 await group.getByRole('menuitem',{name:'인용문 삽입',exact:true}).click();
 assert.equal(await editor.locator('section blockquote').count(),1);
 await editor.locator('section blockquote').first().click({button:'right'});await group.waitFor();
 await page.waitForFunction(()=>document.querySelector('.block-context-menu > button')?.textContent?.includes('인용문'));
 assert.equal(await group.getByRole('menuitem',{name:'제목 h2',exact:true}).count(),0);
 assert.equal(await group.getByRole('menuitem',{name:'본문 문단',exact:true}).count(),0);
 assert.equal(await group.getByRole('menuitem',{name:'구분선 삽입',exact:true}).count(),1);
 await page.keyboard.press('Escape');await group.waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);
 console.log('Contextual UI: icon labels, six selected-text actions, format selection, keyboard entry/Escape, block arrows/heading, schema-filtered menu insertion and 375px bounds PASS.');
}finally{await browser?.close();server.kill();}
