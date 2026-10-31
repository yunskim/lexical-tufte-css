import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {createHeadlessEditor} from '@lexical/headless';
import {TUFTE_NODES,loadDocumentIntoEditor,exportEditorToDocument} from '../packages/lexical/dist/index.js';
import {renderArticle} from '../packages/render/dist/index.js';

const fixture=JSON.parse(readFileSync(new URL('../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const makeEditor=()=>createHeadlessEditor({namespace:'p22d2-dom',nodes:TUFTE_NODES,onError(error){throw error;}});
const first=makeEditor();
const loaded=loadDocumentIntoEditor(first,fixture);
assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
const saved=exportEditorToDocument(first,fixture);
assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
const reopened=makeEditor();
const reloaded=loadDocumentIntoEditor(reopened,JSON.parse(JSON.stringify(saved.value)));
assert.equal(reloaded.ok,true,JSON.stringify(reloaded.diagnostics));
const after=exportEditorToDocument(reopened,saved.value);
assert.equal(after.ok,true,JSON.stringify(after.diagnostics));
const beforeHTML=renderArticle(saved.value),afterHTML=renderArticle(after.value);
assert.equal(beforeHTML.ok,true,JSON.stringify(beforeHTML.diagnostics));
assert.equal(afterHTML.ok,true,JSON.stringify(afterHTML.diagnostics));

const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const inspect=html=>page.evaluate(source=>{
  const document=new DOMParser().parseFromString(source,'text/html');
  const article=document.querySelector('article');
  if(!article)throw Error('missing article');
  const walk=node=>({
   tag:node.tagName.toLowerCase(),
   attributes:[...node.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0])),
   children:[...node.childNodes].filter(n=>n.nodeType===1||n.nodeType===3&&n.textContent.trim()).map(n=>n.nodeType===3?{text:n.textContent}:walk(n))
  });
  return walk(article);
 },html);
 const a=await inspect(beforeHTML.html),b=await inspect(afterHTML.html);
 assert.deepEqual(b,a,'canonical reopen must preserve semantic DOM tree, attributes and text');
 assert.ok(a.children.length>0,'published article must have semantic children');
}finally{
 await browser.close();
}
