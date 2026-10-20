import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle,validateDocument} from '../packages/render/dist/index.js';

// Rebuild the pinned fourth upstream section with the existing quote,
// attribution and cite nodes. Explicitly reject any new unsupported markup.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});
const element=(type,children,extra={})=>({
 type,version:1,children,direction:null,format:'',indent:0,...extra
});
const text=(value,format=0)=>({
 type:'text',version:1,detail:0,format,mode:'normal',style:'',text:value
});
const paragraph=children=>element('paragraph',children,{textFormat:0,textStyle:''});
try{
 const page=await browser.newPage();
 const source=await page.evaluate(markup=>{
  const doc=new DOMParser().parseFromString(markup,'text/html');
  const section=[...doc.querySelectorAll('article > section')][3];
  if(!section)throw Error('Missing upstream Epigraphs section');
  const blocks=[...section.children];
  if(blocks.length!==3||blocks[0].tagName!=='H2'||
   blocks[0].id!=='epigraphs'||!blocks[1].matches('div.epigraph')||
   blocks[2].tagName!=='P')
   throw Error('Pinned Epigraphs block vocabulary changed');

  const attrs=(node,expected)=>{
   const actual=[...node.attributes].map(a=>a.name).sort();
   if(actual.join(',')!==expected.slice().sort().join(','))
    throw Error('Unsupported '+node.tagName+' attrs: '+actual.join(','));
  };
  const inline=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {kind:'text',value:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('Unsupported inline node: '+node.nodeName);
   attrs(node,[]);
   if(!['EM','CODE','CITE'].includes(node.tagName)||
    node.childNodes.length!==1||node.firstChild.nodeType!==Node.TEXT_NODE)
    throw Error('Unsupported inline markup: '+node.tagName);
   return {kind:node.tagName.toLowerCase(),value:node.textContent};
  };
  const children=node=>[...node.childNodes]
   .filter(child=>!(child.nodeType===Node.TEXT_NODE&&(child.nodeValue??'').trim()===''));
  const quote=node=>{
   if(node.tagName!=='BLOCKQUOTE')throw Error('Unsupported epigraph child: '+node.tagName);
   attrs(node,[]);
   const parts=children(node).map(child=>{
    if(child.nodeType===Node.TEXT_NODE)return inline(child);
    if(child.tagName==='P'){
     attrs(child,[]);
     return {kind:'paragraph',parts:[...child.childNodes].map(inline)};
    }
    if(child.tagName==='FOOTER'){
     attrs(child,[]);
     return {kind:'footer',parts:[...child.childNodes].map(inline)};
    }
    throw Error('Unsupported quote block: '+child.tagName);
   });
   if(parts.at(-1)?.kind!=='footer')throw Error('Epigraph quote missing footer');
   return parts;
  };
  attrs(blocks[0],['id']);
  attrs(blocks[1],['class']);
  attrs(blocks[2],[]);
  const quotes=[...blocks[1].children].map(quote);
  if(quotes.length!==3)throw Error('Expected three upstream epigraph quotes');
  return {
   title:blocks[0].textContent,
   id:blocks[0].id,
   quotes,
   trailing:[...blocks[2].childNodes].map(inline)
  };
 },upstream);
 assert.equal(source.quotes.length,3);
 assert.deepEqual(source.quotes.map(parts=>parts[0].kind),
  ['paragraph','paragraph','text'],'Preserve mixed blockquote text/paragraph forms');
 const mapInline=part=>{
  if(part.kind==='text')return text(part.value);
  if(part.kind==='em')return text(part.value,2);
  if(part.kind==='code')return text(part.value,16);
  if(part.kind==='cite')return element('tufte-cite',[text(part.value)]);
  throw Error('Unsupported source inline kind: '+part.kind);
 };
 const quote=parts=>element('quote',parts.map(part=>{
  if(part.kind==='paragraph')return paragraph(part.parts.map(mapInline));
  if(part.kind==='footer')return element('tufte-attribution',part.parts.map(mapInline));
  return mapInline(part);
 }));
 const section=element('tufte-section',[
  element('heading',[text(source.title)],{tag:'h2',id:source.id}),
  element('tufte-epigraph',source.quotes.map(quote)),
  paragraph(source.trailing.map(mapInline))
 ]);
 const document={
  schemaVersion:1,id:'upstream-epigraphs',locale:'en-US',
  title:'Tufte CSS',assets:[],
  lexicalState:{root:{
   ...element('root',[section]),textFormat:0,textStyle:''
  }}
 };
 const valid=validateDocument(document);
 assert.equal(valid.ok,true,JSON.stringify(valid.diagnostics));
 const rendered=renderArticle(document);
 assert.equal(rendered.ok,true,JSON.stringify(rendered.diagnostics));
 const compared=await page.evaluate(({original,published})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const canonical=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {tag:'#text',value:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('Unexpected DOM node: '+node.nodeName);
   return {
    tag:node.tagName.toLowerCase(),
    attrs:[...node.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0])),
    children:[...node.childNodes].filter(child=>{
     if(child.nodeType!==Node.TEXT_NODE||(child.nodeValue??'').trim()!=='')return true;
     // Only ignore source indentation between structural block children,
     // never meaningful direct quote text or inline whitespace.
     return !(node.tagName==='SECTION'||(node.tagName==='DIV'&&node.classList.contains('epigraph'))||
      node.tagName==='BLOCKQUOTE');
    }).map(canonical)
   };
  };
  const originalSection=[...parse(original).querySelectorAll('article > section')][3];
  const actualSection=parse(published).querySelector('article > section');
  return {original:canonical(originalSection),published:canonical(actualSection)};
 },{original:upstream,published:rendered.html});
 assert.deepEqual(compared.published,compared.original,
  'Epigraphs DOM must preserve all three quotations, mixed block syntax, attributions and citations');
 console.log('Same-content upstream Epigraphs: three blockquotes, direct text/paragraphs, footers, cite, em/code. Only structural indentation omitted.');
}finally{
 await browser.close();
}
