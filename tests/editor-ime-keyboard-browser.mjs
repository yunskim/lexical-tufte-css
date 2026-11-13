import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// Browser events emulate the IME event boundary only. They do not simulate
// a real macOS/iOS/Android Korean IME or a screen reader.
const base=process.env.EDITOR_URL??'http://127.0.0.1:5208/';
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5208','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(new URL('host-assets.html',base))).ok)break;}catch{}
  if(attempt===99)throw Error('IME editor fixture server not ready');
  await delay(100);
 }
 browser=await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:990,height:850}});
 const page=await context.newPage();
 page.setDefaultTimeout(10_000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(new URL('host-assets.html',base).href);
 const first=page.getByTestId('host-first'),second=page.getByTestId('host-second');
 const trigger=first.getByRole('button',{name:'호스트 이미지 자산 선택'});
 const dialog=first.getByRole('dialog',{name:'호스트 이미지 자산'});
 const betaInitial=await second.getByTestId('host-second-json').textContent();
 const alphaInitial=await first.getByTestId('host-first-json').textContent();
 await trigger.click();await dialog.waitFor();
 await dialog.getByRole('radio',{name:/alpha-server-note/}).check();
 await dialog.getByRole('radio',{name:/Atlas image/}).check();
 await dialog.getByRole('combobox',{name:'버전'}).selectOption('rev-1');
 const search=dialog.getByRole('searchbox',{name:'외부 이미지 검색'});
 await search.focus();

 const send=async(key,properties={})=>search.evaluate((node,args)=>{
  const event=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:args.key,
   isComposing:args.isComposing??false});
  if(args.keyCode!==undefined)
   Object.defineProperty(event,'keyCode',{configurable:true,value:args.keyCode});
  node.dispatchEvent(event);
 },{key,...properties});
 await send('Escape',{isComposing:true});
 assert.equal(await dialog.count(),1,'Composing Escape must not close external picker');
 await send('Escape',{keyCode:229});
 assert.equal(await dialog.count(),1,'Legacy 229 keycode must not dismiss external picker');
 await send('Process');
 assert.equal(await dialog.count(),1,'Process key must not dismiss external picker');
 await search.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionstart',
  {bubbles:true,data:'한'})));
 await send('Escape');
 assert.equal(await dialog.count(),1,'Escape during an active composition session must not dismiss picker');
 // Composition in an input must also postpone an external asset commit.
 await dialog.getByRole('button',{name:'외부 이미지 연결'}).evaluate(node=>node.click());
 await dialog.getByRole('alert').getByText(/조합 입력 중/).waitFor();
 assert.equal(await page.evaluate(()=>window.__hostAssetHarness.calls.resolve.length),0);
 await search.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionend',
  {bubbles:true,data:'한'})));
 await search.focus();
 await page.keyboard.press('Escape');
 await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(()=>
  document.activeElement?.textContent?.trim()==='호스트 이미지 자산 선택'&&
  document.activeElement?.closest('[data-testid="host-first"]')!==null);
 assert.equal(await first.getByTestId('host-first-json').textContent(),alphaInitial);
 assert.equal(await second.getByTestId('host-second-json').textContent(),betaInitial);

 const controlled=await context.newPage();
 controlled.setDefaultTimeout(10_000);
 controlled.on('pageerror',error=>errors.push(error.message));
 await controlled.goto(new URL('controlled.html',base).href);
 const editor=controlled.getByRole('textbox',{name:'첫 번째 Tufte 편집기'});
 const secondEditor=controlled.getByRole('textbox',{name:'두 번째 Tufte 편집기'});
 await editor.waitFor();await secondEditor.waitFor();
 const triggerNote=controlled.getByRole('button',{name:'첫 번째 노트 이미지 속성'});
 const noteDialog=controlled.getByRole('dialog',{name:'노트 이미지 선택'});
 const read=async(which)=>controlled.getByTestId(which+'-document-json').textContent();
 const beforeSecond=await read('second');

 // A synthetic composition key from the Lexical root must not navigate out
 // of a note. The ordinary Escape after composition should still leave.
 const inNote=()=>controlled.evaluate(()=>{
  const node=window.getSelection()?.anchorNode;
  const element=node instanceof Element?node:node?.parentElement;
  return Boolean(element?.closest('[data-note-id="first-server-note"]'));
 });
 await editor.click();await controlled.keyboard.press('Control+Home');
 await controlled.keyboard.press('Alt+ArrowDown');
 await controlled.waitForFunction(()=>{
  const node=window.getSelection()?.anchorNode;
  const el=node instanceof Element?node:node?.parentElement;
  return Boolean(el?.closest('[data-note-id="first-server-note"]'));
 });
 await editor.evaluate(root=>{
  const event=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,
   key:'Escape',isComposing:true});
  root.dispatchEvent(event);
 });
 assert.equal(await inNote(),true,'Composing Escape must not leave the note');
 await controlled.keyboard.press('Escape');
 assert.equal(await inNote(),false,'Ordinary Escape must still leave the note');
 const afterNoteNavigation=await read('first');

 // The note image presentation dialog has its own composition-aware key guard.
 const note=editor.locator('[data-note-id="first-server-note"] [data-lexical-text="true"]').first();
 await note.click();
 await note.evaluate(element=>{
  const text=element.firstChild;
  if(!text||text.nodeType!==Node.TEXT_NODE)throw Error('Missing note text');
  const range=document.createRange(),selection=window.getSelection();
  range.setStart(text,Math.min(2,text.textContent.length));range.collapse(true);
  selection.removeAllRanges();selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
 });
 await triggerNote.click();
 await noteDialog.waitFor();
 const alt=noteDialog.getByRole('textbox',{name:'대체 텍스트'});
 await alt.focus();
 await alt.evaluate(node=>{
  node.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',isComposing:true,
   bubbles:true,cancelable:true}));
 });
 assert.equal(await noteDialog.count(),1);
 await alt.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionstart',
  {bubbles:true,data:'하'})));
 await alt.evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',
  {key:'Escape',bubbles:true,cancelable:true})));
 assert.equal(await noteDialog.count(),1);
 // A forced form submission while composition is active is a no-op.
 await noteDialog.locator('form').evaluate(form=>form.requestSubmit());
 assert.equal(await noteDialog.count(),1);
 assert.equal(await read('first'),afterNoteNavigation);
 await alt.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionend',
  {bubbles:true,data:'한'})));
 await alt.focus();
 await controlled.keyboard.press('Escape');
 await noteDialog.waitFor({state:'hidden'});
 await controlled.waitForFunction(()=>
  document.activeElement?.textContent?.trim()==='첫 번째 노트 이미지 속성');
 assert.equal(await read('first'),afterNoteNavigation);
 assert.equal(await read('second'),beforeSecond);
 assert.deepEqual(errors,[]);
 console.log('IME keyboard boundaries: composition Escape/229/Process, deferred connect/submit, note navigation and focus restoration PASS.');
}finally{
 await browser?.close();
 server?.kill();
}
