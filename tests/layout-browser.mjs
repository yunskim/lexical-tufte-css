import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL ? null : spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort','--force'],{cwd:'examples/editor',stdio:'ignore'});
for(let i=0;i<100;i++){
 try{const response=await fetch(url);if(response.ok)break;}catch{}
 if(i===99){server?.kill();throw Error('Editor server did not become ready');}
 await setTimeout(100);
}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']}).catch(error=>{server?.kill();throw error;});
try {
 const page=await browser.newPage();page.setDefaultTimeout(5000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('.editor').waitFor();
 await page.getByRole('button',{name:'레이아웃 예제 불러오기',exact:true}).click();
 assert.equal(await page.locator('.editor > section').count(),1);
 assert.equal(await page.locator('.editor figure').count(),2);
 assert.equal(await page.locator('.editor table').count(),3);
 // Edit real caption/cell content before export, not just a prebuilt HTML string.
 await page.locator('.editor figcaption').first().click();await page.keyboard.press('End');await page.keyboard.insertText(' 편집');
 await page.locator('.editor table').first().locator('td').first().click();await page.keyboard.press('End');await page.keyboard.insertText(' 수정');
 await page.getByRole('button',{name:'저장',exact:true}).click();
 async function exported(){
  await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
  if(!await page.locator('details').evaluate(e=>e.open))await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
  return {html:await page.getByRole('textbox',{name:'발행 HTML',exact:true}).inputValue(),json:await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue()};
 }
 const {html,json}=await exported();
 assert.match(html,/캡션입니다.*편집|비교합니다.*편집/);assert.match(html,/값 1 수정/);
 assert.doesNotMatch(html,/data-tufte-editor|contenteditable|data-lexical-|data-temporary/i);
 await page.reload();await page.locator('.editor').waitFor();await page.getByRole('button',{name:'불러오기',exact:true}).click();
 assert.equal((await exported()).json,json,'layout JSON is stable after save/reload');
 const {readFile}=await import('node:fs/promises');
 const css=await readFile('fixtures/tufte/upstream/tufte.css','utf8');
 const reference=await readFile('fixtures/tufte/layout-reference.html','utf8');
 const snapshots=[];
 for(const width of [1440,761,760,759,375]){
  const measurements=[];
  for(const markup of [html,reference]){
   await page.setViewportSize({width,height:1100});
   await page.setContent(`<style>${css}</style><article>${markup}</article>`);
   const m=await page.evaluate(()=>{
    const section=document.querySelector('article > section');
    const children=[...section.children].map(e=>e.tagName+(e.className?'.'+e.className:''));
    const wide=section.getBoundingClientRect().width;
    const ratio=s=>document.querySelector(s).getBoundingClientRect().width/wide;
    const style=(s,p)=>getComputedStyle(document.querySelector(s))[p];
    const scroll=document.querySelector('div.table-wrapper');
    return {children,figuresInsideParagraph:document.querySelectorAll('p figure').length,
     captionCount:document.querySelectorAll('section > figure > figcaption').length,
     directTables:document.querySelectorAll('section > table').length,
     paragraph:ratio('section > p'),figure:ratio('section > figure:not(.fullwidth)'),fullFigure:ratio('section > figure.fullwidth'),
     table:ratio('section > table:not(.fullwidth)'),fullTable:ratio('section > table.fullwidth'),
     captionFloat:style('figure > figcaption','float'),captionMax:style('figure > figcaption','maxWidth'),
     fullCaptionMargin:style('figure.fullwidth > figcaption','marginRight'),
     scrollX:style('div.table-wrapper','overflowX'),scrollWidth:scroll.scrollWidth,clientWidth:scroll.clientWidth,overflows:scroll.scrollWidth>scroll.clientWidth,
     horizontalDocumentOverflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   measurements.push(m);
  }
  const [actual,expected]=measurements;
  assert.deepEqual(actual.children,['P','FIGURE','FIGURE.fullwidth','TABLE','TABLE.fullwidth','DIV.table-wrapper','P']);
  assert.equal(actual.figuresInsideParagraph,0);assert.equal(actual.captionCount,2);assert.equal(actual.directTables,2);
  for(const key of ['paragraph','figure','fullFigure','table','fullTable'])assert.ok(Math.abs(actual[key]-expected[key])<0.02,`${width}px ${key}: ${actual[key]} vs ${expected[key]}`);
  for(const key of ['captionFloat','captionMax','fullCaptionMargin','scrollX','overflows'])assert.equal(actual[key],expected[key],`${width}px ${key}`);
  assert.equal(actual.scrollX,'auto');assert.equal(actual.overflows,true,`${width}px scrollWidth=${actual.scrollWidth}, clientWidth=${actual.clientWidth}`);
  assert.equal(actual.horizontalDocumentOverflow,false,'wide table is contained by scroll wrapper');
  snapshots.push({width,...actual});
 }
 assert.deepEqual(errors,[]);
 console.log('P1.4 layout: caption/cell editing, JSON roundtrip, direct-child publication structure and reference CSS geometry passed at 1440/761/760/759/375px.');
 if(process.env.LAYOUT_METRICS)console.log(JSON.stringify(snapshots,null,2));
}finally{await browser.close();server?.kill();}
