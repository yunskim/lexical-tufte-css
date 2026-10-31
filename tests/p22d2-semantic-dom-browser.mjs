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

 const semantics=html=>page.evaluate(source=>{
  const doc=new DOMParser().parseFromString(source,'text/html');
  const article=doc.querySelector('article');
  if(!article)throw Error('missing article');
  const lists=[...article.querySelectorAll('ol,ul')].map(list=>({
   tag:list.localName,start:list.getAttribute('start'),
   items:[...list.children].filter(child=>child.localName==='li').map(item=>({
    value:item.getAttribute('value'),text:item.textContent.trim()
   }))
  }));
  const quotations=[...article.querySelectorAll('blockquote')].map(node=>({
   cite:node.getAttribute('cite'),text:node.textContent.trim(),
   inEpigraph:!!node.closest('.epigraph')
  }));
  const notes=[...article.querySelectorAll('input.margin-toggle')].map(input=>({
   id:input.id,type:input.getAttribute('type'),
   labels:[...article.querySelectorAll('label')].filter(label=>label.htmlFor===input.id).map(label=>label.className),
   nextClass:input.nextElementSibling?.className??null
  }));
  return {lists,quotations,notes};
 },html);
 // The base fixture contains notes but no lists or quotations. Extend the
 // semantic coverage with independently rendered canonical examples below.
 const countNodes=(node,counts={})=>{
  if(node&&typeof node==='object'){
   if(typeof node.type==='string')counts[node.type]=(counts[node.type]??0)+1;
   if(Array.isArray(node.children))for(const child of node.children)countNodes(child,counts);
  }
  return counts;
 };
 const fixtureCounts=countNodes(saved.value.lexicalState.root);
 assert.ok((fixtureCounts['tufte-sidenote']??0)>0,'fixture must contain a sidenote');
 assert.ok((fixtureCounts['tufte-marginnote']??0)>0,'fixture must contain a marginnote');
 const beforeSemantics=await semantics(beforeHTML.html);
 const afterSemantics=await semantics(afterHTML.html);
 assert.deepEqual(afterSemantics,beforeSemantics,'list numbering, quotations and note associations must survive reopen');

 assert.equal(beforeSemantics.notes.length,(fixtureCounts['tufte-sidenote']??0)+(fixtureCounts['tufte-marginnote']??0),'published note count must match canonical fixture');
 assert.equal(beforeSemantics.lists.length,0,'base fixture intentionally has no lists');
 assert.equal(beforeSemantics.quotations.length,0,'base fixture intentionally has no quotations');
 const enriched=JSON.parse(JSON.stringify(saved.value));
 enriched.lexicalState.root.children[0].children.push(
  {type:'list',version:1,listType:'number',tag:'ol',start:3,children:[
   {type:'listitem',version:1,value:3,children:[{type:'text',version:1,text:'Numbered item',format:0}]}
  ]},
  {type:'quote',version:1,cite:'https://example.org/source',children:[
   {type:'paragraph',version:1,children:[{type:'text',version:1,text:'Quoted text',format:0}]}
  ]}
 );
 const enrichedPublished=renderArticle(enriched);
 assert.equal(enrichedPublished.ok,true,JSON.stringify(enrichedPublished.diagnostics));
 const enrichedSemantics=await semantics(enrichedPublished.html);
 assert.ok(enrichedSemantics.lists.some(list=>list.tag==='ol'&&list.start==='3'&&list.items.some(item=>item.value==='3'&&item.text.includes('Numbered item'))),'numbered list semantics must be present');
 assert.ok(enrichedSemantics.quotations.some(quote=>quote.cite==='https://example.org/source'&&quote.text.includes('Quoted text')),'quotation semantics must be present');

 for(const note of afterSemantics.notes){
  assert.equal(note.type,'checkbox','note toggle must remain a checkbox');
  assert.equal(note.labels.length,1,'note toggle must retain one matching label');
  assert.match(note.nextClass??'',/sidenote|marginnote/,'note payload must follow toggle');
 }

}finally{
 await browser.close();
}
