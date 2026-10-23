import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {renderArticle} from '../packages/render/dist/index.js';

// P4.3.a intermediate visual/geometry probe. Two DIFFERENT documents are
// measured with the SAME upstream CSS; this is not full-content pixel parity.
const original=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../fixtures/tufte/upstream/tufte.css',import.meta.url),'utf8');
const fixture=JSON.parse(readFileSync(new URL('../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const rendered=renderArticle(fixture);
assert.equal(rendered.ok,true,JSON.stringify(rendered.diagnostics));
const output=process.env.TUFTE_SCREENSHOT_DIR;
if(output)mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 for(const width of [1440,1024,761,760,759,375]){
  await page.setViewportSize({width,height:1100});
  const results=[];
  for(const [name,markup] of [['upstream',original],['published',rendered.html]]){
   await page.setContent(markup,{waitUntil:'load'});
   await page.addStyleTag({content:css});
   await page.evaluate(()=>document.fonts.ready);
   const metrics=await page.evaluate(()=>{
    const article=document.querySelector('article');
    if(!article)throw Error('missing article');
    const section=article.querySelector(':scope > section');
    if(!section)throw Error('missing section');
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const note=article.querySelector('.sidenote,.marginnote');
    return {
     article:rect(article),section:rect(section),
     firstParagraph:section.querySelector('p')?rect(section.querySelector('p')):null,
     note:note?rect(note):null,
     bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,
     bodyFont:getComputedStyle(article).fontFamily,
     sectionWidthRatio:section.getBoundingClientRect().width/article.getBoundingClientRect().width
    };
   });
   assert.ok(metrics.article.width>0&&metrics.section.width>0,name+' '+width+'px: zero width');
   assert.ok(Number.isFinite(metrics.sectionWidthRatio),name+' '+width+'px: invalid width ratio');
   if(output)await page.screenshot({path:resolve(output,name+'-'+width+'.png'),fullPage:true});
   results.push({name,...metrics});
  }
  const [upstream,published]=results;
  // Shared CSS should preserve article/section geometry for different content.
  // Content-dependent height and note positions are intentionally NOT compared.
  for(const field of ['x','width']){
   assert.ok(Math.abs(upstream.article[field]-published.article[field])<2,width+'px article '+field+' mismatch');
   assert.ok(Math.abs(upstream.section[field]-published.section[field])<2,width+'px section '+field+' mismatch');
  }
  console.log('Tufte geometry '+width+'px: '+JSON.stringify(results));
 }
}finally{await browser.close();}
