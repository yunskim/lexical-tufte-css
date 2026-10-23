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
 await page.locator('.editor').click();await page.keyboard.press('Control+Home');await page.keyboard.press('Alt+ArrowDown');
 await page.keyboard.insertText('서식 ');
 await page.getByRole('button',{name:'노트 링크 삽입',exact:true}).click();
 await page.getByRole('button',{name:'노트 이미지 삽입',exact:true}).click();
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'여백 주석 삽입',exact:true}).click();
 assert.equal(await page.locator('.editor [data-kind="marginnote"]').count(),1);
 assert.equal(await page.locator('.editor input.margin-toggle').count(),0,'authoring DOM does not contain publication toggles');
 await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
 await page.getByText('JSON과 발행 HTML 검사',{exact:true}).click();
 const before=await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue();
 const html=await page.getByRole('textbox',{name:'발행 HTML',exact:true}).inputValue();
 assert.doesNotMatch(html,/tufte-note-editor|data-lexical-|contenteditable/i,'publication HTML excludes editing-only attributes');
 assert.doesNotMatch(html,/data-tufte-note\b/,'publication does not restore the obsolete note wrapper');
 const structure=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const notes=[...doc.querySelectorAll('input.margin-toggle')];
  return notes.map(input=>{
   const label=input.previousElementSibling,payload=input.nextElementSibling;
   return {label:label?.tagName,input:input.tagName,type:input.type,id:input.id,
    sharedParent:label?.parentElement===input.parentElement&&payload?.parentElement===input.parentElement,
    adjacent:label?.nextElementSibling===input&&input?.nextElementSibling===payload,
    reference:label?.htmlFor===input?.id,checked:input?.checked,kind:payload?.className,
    accessibleName:input?.getAttribute('aria-label'),
    numbered:label?.classList.contains('sidenote-number'),symbol:label?.textContent,
    blockChildren:payload?.querySelectorAll('p,div,section,figure,table').length};
  });
 },html);
 assert.equal(structure.length,2);
 assert.equal(new Set(structure.map(n=>n.id)).size,2,'note toggle IDs are unique');
 for(const n of structure){assert.ok(n.id);assert.equal(n.sharedParent,true);assert.equal(n.label,'LABEL');assert.equal(n.input,'INPUT');assert.equal(n.type,'checkbox');assert.equal(n.adjacent,true);assert.equal(n.reference,true);assert.equal(n.checked,false);assert.equal(n.blockChildren,0);}
 assert.equal(structure[0].kind,'sidenote');assert.equal(structure[0].numbered,true);assert.equal(structure[0].accessibleName,'Toggle sidenote');
 assert.equal(structure[1].kind,'marginnote');assert.equal(structure[1].numbered,false);assert.equal(structure[1].accessibleName,'Toggle margin note');assert.equal(structure[1].symbol,'⊕');
 await page.getByRole('button',{name:'JSON·HTML 확인',exact:true}).click();
 assert.equal(await page.getByRole('textbox',{name:'문서 JSON',exact:true}).inputValue(),before,'export does not mutate canonical JSON');
 const {readFile}=await import('node:fs/promises');const css=await readFile('fixtures/tufte/upstream/tufte.css','utf8');
 await page.setViewportSize({width:375,height:900});
 await page.setContent(`<style>${css}</style><article><section>${html}</section></article>`);
 for(const kind of ['sidenote','marginnote']){
  const payload=page.locator(`span.${kind}`);assert.equal(await payload.evaluate(e=>getComputedStyle(e).display),'none');
  const inputId=await payload.evaluate(e=>e.previousElementSibling.id);
  const label=page.locator(`label[for="${inputId}"]`);await label.click();
  assert.equal(await payload.evaluate(e=>getComputedStyle(e).display),'block','upstream adjacent CSS toggle works');
  await label.click();assert.equal(await payload.evaluate(e=>getComputedStyle(e).display),'none','toggle can close again');
 }
 assert.deepEqual(errors,[]);
 console.log('P1.3 DOM: both note kinds, editing/publication separation, label-input-payload adjacency, JSON immutability and upstream mobile CSS toggles passed.');
}finally{await browser.close();server?.kill();}
