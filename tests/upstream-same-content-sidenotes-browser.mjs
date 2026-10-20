import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle,validateDocument} from '../packages/render/dist/index.js';

// Pinned upstream section 5 of 9: Sidenotes: Footnotes and Marginal Notes.
// Reconstruct the original content using concrete Lexical note nodes, not a
// fabricated fixture that merely has the same counts. Unknown markup fails.
// Only source formatting whitespace BETWEEN the three note controls is
// omitted from the canonical DOM, because a single logical note emits all
// three controls. Text before/after the control and inside the note is exact.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../fixtures/tufte/upstream/tufte.css',import.meta.url),'utf8');

const text=(value,format=0)=>({
 type:'text',version:1,detail:0,format,mode:'normal',style:'',text:value
});
const element=(type,children,extra={})=>({
 type,version:1,children,direction:null,format:'',indent:0,...extra
});
const paragraph=parts=>element('paragraph',parts,{textFormat:0,textStyle:''});
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});

try{
 const page=await browser.newPage();
 const source=await page.evaluate(markup=>{
  const section=[...new DOMParser().parseFromString(markup,'text/html')
   .querySelectorAll('article > section')][4];
  if(!section)throw Error('Pinned Sidenotes section missing');
  const attrs=(node,fields)=>{
   const actual=[...node.attributes].map(a=>a.name).sort().join(',');
   if(actual!==fields.slice().sort().join(','))
    throw Error('Unsupported '+node.tagName+' attributes: '+actual);
  };
  const inline=(nodes,allowNotes=true)=>{
   const out=[];
   for(let i=0;i<nodes.length;i++){
    const node=nodes[i];
    if(node.nodeType===Node.TEXT_NODE){
     out.push({kind:'text',value:node.nodeValue});continue;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)
     throw Error('Unsupported inline node: '+node.nodeName);
    if(node.tagName==='LABEL'&&allowNotes){
     attrs(node,['for','class']);
     const sidenote=node.className==='margin-toggle sidenote-number';
     const margin=node.className==='margin-toggle';
     if(!sidenote&&!margin)throw Error('Unsupported note label class');
     const nextControl=()=>{
      i++;
      while(nodes[i]?.nodeType===Node.TEXT_NODE&&
       (nodes[i].nodeValue??'').trim()==='')i++;
      return nodes[i];
     };
     const input=nextControl();
     if(!input||input.nodeType!==Node.ELEMENT_NODE||input.tagName!=='INPUT')
      throw Error('Label is not followed by checkbox');
     attrs(input,['type','id','class']);
     if(input.type!=='checkbox'||input.className!=='margin-toggle'||
      input.id!==node.htmlFor||!input.id)
      throw Error('Broken upstream checkbox/label pairing');
     const payload=nextControl();
     if(!payload||payload.nodeType!==Node.ELEMENT_NODE||payload.tagName!=='SPAN')
      throw Error('Checkbox is not followed by note payload');
     attrs(payload,['class']);
     const kind=sidenote?'sidenote':'marginnote';
     if(payload.className!==kind||node.textContent!==(sidenote?'':'⊕'))
      throw Error('Upstream note kind or label changed');
     out.push({kind:'note',noteType:kind,id:input.id,
      parts:inline([...payload.childNodes],false)});
     continue;
    }
    if(node.tagName==='EM'||node.tagName==='CODE'){
     attrs(node,[]);
     if(node.childNodes.length!==1||node.firstChild.nodeType!==Node.TEXT_NODE)
      throw Error('Unsupported nested '+node.tagName);
     out.push({kind:node.tagName.toLowerCase(),value:node.textContent});
     continue;
    }
    // The reference section has no links or other spans outside note controls.
    throw Error('Unrecognized inline element: '+node.outerHTML.slice(0,120));
   }
   return out;
  };
  attrs(section,[]);
  if([...section.childNodes].some(node=>node.nodeType!==Node.ELEMENT_NODE&&
   (node.nodeType!==Node.TEXT_NODE||(node.nodeValue??'').trim()!=='')))
   throw Error('Unsupported direct section content');
  const blocks=[...section.children].map(node=>{
   if(node.tagName==='H2'){
    attrs(node,['id']);
    if(node.id!=='sidenotes'||node.childNodes.length!==1||
     node.firstChild.nodeType!==Node.TEXT_NODE)
     throw Error('Unsupported Sidenotes heading');
    return {kind:'heading',id:node.id,value:node.textContent};
   }
   if(node.tagName==='P'){
    attrs(node,[]);
    return {kind:'paragraph',parts:inline([...node.childNodes])};
   }
   if(node.tagName==='PRE'){
    attrs(node,[]);
    const children=[...node.childNodes];
    if(children.length!==1||children[0].nodeType!==Node.ELEMENT_NODE||
     children[0].tagName!=='CODE')throw Error('Unsupported PRE contents');
    attrs(children[0],[]);
    if(children[0].childNodes.length!==1||
     children[0].firstChild.nodeType!==Node.TEXT_NODE)
     throw Error('Unsupported pre code payload');
    return {kind:'pre',value:children[0].textContent};
   }
   throw Error('Unsupported Sidenotes section block: '+node.tagName);
  });
  return {blocks,sectionHTML:section.outerHTML};
 },upstream);
 assert.deepEqual(source.blocks.map(block=>block.kind),[
  'heading','paragraph','paragraph','paragraph','pre','paragraph',
  'paragraph','paragraph','paragraph','paragraph','pre','paragraph'
 ],'All twelve upstream blocks are required');
 const sourceNotes=source.blocks.flatMap(block=>block.kind==='paragraph'
  ?block.parts.filter(part=>part.kind==='note'):[]);
 assert.deepEqual(sourceNotes.map(n=>[n.noteType,n.id]),[
  ['sidenote','sn-extensive-use-of-sidenotes'],
  ['marginnote','mn-demo']
 ],'Original note identities and order must be preserved');
 const toInline=part=>{
  if(part.kind==='text')return text(part.value);
  if(part.kind==='em')return text(part.value,2);
  if(part.kind==='code')return text(part.value,16);
  if(part.kind==='note')return element(
   part.noteType==='sidenote'?'tufte-sidenote':'tufte-marginnote',
   part.parts.map(toInline),{noteId:part.id}
  );
  throw Error('Unsupported semantic inline part: '+part.kind);
 };
 const toBlock=block=>{
  if(block.kind==='heading')return element('heading',[text(block.value)],{
   tag:'h2',id:block.id
  });
  if(block.kind==='paragraph')return paragraph(block.parts.map(toInline));
  if(block.kind==='pre')return element('tufte-code',[text(block.value)],{
   width:'body',language:null
  });
  throw Error('Unsupported semantic block: '+block.kind);
 };
 const document={
  schemaVersion:1,id:'upstream-sidenotes',locale:'en-US',
  title:'Tufte CSS',assets:[],
  lexicalState:{root:{
   ...element('root',[element('tufte-section',source.blocks.map(toBlock))]),
   textFormat:0,textStyle:''
  }}
 };
 const before=JSON.stringify(document);
 const validation=validateDocument(document);
 assert.equal(validation.ok,true,JSON.stringify(validation.diagnostics));
 const result=renderArticle(document);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.equal(JSON.stringify(document),before,'Publishing must not mutate source JSON');

 const comparison=await page.evaluate(({original,published})=>{
  const parse=markup=>{
   const doc=new DOMParser().parseFromString(markup,'text/html');
   return doc.querySelector('article > section')??doc.querySelector('section');
  };
  const source=parse(original),actual=parse(published);
  if(!source||!actual)throw Error('Source or published section missing');
  const sourceNotes=[...source.querySelectorAll('input.margin-toggle')];
  const publishedNotes=[...actual.querySelectorAll('input.margin-toggle')];
  if(sourceNotes.length!==2||publishedNotes.length!==2)
   throw Error('Note count changed');
  for(let i=0;i<sourceNotes.length;i++){
   const originalId=sourceNotes[i].id,outputId=publishedNotes[i].id;
   if(!outputId.endsWith(originalId)||outputId===originalId)
    throw Error('Publisher note ID namespace is not preserved');
   const label=actual.querySelector('label[for="'+outputId+'"]');
   if(!label)throw Error('Missing generated label for '+outputId);
   label.setAttribute('for',originalId);
   publishedNotes[i].id=originalId;
  }
  let omittedWhitespace=0;
  const canonical=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {type:'#text',value:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)
    throw Error('Unsupported canonical DOM node: '+node.nodeName);
   const significant=[...node.childNodes].filter(child=>{
    if(child.nodeType!==Node.TEXT_NODE||(child.nodeValue??'').trim()!=='')
     return true;
    if(node.tagName==='SECTION')return false;
    const previous=child.previousSibling,next=child.nextSibling;
    const controlGap=(
     previous?.nodeType===Node.ELEMENT_NODE&&next?.nodeType===Node.ELEMENT_NODE&&
     previous.matches('label.margin-toggle')&&next.matches('input.margin-toggle')
    )||(
     previous?.nodeType===Node.ELEMENT_NODE&&next?.nodeType===Node.ELEMENT_NODE&&
     previous.matches('input.margin-toggle')&&next.matches('span.sidenote,span.marginnote')
    );
    if(controlGap){omittedWhitespace++;return false;}
    return true;
   });
   return {
    type:node.tagName.toLowerCase(),
    attrs:[...node.attributes].map(a=>[a.name,a.value])
     .sort((a,b)=>a[0].localeCompare(b[0])),
    children:significant.map(canonical)
   };
  };
  return {
   source:canonical(source),
   actual:canonical(actual),
   sourceHTML:source.outerHTML,
   publishedHTML:actual.outerHTML,
   omittedControlWhitespace:omittedWhitespace
  };
 },{original:source.sectionHTML,published:result.html});
 assert.equal(comparison.omittedControlWhitespace,2,
  'Only the two source formatting gaps between margin controls should be normalized');
 assert.deepEqual(comparison.actual,comparison.source,
  'Same-content Sidenotes markup differs beyond ID namespace and control formatting whitespace');

 for(const [kind,markup] of [
  ['original',comparison.sourceHTML],['published',comparison.publishedHTML]
 ]){
  for(const width of [375,760,761,1440]){
   await page.setViewportSize({width,height:900});
   await page.setContent('<style>'+css+'</style><article>'+markup+'</article>');
   const inputs=page.locator('input.margin-toggle');
   assert.equal(await inputs.count(),2,kind+': two margin toggles at '+width);
   for(let i=0;i<2;i++){
    const input=inputs.nth(i),id=await input.getAttribute('id');
    const payload=page.locator('input[id="'+id+'"] + span.sidenote, input[id="'+id+'"] + span.marginnote');
    const label=page.locator('label[for="'+id+'"]');
    assert.equal(await payload.count(),1,kind+': CSS adjacent payload');
    if(width<=760){
     assert.equal(await payload.evaluate(e=>getComputedStyle(e).display),'none',
      kind+': mobile payload starts collapsed');
     await label.click();
     assert.equal(await payload.evaluate(e=>getComputedStyle(e).display),'block',
      kind+': mobile label opens note');
     await label.click();
     assert.equal(await payload.evaluate(e=>getComputedStyle(e).display),'none',
      kind+': mobile label closes note');
    }else{
     assert.notEqual(await payload.evaluate(e=>getComputedStyle(e).display),'none',
      kind+': desktop payload is visible');
    }
   }
  }
 }
 console.log('Pinned same-content Sidenotes section: twelve source blocks, exact rich text and code, two note control sets and 375/760/761/1440px responsive toggles; generated IDs and two source-only control whitespace gaps normalized.');
}finally{
 await browser.close();
}
