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
 const page=await browser.newPage({viewport:{width:Number(process.env.DEFINITION_VIEWPORT_WIDTH||1440),height:1000}});page.setDefaultTimeout(6000);
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
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await snapshot(),original,'One Undo restores definition order');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.deepEqual(await snapshot(),moved,'Redo restores definition order');
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
 await editor.locator('section dl dt').first().click();await action('정의목록 전체 삭제').click();
 const removed=await snapshot();assert.equal(findList(removed),undefined);
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.deepEqual(await snapshot(),remaining,'Undo restores whole definition list');
 await page.getByRole('button',{name:'다시 실행',exact:true}).click();assert.deepEqual(await snapshot(),removed,'Redo deletes whole list');
 // Canonical multi-term + note fixture through the actual DOM editor exporter.
 const sample=structuredClone(remaining),dl=findList(sample);
 const text=s=>({type:'text',version:1,text:s,format:0,detail:0,mode:'normal',style:''});
 const term=s=>({...structuredClone(dl.children[0]),children:[text(s)]});
 const description=s=>({...structuredClone(dl.children[1]),children:[{...structuredClone(dl.children[1].children[0]),children:[text(s)]}]});
 const findNote=node=>['tufte-sidenote','tufte-marginnote'].includes(node.type)?node:node.children?.map(findNote).find(Boolean);
 const note=structuredClone(findNote(sample.root));assert.ok(note);note.noteId='definition-roundtrip-note';note.children=[text('Definition annotation')];
 const firstDescription=description('Description A');firstDescription.children[0].children.push(note);
 dl.children=[term('Term A'),term('Alias A'),firstDescription,term('Term B'),description('Description B')];
 const input={schemaVersion:1,id:'definition-roundtrip',locale:'ko-KR',title:'정의목록',assets:[],lexicalState:sample};
 const path='/@fs'+new URL('../packages/lexical/test/publication-browser-harness.mjs',import.meta.url).pathname;
 const result=await page.evaluate(async({path,input})=>{
  const {mountPublicationHarness}=await import(path);
  const first=mountPublicationHarness(input);await new Promise(requestAnimationFrame);const a=first.snapshot();first.dispose();
  const second=mountPublicationHarness(JSON.parse(JSON.stringify(a.document)));await new Promise(requestAnimationFrame);const b=second.snapshot();second.dispose();return {a,b};
 },{path,input});
 assert.deepEqual(result.b.document,result.a.document,'Definition canonical JSON survives DOM reopen');
 const semantic=html=>page.evaluate(html=>{
  const dom=new DOMParser().parseFromString(html,'text/html');
  return [...dom.querySelectorAll('dl > dt,dl > dd')].map(node=>{node.querySelectorAll('label,input').forEach(n=>n.remove());return [node.tagName,node.textContent.replace(/\s+/g,' ').trim()];});
 },html);
 const pure=renderArticle(result.a.document);assert.equal(pure.ok,true,JSON.stringify(pure.diagnostics));
 const expected=[['DT','Term A'],['DT','Alias A'],['DD','Description ADefinition annotation'],['DT','Term B'],['DD','Description B']];
 assert.deepEqual(await semantic(result.a.html),expected);assert.deepEqual(await semantic(result.b.html),expected);assert.deepEqual(await semantic(pure.html),expected);
 assert.match(JSON.stringify(result.b.document),/definition-roundtrip-note/);
 assert.deepEqual(errors,[]);
 console.log('P2.2.b definition browser: pair move/delete, final-pair rejection, JSON save/reopen, canonical HTML, undo/redo PASS.');
}finally{await browser?.close();server.kill();}
