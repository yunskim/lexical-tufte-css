import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle} from '../packages/render/dist/index.js';

// Same-content slice 2: Getting Started (heading, inline code, links, pre/code).
// Strictly reject unknown source constructs rather than silently dropping them.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const source=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const section=doc.querySelectorAll('article > section')[1];
  if(!section)throw Error('missing Getting Started section');
  const inline=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {type:'text',value:node.textContent};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('unexpected inline node: '+node.nodeName);
   if(node.tagName==='CODE')return {type:'code',value:node.textContent};
   if(node.tagName==='A')return {type:'link',href:node.getAttribute('href'),value:node.textContent};
   throw Error('unsupported inline element: '+node.tagName);
  };
  return [...section.children].map(e=>{
   if(e.tagName==='H2')return {type:'heading',text:e.textContent,id:e.id};
   if(e.tagName==='P')return {type:'paragraph',parts:[...e.childNodes].map(inline)};
   if(e.tagName==='PRE'){
    if(e.children.length!==1||e.firstElementChild.tagName!=='CODE')throw Error('unsupported pre structure');
    return {type:'pre',text:e.firstElementChild.textContent};
   }
   throw Error('unsupported Getting Started element: '+e.tagName);
  });
 },upstream);
 assert.deepEqual(source.map(x=>x.type),['heading','paragraph','pre','paragraph']);
 const text=(value,format=0)=>({type:'text',version:1,detail:0,format,mode:'normal',style:'',text:value});
 const base=(type,children)=>({type,version:1,children,direction:null,format:'',indent:0});
 const nodes=source.map(item=>{
  if(item.type==='heading')return {...base('heading',[text(item.text)]),tag:'h2',id:item.id};
  if(item.type==='pre')return {...base('tufte-code',[text(item.text)]),width:'body',language:null};
  return base('paragraph',item.parts.map(part=>{
   if(part.type==='text')return text(part.value);
   if(part.type==='code')return text(part.value,16);
   return {...base('link',[text(part.value)]),url:part.href,rel:null,target:null,title:null};
  }));
 });
 const document={schemaVersion:1,id:'upstream-getting-started',locale:'en-US',title:'Tufte CSS',
  lexicalState:{root:{...base('root',[base('tufte-section',nodes)]),textFormat:0,textStyle:''}}};
 const result=renderArticle(document);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const actual=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const section=doc.querySelector('article > section');
  return [...section.children].map(e=>{
   if(e.tagName==='H2')return {type:'heading',text:e.textContent,id:e.id};
   if(e.tagName==='PRE')return {type:'pre',text:e.querySelector('code')?.textContent};
   if(e.tagName==='P'){
    // Renderer uses tufte-pre-wrap spans around text and formatted code.
    const parts=[];
    for(const node of e.childNodes){
     if(node.nodeType===Node.TEXT_NODE){parts.push({type:'text',value:node.textContent});continue;}
     if(node.nodeType!==Node.ELEMENT_NODE)throw Error('unexpected published node');
     if(node.matches('a'))parts.push({type:'link',href:node.getAttribute('href'),value:node.textContent});
     else if(node.matches('code'))parts.push({type:'code',value:node.textContent});
     else if(node.matches('span.tufte-pre-wrap'))parts.push({type:'text',value:node.textContent});
     else throw Error('unexpected published inline: '+node.tagName);
    }
    return {type:'paragraph',parts};
   }
   throw Error('unexpected published block: '+e.tagName);
  });
 },result.html);
 assert.deepEqual(actual,source,'Getting Started text/inline-code/link/pre semantics changed');
 const strictDOM=await page.evaluate(({upstream,published})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const canonical=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {type:'#text',value:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('unexpected DOM node '+node.nodeName);
   return {type:node.tagName.toLowerCase(),
    attrs:[...node.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0])),
    children:[...node.childNodes].map(canonical)};
  };
  const source=parse(upstream).querySelectorAll('article > section')[1];
  const actual=parse(published).querySelector('article > section');
  return {upstream:canonical(source),published:canonical(actual)};
 },{upstream,published:result.html});
 assert.deepEqual(strictDOM.published,strictDOM.upstream,'Getting Started exact upstream DOM, including heading IDs');
 console.log('Same-content Getting Started section: heading, paragraphs, inline code, links, pre/code preserved.');
}finally{await browser.close();}
