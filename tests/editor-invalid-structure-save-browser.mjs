import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

const url=process.env.EDITOR_URL||'http://127.0.0.1:5174/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174',
 '--strictPort','--config','../../tests/vite-publication.config.mjs'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try {
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(i===99)throw Error('Editor server not ready');
  await setTimeout(100);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage();page.setDefaultTimeout(8000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 const editor=page.locator('.editor');await editor.waitFor();
 await editor.click();await page.keyboard.press('Control+End');
 await page.keyboard.insertText('KNOWN-GOOD-SAVE');
 await page.getByRole('button',{name:'저장',exact:true}).click();
 const original=await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1'));
 assert.ok(original?.includes('KNOWN-GOOD-SAVE'));
 // The structure inspector checks children of sections, figures and table
 // layouts, not arbitrary root children. Create a parseable figure with a
 // caption but no image: this must report INVALID_FIGURE.
 const invalid=JSON.parse(original);
 const section=invalid.root.children.find(child=>child.type==='tufte-section');
 assert.ok(section,'Fixture requires a serialized section');
 section.children.push({
  type:'tufte-figure',version:1,width:'body',
  direction:null,format:'',indent:0,
  children:[{
   type:'tufte-caption',version:1,direction:null,format:'',indent:0,
   children:[{type:'text',version:1,text:'INVALID-STRUCTURE',
    format:0,detail:0,mode:'normal',style:''}]
  }]
 });
 await page.evaluate(value=>localStorage.setItem('lexical-tufte-p1',value),JSON.stringify(invalid));
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 // This test specifically covers invalid *live* structure. A rejected parse
 // is covered by editor-invalid-restore-browser.mjs and is not a pass here.
 const alert=page.getByRole('alert',{name:'문서 구조 복구'});
 await alert.waitFor({state:'visible'});
 assert.match(await alert.innerText(),/그림은 이미지 하나로 시작/);
 assert.match(await editor.innerText(),/INVALID-STRUCTURE/);
 // Restore the canonical bytes in storage without changing the live document.
 await page.evaluate(value=>localStorage.setItem('lexical-tufte-p1',value),original);
 await page.getByRole('button',{name:'저장',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('lexical-tufte-p1')),original,
  'Invalid live structure must not overwrite last valid save');
 const recovery=await page.evaluate(()=>localStorage.getItem('lexical-tufte-recovery-v1'));
 assert.ok(recovery?.includes('INVALID-STRUCTURE'),
  'Invalid live structure must be preserved in recovery storage');
 assert.match(await page.getByRole('status',{name:'편집 작업 상태'}).innerText(),/복구용 사본/);
 assert.deepEqual(errors,[]);
 console.log('Invalid structure save isolation: valid document protected.');
}finally{await browser?.close();server?.kill();}
