import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle,validateDocument} from '../packages/render/dist/index.js';

// Pinned upstream section 3: Fundamentals, including semantic blockquote[cite],
// p.sans, split-parent newthought + sidenote, other notes and rich inline links.
// Source constructs are explicit: a new upstream element/attribute fails rather
// than silently disappearing from the recreated Lexical document.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const text=(value,format=0)=>({
 type:'text',version:1,detail:0,format,mode:'normal',style:'',text:value
});
const element=(type,children,extra={})=>({
 type,version:1,children,direction:null,format:'',indent:0,...extra
});
const paragraph=(children,extra={})=>element('paragraph',children,{
 textFormat:0,textStyle:'',...extra
});
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});

try{
 const page=await browser.newPage();
 const source=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const section=[...doc.querySelectorAll('article > section')][2];
  if(!section)throw Error('Missing pinned Fundamentals section');
  const attrs=(node,expected)=>{
   const current=[...node.attributes].map(a=>a.name).sort();
   if(current.join(',')!==expected.slice().sort().join(','))
    throw Error('Unexpected '+node.tagName+' attrs: '+current.join(','));
  };
  function note(label,input,payload){
   if(!label||label.tagName!=='LABEL'||!input||input.tagName!=='INPUT'||
    !payload||payload.tagName!=='SPAN')
    throw Error('Note controls require label/input/span');
   attrs(label,['for','class']);attrs(input,['id','type','class']);
   attrs(payload,['class']);
   const noteType=payload.className==='sidenote'?'sidenote':
    payload.className==='marginnote'?'marginnote':null;
   if(!noteType)throw Error('Unsupported note class');
   if(label.className!==(noteType==='sidenote'?'margin-toggle sidenote-number':'margin-toggle')||
    label.textContent!==(noteType==='sidenote'?'':'⊕')||
    input.id!==label.htmlFor||!input.id||input.type!=='checkbox'||
    input.className!=='margin-toggle')
    throw Error('Malformed upstream note controls');
   return {kind:'note',noteType,id:input.id,parts:inline([...payload.childNodes],false)};
  }
  function inline(nodes,allowNotes=true){
   const parts=[];
   for(let i=0;i<nodes.length;i++){
    const node=nodes[i];
    if(node.nodeType===Node.TEXT_NODE){
     parts.push({kind:'text',value:node.nodeValue});continue;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)throw Error('Unsupported inline node '+node.nodeName);
    if(['CODE','EM'].includes(node.tagName)){
     attrs(node,[]);
     if(node.childNodes.length!==1||node.firstChild.nodeType!==Node.TEXT_NODE)
      throw Error('Unsupported nested '+node.tagName);
     parts.push({kind:node.tagName.toLowerCase(),value:node.textContent});continue;
    }
    if(node.tagName==='A'){
     attrs(node,['href']);
     parts.push({kind:'link',url:node.getAttribute('href'),parts:inline([...node.childNodes],false)});
     continue;
    }
    if(node.tagName==='SPAN'&&node.className==='newthought'){
     if(!allowNotes)throw Error('Nested newthought inside note');
     attrs(node,['class']);
     if(node.childNodes.length!==2||node.firstChild.nodeType!==Node.TEXT_NODE||
      node.lastElementChild?.tagName!=='LABEL')
      throw Error('Pinned newthought/label pairing changed');
     const input=nodes[i+1],payload=nodes[i+2];
     const noteResult=note(node.lastElementChild,input,payload);
     if(noteResult.noteType!=='sidenote')throw Error('Newthought can pair only with sidenote');
     parts.push({kind:'newthought',value:node.firstChild.nodeValue},noteResult);
     i+=2;continue;
    }
    if(node.tagName==='LABEL'&&allowNotes){
     parts.push(note(node,nodes[i+1],nodes[i+2]));i+=2;continue;
    }
    throw Error('Unrecognized inline markup: '+node.outerHTML.slice(0,140));
   }
   return parts;
  }
  attrs(section,[]);
  const contents=[...section.childNodes].filter(node=>{
   if(node.nodeType===Node.TEXT_NODE&&(node.nodeValue??'').trim()==='')return false;
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('Unexpected section child');
   return true;
  });
  const blocks=contents.map(node=>{
   if(node.tagName==='H2'||node.tagName==='H3'){
    attrs(node,['id']);
    if(node.childNodes.length!==1||node.firstChild.nodeType!==Node.TEXT_NODE)
     throw Error('Unsupported heading');
    return {kind:'heading',tag:node.tagName.toLowerCase(),
     id:node.id,value:node.textContent};
   }
   if(node.tagName==='P'){
    attrs(node,node.className==='sans'?['class']:[]);
    if(node.hasAttribute('class')&&node.className!=='sans')
     throw Error('Unsupported paragraph class');
    return {kind:'paragraph',tufteClass:node.className||undefined,
     parts:inline([...node.childNodes])};
   }
   if(node.tagName==='BLOCKQUOTE'){
    attrs(node,['cite']);
    if(!node.getAttribute('cite'))throw Error('Expected original cite');
    const blocks=[...node.childNodes].filter(child=>{
     if(child.nodeType===Node.TEXT_NODE&&(child.nodeValue??'').trim()==='')return false;
     if(child.nodeType!==Node.ELEMENT_NODE)throw Error('Unexpected quote child');
     return true;
    }).map(child=>{
     if(child.tagName==='P'){
      attrs(child,[]);
      return {kind:'paragraph',parts:inline([...child.childNodes])};
     }
     if(child.tagName==='FOOTER'){
      attrs(child,[]);
      return {kind:'footer',parts:inline([...child.childNodes])};
     }
     throw Error('Unsupported blockquote child '+child.tagName);
    });
    return {kind:'quote',cite:node.getAttribute('cite'),blocks};
   }
   throw Error('Unrecognized upstream Fundamentals block: '+node.tagName);
  });
  return {blocks};
 },upstream);
 assert.equal(source.blocks.length,14,'The pinned Fundamentals section has 14 direct blocks');
 assert.deepEqual(source.blocks.map(b=>b.kind).filter(k=>k==='quote'),['quote']);
 assert.deepEqual(source.blocks.filter(b=>b.tufteClass).map(b=>b.tufteClass),['sans']);
 const sourceNotes=source.blocks.flatMap(b=>b.kind==='paragraph'
  ?b.parts.filter(p=>p.kind==='note'):[]);
 assert.deepEqual(sourceNotes.map(n=>[n.noteType,n.id]),[
  ['sidenote','sn-in-his-later-books'],
  ['sidenote','sn-proprietary-monotype-bembo'],
  ['marginnote','mn-blue-links']
 ],'Three original sidenotes/marginnote must survive');
 const mapInline=part=>{
  if(part.kind==='text')return text(part.value);
  if(part.kind==='code')return text(part.value,16);
  if(part.kind==='em')return text(part.value,2);
  if(part.kind==='link')return element('link',part.parts.map(mapInline),{
   url:part.url,rel:null,target:null,title:null
  });
  if(part.kind==='newthought')
   return element('tufte-span',[text(part.value)],{kind:'newthought'});
  if(part.kind==='note')return element(
   part.noteType==='sidenote'?'tufte-sidenote':'tufte-marginnote',
   part.parts.map(mapInline),{noteId:part.id}
  );
  throw Error('Unknown inline source kind '+part.kind);
 };
 const mapBlock=b=>{
  if(b.kind==='heading')return element('heading',[text(b.value)],{tag:b.tag,id:b.id});
  if(b.kind==='paragraph')return paragraph(b.parts.map(mapInline),
   b.tufteClass?{tufteClass:b.tufteClass}:{});
  if(b.kind==='footer')return element('tufte-attribution',b.parts.map(mapInline));
  if(b.kind==='quote')return element('quote',b.blocks.map(mapBlock),{cite:b.cite});
  throw Error('Unknown block source kind '+b.kind);
 };
 const document={
  schemaVersion:1,id:'upstream-fundamentals',locale:'en-US',
  title:'Tufte CSS',assets:[],
  lexicalState:{root:{
   ...element('root',[element('tufte-section',source.blocks.map(mapBlock))]),
   textFormat:0,textStyle:''
  }}
 };
 const before=JSON.stringify(document);
 const validated=validateDocument(document);
 assert.equal(validated.ok,true,JSON.stringify(validated.diagnostics));
 const output=renderArticle(document);
 assert.equal(output.ok,true,JSON.stringify(output.diagnostics));
 assert.equal(JSON.stringify(document),before,'Rendering must never rewrite document JSON');
 const matched=await page.evaluate(({upstream,published})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const original=parse(upstream).querySelectorAll('article > section')[2];
  const result=parse(published).querySelector('article > section');
  if(!original||!result)throw Error('Missing source or published section');
  const origNotes=[...original.querySelectorAll('input.margin-toggle')];
  const outputNotes=[...result.querySelectorAll('input.margin-toggle')];
  if(origNotes.length!==3||outputNotes.length!==3)throw Error('Wrong note count');
  for(let i=0;i<origNotes.length;i++){
   // Explicit accessibility-only oracle exception: keep the upstream
   // label/input/span hierarchy while naming the modern focusable checkbox.
   const kind=origNotes[i].nextElementSibling?.classList.contains('sidenote')
    ?'sidenote':'marginnote';
   const accessibleName=kind==='sidenote'?'Toggle sidenote':'Toggle marginnote';
   if(outputNotes[i].getAttribute('aria-label')!==accessibleName)
    throw Error('Missing modern accessible note name');
   origNotes[i].setAttribute('aria-label',accessibleName);
   const from=origNotes[i].id,to=outputNotes[i].id;
   if(!to.endsWith(from)||!to.startsWith('tufte-'))
    throw Error('Generated note ID unexpectedly differs');
   const label=result.querySelector('label[for="'+to+'"]');
   if(!label)throw Error('Missing matching generated note label');
   label.setAttribute('for',from);
   outputNotes[i].id=from;
  }
  const canonical=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {tag:'#text',value:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('Unexpected comparison node');
   return {
    tag:node.tagName.toLowerCase(),
    attrs:[...node.attributes].map(a=>[a.name,a.value])
     .sort((a,b)=>a[0].localeCompare(b[0])),
    // Only the whitespace between structural SECTION/BLOCKQUOTE children
    // belongs to the reference HTML's pretty printer.
    children:[...node.childNodes].filter(child=>
     !(child.nodeType===Node.TEXT_NODE&&(child.nodeValue??'').trim()===''&&
      ['SECTION','BLOCKQUOTE'].includes(node.tagName))).map(canonical)
   };
  };
  return {original:canonical(original),actual:canonical(result)};
 },{upstream,published:output.html});
 assert.deepEqual(matched.actual,matched.original,
  'Fundamentals should preserve p.sans, blockquote cite, source notes, headings and exact inline semantics');
 console.log('Pinned Fundamentals same-content: 14 blocks including quote[cite], p.sans and three real notes, exact DOM except generated note IDs and block indentation.');
}finally{await browser.close();}
