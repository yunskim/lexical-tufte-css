import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

/** Real React+Lexical controlled API test, not a mocked document serializer. */
const root=process.env.EDITOR_URL??'http://127.0.0.1:5194/';
const url=new URL('controlled.html',root).href;
const server=process.env.EDITOR_URL?null:spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port','5194','--strictPort'
],{cwd:'examples/editor',stdio:'ignore'});
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(url)).ok)break;}catch{}
  if(attempt===99)throw new Error('Controlled React fixture server not ready');
  await delay(100);
 }
 browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--no-sandbox']
 });
 const page=await browser.newPage();
 page.setDefaultTimeout(10_000);
 const runtimeErrors=[];
 page.on('pageerror',error=>runtimeErrors.push(error.message));
 await page.goto(url);
 const first=page.getByRole('textbox',{name:'첫 번째 Tufte 편집기'});
 const second=page.getByRole('textbox',{name:'두 번째 Tufte 편집기'});
 const firstSection=page.getByTestId('first-editor');
 const secondSection=page.getByTestId('second-editor');
 await first.waitFor();await second.waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.editor section').length>=2);
 assert.match(await first.innerText(),/첫 번째 편집기/);
 assert.match(await second.innerText(),/두 번째 편집기/);
 assert.match(await page.getByTestId('first-changes').innerText(),/0회/,
  'Import must not emit an onChange notification');
 assert.match(await page.getByTestId('second-changes').innerText(),/0회/);

 // Edits of one instance must not mutate the other or loop back through value.
 await first.locator('p').first().click();
 await page.keyboard.press('Home');
 await page.keyboard.insertText('고유 변경 ');
 await page.waitForFunction(()=>!document.querySelector('[data-testid="first-changes"]')?.textContent?.includes('0회'));
 assert.match(await first.innerText(),/고유 변경/);
 assert.doesNotMatch(await second.innerText(),/고유 변경/);
 assert.match(await secondSection.getByTestId('second-changes').innerText(),/0회/);
 // A host metadata-only update must not reload Lexical content or clear undo.
 await page.getByRole('button',{name:'첫 번째 제목 수정'}).click();
 assert.match(await firstSection.getByTestId('first-title').innerText(),/갱신된 제목/);
 assert.match(await first.innerText(),/고유 변경/);
 await first.click();
 await page.keyboard.press('Control+z');
 await page.waitForFunction(()=>!document.querySelector('[data-testid="first-editor"] .editor')?.textContent?.includes('고유 변경'));
 await page.keyboard.press('Control+Shift+z');
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] .editor')?.textContent?.includes('고유 변경'));
 const editsBefore=await firstSection.getByTestId('first-changes').innerText();
 await delay(100);
 assert.equal(await firstSection.getByTestId('first-changes').innerText(),editsBefore,
  'Controlled prop echo must not trigger a second change notification');

 // Incoming value replaces the canonical document, including undo baseline.
 await page.getByRole('button',{name:'첫 번째 문서 교체'}).click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] .editor')?.textContent?.includes('외부에서 교체한 문서'));
 assert.doesNotMatch(await first.innerText(),/고유 변경/);
 assert.match(await second.innerText(),/두 번째 편집기/);
 await first.click();
 await page.keyboard.press('Control+z');
 await delay(100);
 assert.match(await first.innerText(),/외부에서 교체한 문서/,
  'Undo must not resurrect the document before an external replacement');

 // readonly hides edit commands, disables the Lexical editable root and preserves state.
 await page.getByRole('button',{name:'첫 번째 읽기 전용 전환'}).click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] .editor')?.getAttribute('contenteditable')==='false');
 assert.equal(await firstSection.locator('.selection-toolbar,.block-context-menu').count(),0);
 const locked=await first.innerText();
 await first.click();
 await page.keyboard.insertText('SHOULD_NOT_INSERT');
 assert.equal(await first.innerText(),locked);
 await page.getByRole('button',{name:'첫 번째 읽기 전용 전환'}).click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="first-editor"] .editor')?.getAttribute('contenteditable')==='true');

 // Unmount/remount rehydrates only that instance; no cross-instance listeners.
 await page.getByRole('button',{name:'두 번째 편집기 마운트 전환'}).click();
 assert.equal(await second.count(),0);
 await first.locator('p').first().click();
 await page.keyboard.insertText(' 수정');
 assert.match(await first.innerText(),/수정/);
 await page.getByRole('button',{name:'두 번째 편집기 마운트 전환'}).click();
 await second.waitFor();
 await page.waitForFunction(()=>document.querySelector('[data-testid="second-editor"] .editor')?.textContent?.includes('두 번째 편집기'));
 assert.doesNotMatch(await second.innerText(),/수정/);
 assert.match(await secondSection.getByTestId('second-changes').innerText(),/0회/);

 await page.getByRole('button',{name:'첫 번째 편집기 마운트 전환'}).click();
 assert.equal(await first.count(),0);
 await page.getByRole('button',{name:'첫 번째 편집기 마운트 전환'}).click();
 await first.waitFor();
 assert.match(await first.innerText(),/외부에서 교체한 문서/);
 assert.match(await first.innerText(),/수정/);
 assert.equal(await page.getByTestId('errors').innerText(),'');
 assert.deepEqual(runtimeErrors,[]);
 console.log('Controlled TufteEditor: two instances, single onChange, external replacement + undo boundary, readonly, remount PASS');
}finally{
 await browser?.close();
 server?.kill();
}
