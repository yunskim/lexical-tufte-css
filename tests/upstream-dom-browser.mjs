import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle} from '../packages/render/dist/index.js';

// P2.2.e: real browser DOM parsing, not regex or byte-for-byte HTML matching.
// Upstream: edwardtufte/tufte-css@b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const splitParentReference=readFileSync(new URL('../fixtures/tufte/newthought-sidenote-reference.html',import.meta.url),'utf8');
const fixture=JSON.parse(readFileSync(new URL('../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const result=renderArticle(fixture);
assert.equal(result.ok,true,JSON.stringify(result.diagnostics));

const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const inspect=html=>page.evaluate(source=>{
  const doc=new DOMParser().parseFromString(source,'text/html');
  const article=doc.querySelector('article');
  assertArticle(article);
  function assertArticle(node){if(!node)throw Error('missing article');}
  const sections=[...article.querySelectorAll(':scope > section')];
  const notes=[...article.querySelectorAll('input.margin-toggle')].map(input=>{
   const label=article.querySelector('label[for="'+CSS.escape(input.id)+'"]');
   const payload=input.nextElementSibling;
   return {
    id:input.id,hasLabel:!!label,
    labelFor:label?.htmlFor??null,
    inputClass:input.className,
    labelClass:label?.className??null,
    payloadClass:payload?.className??null,
    adjacent:!!payload&&payload.previousElementSibling===input,
    labelInsideNewthought:!!label?.closest('.newthought'),
    labelIsPreviousSibling:label?.nextElementSibling===input
   };
  });
  return {
   articleChildren:[...article.children].map(e=>e.tagName.toLowerCase()+(e.classList.contains('subtitle')?'.subtitle':'')),
   sections:sections.length,
   sectionOutline:sections.map((section,index)=>({
    index:index+1,
    heading:section.querySelector(':scope > h2, :scope > h3')?.textContent?.trim()??null,
    directChildren:[...section.children].map(child=>child.tagName.toLowerCase()),
    notes:section.querySelectorAll('input.margin-toggle').length,
    figures:section.querySelectorAll('figure').length,
    tables:section.querySelectorAll('table').length
   })),
   sectionFirstChildren:sections.map(s=>s.firstElementChild?.tagName.toLowerCase()),
   epigraphs:article.querySelectorAll('section > .epigraph > blockquote').length,
   fullwidthFigures:article.querySelectorAll('section > figure.fullwidth').length,
   notes
  };
 },html);
 const minimal=await inspect(splitParentReference);
 assert.equal(minimal.sections,1);
 assert.equal(minimal.notes.length,1);
 assert.equal(minimal.notes[0].labelInsideNewthought,true);
 assert.equal(minimal.notes[0].adjacent,true);
 assert.equal(minimal.notes[0].labelIsPreviousSibling,false,'label belongs to newthought, not input parent');
 const original=await inspect(upstream);
 const published=await inspect(result.html);
 assert.ok(original.sections>=3,'upstream sections should be direct article children');
 assert.ok(published.sections>=1,'published sections should be direct article children');
 assert.deepEqual(original.articleChildren.slice(0,2),['h1','p.subtitle']);
 assert.deepEqual(published.articleChildren.slice(0,2),['h1','p.subtitle']);
 assert.ok(original.notes.length>0,'upstream note toggles missing');
 assert.ok(published.notes.length>=2,'published note toggles missing');
 for(const [name,data] of [['upstream',original],['published',published]]){
  for(const note of data.notes){
   assert.ok(note.hasLabel,name+': missing label for '+note.id);
   assert.equal(note.labelFor,note.id,name+': label/input mismatch');
   assert.ok(note.adjacent,name+': input/payload must be adjacent');
   assert.ok(/(?:^| )(?:sidenote|marginnote)(?: |$)/.test(note.payloadClass??''),name+': wrong note payload');
  }
 }
 assert.ok(original.notes.some(n=>n.labelInsideNewthought),'upstream newthought/note combination changed');
 assert.ok(published.notes.every(n=>!n.labelInsideNewthought),'known newthought parity gap needs review');
 console.log('P2.2.e DOM comparison:',JSON.stringify({
  upstream:{sections:original.sections,notes:original.notes.length,epigraphs:original.epigraphs,fullwidthFigures:original.fullwidthFigures},
  published:{sections:published.sections,notes:published.notes.length,epigraphs:published.epigraphs,fullwidthFigures:published.fullwidthFigures},
  knownGap:'newthought > sidenote label',
  upstreamSectionOutline:original.sectionOutline,
  publishedFixtureSectionOutline:published.sectionOutline,
  comparisonScope:'upstream page vs independent server-document fixture; not same-content parity'
 }));
}finally{await browser.close();}
