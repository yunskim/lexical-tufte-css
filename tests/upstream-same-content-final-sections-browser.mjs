import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle,validateDocument} from '../packages/render/dist/index.js';

// P2 upstream same-content slices 7–9 (zero-based sections 6–8).
// Do not silently omit unsupported source markup or normalize inline whitespace.
// The pinned ImageQuilts section uses ordinary figure > img markup, so use
// tufte-inline-image to preserve the exact HTML; image composition is separate.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});

const text=(value,format=0)=>({
 type:'text',version:1,detail:0,format,mode:'normal',style:'',text:value
});
const element=(type,children,extra={})=>({
 type,version:1,children,direction:null,format:'',indent:0,...extra
});
const paragraph=children=>element('paragraph',children,{textFormat:0,textStyle:''});
function createSection(blocks){
 return element('tufte-section',blocks);
}

try{
 const page=await browser.newPage();
 const source=await page.evaluate(markup=>{
  const doc=new DOMParser().parseFromString(markup,'text/html');
  const sections=[...doc.querySelectorAll('article > section')].slice(6,9);
  if(sections.length!==3)throw Error('Expected the last three pinned upstream sections');
  const supportedTag=(node,expected)=>{
   if(node.nodeType!==Node.ELEMENT_NODE||node.tagName!==expected)
    throw Error('Expected '+expected+', found '+node.nodeName);
  };
  const noExtraAttrs=(node,names)=>{
   for(const attribute of node.attributes){
    if(!names.includes(attribute.name))
     throw Error('Unsupported '+node.tagName+' attribute: '+attribute.name);
   }
  };
  const inline=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {kind:'text',value:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('Unsupported inline node: '+node.nodeName);
   if(node.tagName==='CODE'){
    noExtraAttrs(node,[]);
    if(node.childNodes.length!==1||node.firstChild.nodeType!==Node.TEXT_NODE)
     throw Error('Unsupported nested inline code');
    return {kind:'code',value:node.textContent};
   }
   if(node.tagName==='A'){
    noExtraAttrs(node,['href']);
    if(node.childNodes.length!==1||node.firstChild.nodeType!==Node.TEXT_NODE)
     throw Error('Unsupported nested link');
    return {kind:'link',href:node.getAttribute('href'),value:node.textContent};
   }
   throw Error('Unsupported inline element: '+node.tagName);
  };
  const block=node=>{
   if(node.tagName==='H2'){
    noExtraAttrs(node,['id']);
    if(node.childNodes.length!==1||node.firstChild.nodeType!==Node.TEXT_NODE)
     throw Error('Unsupported heading payload');
    return {kind:'heading',id:node.id,value:node.textContent};
   }
   if(node.tagName==='P'){
    noExtraAttrs(node,[]);
    return {kind:'paragraph',parts:[...node.childNodes].map(inline)};
   }
   if(node.tagName==='PRE'){
    noExtraAttrs(node,[]);
    if(node.childNodes.length!==1)throw Error('Unsupported PRE content');
    const code=node.firstElementChild;
    supportedTag(code,'CODE');noExtraAttrs(code,[]);
    if(code.childNodes.length!==1||code.firstChild.nodeType!==Node.TEXT_NODE)
     throw Error('Unsupported block code content');
    return {kind:'pre',value:code.textContent};
   }
   if(node.tagName==='FIGURE'){
    noExtraAttrs(node,['class']);
    if(node.className!==''&&node.className!=='fullwidth')
     throw Error('Unsupported figure class: '+node.className);
    if(node.childNodes.length!==1)throw Error('Unsupported figure child count');
    const image=node.firstElementChild;
    supportedTag(image,'IMG');noExtraAttrs(image,['src','alt']);
    return {kind:'figure',width:node.className==='fullwidth'?'fullwidth':'body',
     src:image.getAttribute('src'),alt:image.getAttribute('alt')};
   }
   throw Error('Unsupported pinned section block: '+node.tagName);
  };
  return sections.map(section=>{
   noExtraAttrs(section,[]);
   return [...section.children].map(block);
  });
 },upstream);
 assert.deepEqual(source.map(section=>section[0]?.id),['code','imagequilts','epilogue'],
  'Pinned upstream section order changed');
 assert.deepEqual(source.map(section=>section.map(block=>block.kind)),[
  ['heading','paragraph','paragraph','pre'],
  ['heading','paragraph','paragraph','figure','paragraph','figure'],
  ['heading','paragraph']
 ],'Block inventory must be explicit; do not silently skip upstream nodes');

 const toInline=item=>{
  if(item.kind==='text')return text(item.value);
  if(item.kind==='code')return text(item.value,16);
  if(item.kind==='link')return element('link',[text(item.value)],{
   url:item.href,rel:null,target:null,title:null
  });
  throw Error('Unsupported source inline kind: '+item.kind);
 };
 const toBlock=item=>{
  if(item.kind==='heading')return element('heading',[text(item.value)],{tag:'h2',id:item.id});
  if(item.kind==='paragraph')return paragraph(item.parts.map(toInline));
  if(item.kind==='pre')return element('tufte-code',[text(item.value)],{width:'body',language:null});
  if(item.kind==='figure')return element('tufte-figure',[{
   type:'tufte-inline-image',version:1,src:item.src,alt:item.alt
  }],{width:item.width});
  throw Error('Unsupported source block kind: '+item.kind);
 };
 const document={
  schemaVersion:1,id:'upstream-last-three-sections',locale:'en-US',
  title:'Tufte CSS',assets:[],
  lexicalState:{root:{
   ...element('root',source.map(blocks=>createSection(blocks.map(toBlock)))),
   textFormat:0,textStyle:''
  }}
 };
 const valid=validateDocument(document);
 assert.equal(valid.ok,true,JSON.stringify(valid.diagnostics));
 const published=renderArticle(document);
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));

 const comparison=await page.evaluate(({upstream,actual})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const canonical=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {type:'#text',value:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)
    throw Error('Unsupported DOM node in comparison: '+node.nodeName);
   return {
    type:node.tagName.toLowerCase(),
    attrs:[...node.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0])),
    // Ignore only source formatting between SECTION blocks. Inline,
    // code, figure, attribute and text content remain byte-sensitive.
    children:[...node.childNodes]
     .filter(c=>!(node.tagName==='SECTION'&&c.nodeType===Node.TEXT_NODE&&(c.nodeValue??'').trim()===''))
     .map(canonical)
   };
  };
  const sourceSections=[...parse(upstream).querySelectorAll('article > section')].slice(6,9);
  const actualSections=[...parse(actual).querySelectorAll('article > section')];
  return {
   source:sourceSections.map(canonical),
   actual:actualSections.map(canonical)
  };
 },{upstream,actual:published.html});
 assert.equal(comparison.actual.length,3);
 for(let i=0;i<3;i++)
  assert.deepEqual(comparison.actual[i],comparison.source[i],
   'Pinned same-content DOM mismatch for section '+(i+7)+' (Code/ImageQuilts/Epilogue)');
 console.log('Same-content upstream sections 7–9: code, imagequilts and epilogue; strict DOM parity, no omitted nodes or inline whitespace normalization.');
}finally{
 await browser.close();
}
