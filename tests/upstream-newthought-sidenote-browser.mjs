import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle} from '../packages/render/dist/index.js';

const reference=readFileSync(new URL('../fixtures/tufte/newthought-sidenote-reference.html',import.meta.url),'utf8');
const base=(type,children,extra={})=>({type,version:1,children,direction:null,format:'',indent:0,...extra});
const text=(value,format=0)=>({type:'text',version:1,text:value,format,detail:0,mode:'normal',style:''});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const source=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const p=doc.querySelector('article > section > p');
  if(!p)throw Error('missing upstream reference paragraph');
  const span=p.querySelector(':scope > span.newthought');
  const label=span?.querySelector(':scope > label');
  const input=span?.nextElementSibling;
  const payload=input?.nextElementSibling;
  if(!span||!label||!input?.matches('input.margin-toggle[type="checkbox"]')||!payload?.matches('span.sidenote'))throw Error('upstream note structure changed');
  const anchor=payload.querySelector('a');
  const emphasis=anchor?.querySelector('em');
  if(!anchor||!emphasis||anchor.childNodes.length!==1||payload.childNodes.length!==1)throw Error('unsupported reference note payload');
  return {prefix:span.firstChild?.nodeValue,labelFor:label.getAttribute('for'),
   suffix:payload.nextSibling?.nodeValue,href:anchor.getAttribute('href'),emphasis:emphasis.textContent,
   original:html};
 },reference);
 const note=base('tufte-sidenote',[base('link',[text(source.emphasis,2)],{url:source.href,rel:null,target:null,title:null})],{noteId:source.labelFor});
 const span=base('tufte-span',[text(source.prefix)],{kind:'newthought'});
 const document={schemaVersion:1,id:'reference',locale:'en-US',title:'Tufte CSS',assets:[],
  lexicalState:{root:{...base('root',[base('tufte-section',[base('paragraph',[span,note,text(source.suffix)])])]),textFormat:0,textStyle:''}}};
 const result=renderArticle(document);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const dom=await page.evaluate(({original,published})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const canonical=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {tag:'#text',text:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('unexpected DOM node');
   return {tag:node.tagName.toLowerCase(),
    attrs:[...node.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0])),
    children:[...node.childNodes].map(canonical)};
  };
  return {original:canonical(parse(original).querySelector('article > section > p')),
   published:canonical(parse(published).querySelector('article > section > p'))};
 },{original:reference,published:result.html});
 // The renderer namespaces note IDs; compare only after replacing the two
 // generated IDs with the original fixture ID. All DOM nodes remain untouched.
 const publishedId=dom.published.children[1].attrs.find(a=>a[0]==='id')?.[1];
 assert.ok(publishedId?.endsWith(source.labelFor));
 const restoreIds=node=>{
  if(node.tag!=='#text')for(const attr of node.attrs){
   if((attr[0]==='id'||attr[0]==='for')&&attr[1]===publishedId)attr[1]=source.labelFor;
  }
  for(const child of node.children??[])restoreIds(child);
 };
 restoreIds(dom.published);
 assert.deepEqual(dom.published,dom.original,'upstream newthought note DOM must match exactly except documented ID namespace');
 console.log('Newthought/sidenote split-parent DOM matches upstream reference.');
}finally{await browser.close();}
