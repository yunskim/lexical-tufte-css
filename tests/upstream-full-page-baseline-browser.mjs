import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

// P2.2.e/P4.3.a phase 1: lock the COMPLETE upstream example as the
// reference. This is NOT a same-content Lexical publication parity test.
const html=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../fixtures/tufte/upstream/tufte.css',import.meta.url),'utf8');
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});
try{
 const page=await browser.newPage();
 for(const width of [1440,1024,761,760,759,375]){
  await page.setViewportSize({width,height:1100});
  await page.setContent(html,{waitUntil:'load'});
  await page.addStyleTag({content:css});
  const actual=await page.evaluate(()=>{
   const article=document.querySelector('article');
   if(!article)throw Error('upstream article missing');
   const sections=[...article.querySelectorAll(':scope > section')];
   const notes=[...article.querySelectorAll('input.margin-toggle')];
   const invalidNotes=notes.filter(input=>{
    const label=article.querySelector('label[for="'+CSS.escape(input.id)+'"]');
    const payload=input.nextElementSibling;
    return !label||!payload||!payload.matches('.sidenote,.marginnote');
   });
   const bodyWidth=document.documentElement.scrollWidth;
   const figures=[...article.querySelectorAll('section > figure.fullwidth')];
   return {
    sections:sections.length,
    notes:notes.length,
    epigraphs:article.querySelectorAll('section > .epigraph > blockquote').length,
    fullwidthFigures:figures.length,
    invalidNotes:invalidNotes.length,
    hasNewthoughtNote:!!article.querySelector('.newthought > label.margin-toggle.sidenote-number'),
    sectionHeadings:sections.map(s=>s.querySelector('h2,h3')?.textContent?.trim()??null),
    articleChildren:[...article.children].map(e=>e.tagName.toLowerCase()),
    viewportWidth:innerWidth,
    documentWidth:bodyWidth
   };
  });
  assert.equal(actual.sections,9,width+'px: upstream section inventory changed');
  assert.equal(actual.notes,7,width+'px: upstream note inventory changed');
  assert.equal(actual.epigraphs,3,width+'px: upstream epigraph inventory changed');
  assert.equal(actual.fullwidthFigures,2,width+'px: upstream fullwidth figure inventory changed');
  assert.equal(actual.invalidNotes,0,width+'px: upstream note label/payload mismatch');
  assert.equal(actual.hasNewthoughtNote,true,width+'px: upstream newthought/note nesting changed');
  assert.deepEqual(actual.articleChildren.slice(0,2),['h1','p'],width+'px: article heading changed');
  assert.equal(actual.viewportWidth,width);
  console.log('Upstream full-page reference '+width+'px: '+JSON.stringify(actual));
 }
}finally{await browser.close();}
