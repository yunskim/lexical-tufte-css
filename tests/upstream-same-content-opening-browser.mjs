import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle} from '../packages/render/dist/index.js';

// First SAME-CONTENT slice of the complete upstream page: opening section.
// Preserve text and anchors, not only counts from unrelated documents.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const source=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const article=doc.querySelector('article');
  const section=article?.querySelector(':scope > section');
  if(!article||!section)throw Error('missing upstream first section');
  const paragraphs=[...section.children];
  if(paragraphs.length===0||paragraphs.some(e=>e.tagName!=='P'))throw Error('upstream first section no longer paragraph-only; update converter explicitly');
  const serialize=n=>{
   if(n.nodeType===Node.TEXT_NODE)return {kind:'text',text:n.textContent};
   if(n.nodeType===Node.ELEMENT_NODE&&n.tagName==='A')return {kind:'link',href:n.getAttribute('href'),text:n.textContent};
   throw Error('unsupported upstream opening-section element: '+n.nodeName);
  };
  return {title:article.querySelector(':scope > h1')?.textContent,subtitle:article.querySelector(':scope > p.subtitle')?.textContent,
   paragraphs:paragraphs.map(p=>[...p.childNodes].map(serialize))};
 },upstream);
 assert.equal(source.paragraphs.length,4,'opening-section inventory changed');
 const text=s=>({type:'text',version:1,detail:0,format:0,mode:'normal',style:'',text:s});
 const base=(type,children)=>({type,version:1,children,direction:null,format:'',indent:0});
 const paragraphs=source.paragraphs.map(parts=>base('paragraph',parts.map(part=>{
  if(part.kind==='text')return text(part.text);
  return {...base('link',[text(part.text)]),url:part.href,rel:null,target:null,title:null};
 })));
 const document={schemaVersion:1,id:'upstream-opening-section',locale:'en-US',title:source.title,subtitle:source.subtitle,assets:[],
  lexicalState:{root:{...base('root',[{...base('tufte-section',paragraphs)}]),textFormat:0,textStyle:''}}};
 const result=renderArticle(document);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const compare=await page.evaluate(({upstream,published})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const original=parse(upstream).querySelector('article > section');
  const actual=parse(published).querySelector('article > section');
  const signature=section=>[...section.children].map(p=>({
   tag:p.tagName.toLowerCase(),
   text:p.textContent.replace(/\s+/g,' ').trim(),
   links:[...p.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.textContent}))
  }));
  return {original:signature(original),actual:signature(actual)};
 },{upstream,published:result.html});
 assert.deepEqual(compare.actual,compare.original,'same-content opening section lost text/link semantics');
 const strictDOM=await page.evaluate(({upstream,published})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const canonical=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {type:'#text',value:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('unexpected DOM node '+node.nodeName);
   return {type:node.tagName.toLowerCase(),
    attrs:[...node.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0])),
    // Ignore source indentation between section blocks; preserve all inline whitespace.
    children:[...node.childNodes].filter(child=>!(node.tagName==='SECTION'&&child.nodeType===Node.TEXT_NODE&&(child.nodeValue??'').trim()==='')).map(canonical)};
  };
  return {
   upstream:canonical(parse(upstream).querySelector('article > section')),
   published:canonical(parse(published).querySelector('article > section'))
  };
 },{upstream,published:result.html});
 assert.deepEqual(strictDOM.published,strictDOM.upstream,'opening DOM must match except section indentation');
 console.log('Same-content upstream opening section: '+compare.actual.length+' paragraphs, text and links preserved.');
}finally{await browser.close();}
