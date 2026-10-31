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
assert.deepEqual(after.value.lexicalState,saved.value.lexicalState,'base fixture canonical JSON must survive reopen');

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
 const makeEnrichedFixture=base=>{
  const document=JSON.parse(JSON.stringify(base));
  document.lexicalState.root.children[0].children.push(
   {type:'list',version:1,listType:'number',tag:'ol',start:3,children:[
    {type:'listitem',version:1,value:3,children:[{type:'text',version:1,text:'Numbered item',format:0,detail:0,mode:'normal',style:''}]}
   ]},
   {type:'quote',version:1,cite:'https://example.org/source',children:[
    {type:'text',version:1,text:'Quoted text',format:0,detail:0,mode:'normal',style:''}
   ]}
  );
  return document;
 };
 const enriched=makeEnrichedFixture(saved.value);
 // Check the constructed fixture before loading it: these are the wire-level
 // fields required by the list/quote regression, not renderer defaults.
 const enrichedList=enriched.lexicalState.root.children[0].children.find(node=>node.type==='list');
 const enrichedQuote=enriched.lexicalState.root.children[0].children.find(node=>node.type==='quote');
 assert.equal(enrichedList?.version,1);
 assert.equal(enrichedList?.listType,'number');
 assert.equal(enrichedList?.tag,'ol');
 assert.equal(enrichedList?.start,3);
 assert.equal(enrichedList?.children?.[0]?.type,'listitem');
 assert.equal(enrichedList?.children?.[0]?.version,1);
 assert.equal(enrichedList?.children?.[0]?.value,3);
 assert.equal(enrichedQuote?.version,1);
 assert.equal(enrichedQuote?.cite,'https://example.org/source');
 assert.equal(enrichedQuote?.children?.[0]?.type,'text','quote children must be inline nodes, not paragraphs');
 for(const textNode of [enrichedList.children[0].children[0],enrichedQuote.children[0]]){
  assert.equal(textNode.version,1);
  assert.equal(textNode.format,0);
  assert.equal(textNode.detail,0);
  assert.equal(textNode.mode,'normal');
  assert.equal(textNode.style,'');
 }

 // Invalid schema must fail closed rather than silently dropping unsupported nodes.
 const invalid=JSON.parse(JSON.stringify(enriched));
 invalid.lexicalState.root.children[0].children.push({type:'future-unsupported-block',version:1,children:[]});
 const guardedEditor=makeEditor();
 const guardedInitial=loadDocumentIntoEditor(guardedEditor,enriched);
 assert.equal(guardedInitial.ok,true,JSON.stringify(guardedInitial.diagnostics));
 const guardedBefore=exportEditorToDocument(guardedEditor,enriched);
 assert.equal(guardedBefore.ok,true,JSON.stringify(guardedBefore.diagnostics));
 const rejectedLoad=loadDocumentIntoEditor(guardedEditor,invalid);
 assert.equal(rejectedLoad.ok,false,'unknown canonical block must be rejected during load');
 const guardedAfter=exportEditorToDocument(guardedEditor,enriched);
 assert.equal(guardedAfter.ok,true,JSON.stringify(guardedAfter.diagnostics));
 assert.deepEqual(guardedAfter.value.lexicalState,guardedBefore.value.lexicalState,'rejected load must not mutate existing editor state');
 const guardedBeforeHTML=renderArticle(guardedBefore.value);
 const guardedAfterHTML=renderArticle(guardedAfter.value);
 assert.equal(guardedBeforeHTML.ok,true,JSON.stringify(guardedBeforeHTML.diagnostics));
 assert.equal(guardedAfterHTML.ok,true,JSON.stringify(guardedAfterHTML.diagnostics));
 assert.equal(guardedAfterHTML.html,guardedBeforeHTML.html,'rejected load must preserve existing publication');
 const rejectedPublication=renderArticle(invalid);
 assert.equal(rejectedPublication.ok,false,'unknown canonical block must be rejected during publication');
 const enrichedEditor=makeEditor();
 const enrichedLoaded=loadDocumentIntoEditor(enrichedEditor,enriched);
 assert.equal(enrichedLoaded.ok,true,JSON.stringify(enrichedLoaded.diagnostics));
 const enrichedSaved=exportEditorToDocument(enrichedEditor,enriched);
 assert.equal(enrichedSaved.ok,true,JSON.stringify(enrichedSaved.diagnostics));
 const enrichedReopened=makeEditor();
 const enrichedReloaded=loadDocumentIntoEditor(enrichedReopened,JSON.parse(JSON.stringify(enrichedSaved.value)));
 assert.equal(enrichedReloaded.ok,true,JSON.stringify(enrichedReloaded.diagnostics));
 const enrichedAfter=exportEditorToDocument(enrichedReopened,enrichedSaved.value);
 assert.equal(enrichedAfter.ok,true,JSON.stringify(enrichedAfter.diagnostics));
 assert.deepEqual(enrichedAfter.value.lexicalState,enrichedSaved.value.lexicalState,'list and quotation canonical state must survive reopen');

 // Assert the first actual Lexical export against the input contract. The
 // reopened export is compared to this complete canonical state above.
 const savedNodes=enrichedSaved.value.lexicalState.root.children[0].children;
 const savedList=savedNodes.find(node=>node.type==='list'&&node.listType==='number');
 const savedQuote=savedNodes.find(node=>node.type==='quote');
 assert.ok(savedList,'Lexical export must retain the ordered list');
 assert.equal(savedList.tag,'ol');
 assert.equal(savedList.start,3);
 assert.equal(savedList.children[0]?.value,3);
 assert.ok(savedQuote,'Lexical export must retain the quotation');
 assert.equal(savedQuote.cite,'https://example.org/source');

 const enrichedPublished=renderArticle(enriched);
 assert.equal(enrichedPublished.ok,true,JSON.stringify(enrichedPublished.diagnostics));
 const enrichedSemantics=await semantics(enrichedPublished.html);
 // The input fixture checks renderer behavior; only saved/reopened results
 // establish that Lexical actually preserved those semantics.
 assert.ok(enrichedSemantics.lists.some(list=>list.tag==='ol'&&list.start==='3'&&list.items.some(item=>item.value==='3'&&item.text.includes('Numbered item'))),'fixture renderer must publish explicit list numbering');
 assert.ok(enrichedSemantics.quotations.some(quote=>quote.cite==='https://example.org/source'&&quote.text.includes('Quoted text')),'fixture renderer must publish quote citation');
 const enrichedSavedHTML=renderArticle(enrichedSaved.value);
 const enrichedAfterHTML=renderArticle(enrichedAfter.value);
 assert.equal(enrichedSavedHTML.ok,true,JSON.stringify(enrichedSavedHTML.diagnostics));
 assert.equal(enrichedAfterHTML.ok,true,JSON.stringify(enrichedAfterHTML.diagnostics));
 const savedDOM=await inspect(enrichedSavedHTML.html);
 const reopenedDOM=await inspect(enrichedAfterHTML.html);
 assert.deepEqual(reopenedDOM,savedDOM,'list and quotation semantic DOM must survive actual Lexical reopen');
 const reopenedSemantics=await semantics(enrichedAfterHTML.html);
 const enrichedStructure=await page.evaluate(source=>{
  const doc=new DOMParser().parseFromString(source,'text/html');
  const article=doc.querySelector('article');
  return {
   lists:[...article.querySelectorAll('ol,ul')].map(list=>({tag:list.localName,items:[...list.children].filter(child=>child.localName==='li').length,other:[...list.children].filter(child=>child.localName!=='li').length})),
   quotes:[...article.querySelectorAll('blockquote')].map(quote=>({text:quote.textContent.trim(),tag:quote.localName}))
  };
 },enrichedAfterHTML.html);
 assert.ok(enrichedStructure.lists.some(list=>list.tag==='ol'&&list.items>0&&list.other===0),'ordered list must contain direct semantic li children');
 assert.ok(enrichedStructure.quotes.some(quote=>quote.tag==='blockquote'&&quote.text.includes('Quoted text')),'quotation must remain a semantic blockquote');

 assert.ok(reopenedSemantics.lists.some(list=>list.tag==='ol'&&list.start==='3'&&list.items.some(item=>item.value==='3'&&item.text.includes('Numbered item'))),'reopened numbered list must preserve explicit item value');
 const savedSemantics=await semantics(enrichedSavedHTML.html);
 assert.deepEqual(reopenedSemantics.lists,savedSemantics.lists,'ordered-list start and item values must survive Lexical save/reopen');
 assert.deepEqual(reopenedSemantics.quotations,savedSemantics.quotations,'quotation citation must survive Lexical save/reopen');
 assert.ok(reopenedSemantics.quotations.some(quote=>quote.cite==='https://example.org/source'&&quote.text.includes('Quoted text')),'reopened quotation must publish');


 // Verify keyboard-operable note toggles in the actual published DOM.
 await page.setContent(afterHTML.html);
 const accessibility=await page.evaluate(()=>{
  const article=document.querySelector('article');
  const inputs=[...article.querySelectorAll('input.margin-toggle')];
  const ids=inputs.map(input=>input.id);
  const labels=[...article.querySelectorAll('label')];
  const notes=inputs.map(input=>({
   id:input.id,
   idMatches:[...document.querySelectorAll('[id]')].filter(node=>node.id===input.id).length,
   associated:labels.filter(label=>label.control===input).length,
   payload:input.nextElementSibling?.matches('.sidenote,.marginnote')??false
  }));
  return {ids,notes};
 });
 assert.ok(accessibility.notes.length>0,'accessibility checks require rendered note toggles');
 assert.equal(new Set(accessibility.ids).size,accessibility.ids.length,'note toggle ids must be unique');
 for(const note of accessibility.notes){
  assert.equal(note.idMatches,1,'note id must be unique throughout the document');
  assert.equal(note.associated,1,'HTMLLabelElement.control must resolve to the note input');
  assert.equal(note.payload,true,'note toggle must immediately precede semantic note payload');
 }

 const toggles=page.locator('article input.margin-toggle');
 assert.equal(await toggles.count(),afterSemantics.notes.length,'all canonical notes must render keyboard toggles');
 for(let index=0;index<afterSemantics.notes.length;index++){
  const toggle=toggles.nth(index);
  const id=await toggle.getAttribute('id');
  assert.ok(id,'note toggle needs an id');
  assert.equal(await page.locator('article label').evaluateAll((labels,target)=>labels.filter(label=>label.htmlFor===target).length,id),1,'note toggle needs exactly one associated label');
  assert.equal(await toggle.getAttribute('type'),'checkbox','note toggle must be keyboard-operable checkbox');
  assert.equal(await toggle.isDisabled(),false,'note toggle must not be disabled');
  await toggle.focus();
  await assert.doesNotReject(toggle.evaluate(el=>{
   if(document.activeElement!==el)throw Error('note toggle did not receive focus');
  }),'note toggle must accept keyboard focus');
  const beforeChecked=await toggle.isChecked();
  // Space is activated on keyup for native checkboxes. Keep focus on the
  // same element through both key phases and verify the complete cycle.
  await page.keyboard.down('Space');
  assert.equal(await toggle.evaluate(el=>document.activeElement===el),true,'note toggle must retain focus during keydown');
  await page.keyboard.up('Space');
  assert.equal(await toggle.isChecked(),!beforeChecked,'Space must toggle note visibility control');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  assert.equal(await toggle.isChecked(),beforeChecked,'second Space must restore checkbox state');
 }

 for(const note of afterSemantics.notes){
  assert.equal(note.type,'checkbox','note toggle must remain a checkbox');
  assert.equal(note.labels.length,1,'note toggle must retain one matching label');
  assert.match(note.nextClass??'',/sidenote|marginnote/,'note payload must follow toggle');
 }

}finally{
 await browser.close();
}
