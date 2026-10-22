import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {renderArticle,validateDocument} from '../packages/render/dist/index.js';

// Pinned section 6/9. Ordinary content is exact; only the obsolete iframe
// attributes/host and the code snippet explaining them may differ.
// Figure hierarchy, note payload, body text and whitespace are not relaxed.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../fixtures/tufte/upstream/tufte.css',import.meta.url),'utf8');
const modernFrame=Object.freeze({
 src:'https://www.youtube-nocookie.com/embed/YslQ2625TR4',
 title:'YouTube video: Tufte CSS example',
 loading:'lazy',referrerpolicy:'strict-origin-when-cross-origin',
 sandbox:'allow-scripts allow-same-origin allow-presentation',
 width:'960',height:'540',allowfullscreen:''
});
const originalFrame=Object.freeze({
 width:'853',height:'480',src:'https://www.youtube.com/embed/YslQ2625TR4',
 frameborder:'0',allowfullscreen:''
});
const modernCode='<figure class="iframe-wrapper">\n  <iframe src="'+modernFrame.src+
 '" title="'+modernFrame.title+'" loading="'+modernFrame.loading+
 '" referrerpolicy="'+modernFrame.referrerpolicy+'" sandbox="'+modernFrame.sandbox+
 '" width="'+modernFrame.width+'" height="'+modernFrame.height+
 '" allowfullscreen></iframe>\n</figure>';

const text=(value,format=0)=>({
 type:'text',version:1,detail:0,format,mode:'normal',style:'',text:value
});
const element=(type,children,extra={})=>({
 type,version:1,children,direction:null,format:'',indent:0,...extra
});
const paragraph=children=>element('paragraph',children,{textFormat:0,textStyle:''});
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});
try{
 const page=await browser.newPage();
 const source=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const section=[...doc.querySelectorAll('article > section')][5];
  if(!section)throw Error('Pinned Figures section missing');
  const attrs=(node,allowed)=>{
   const have=[...node.attributes].map(x=>x.name).sort().join(',');
   if(have!==allowed.slice().sort().join(','))
    throw Error('Unsupported '+node.tagName+' attributes '+have);
  };
  function note(label,input,payload){
   if(label?.tagName!=='LABEL'||input?.tagName!=='INPUT'||
    payload?.tagName!=='SPAN')throw Error('Incomplete note controls');
   attrs(label,['for','class']);attrs(input,['type','id','class']);
   attrs(payload,['class']);
   if(label.className!=='margin-toggle'||label.textContent!=='⊕'||
    input.type!=='checkbox'||input.className!=='margin-toggle'||
    !input.id||input.id!==label.htmlFor||payload.className!=='marginnote')
    throw Error('Changed note label/input/span contract');
   return {kind:'note',id:input.id,parts:inline([...payload.childNodes],false)};
  }
  function inline(nodes,allowNote=true){
   const out=[];
   for(let i=0;i<nodes.length;i++){
    const n=nodes[i];
    if(n.nodeType===Node.TEXT_NODE){
     out.push({kind:'text',value:n.nodeValue});continue;
    }
    if(n.nodeType!==Node.ELEMENT_NODE)throw Error('Unsupported inline node');
    if(n.tagName==='LABEL'&&allowNote){
     out.push(note(n,nodes[i+1],nodes[i+2]));i+=2;continue;
    }
    if(n.tagName==='CODE'||n.tagName==='EM'){
     attrs(n,[]);
     if(n.childNodes.length!==1||n.firstChild.nodeType!==Node.TEXT_NODE)
      throw Error('Nested '+n.tagName+' not covered');
     out.push({kind:n.tagName.toLowerCase(),value:n.textContent});continue;
    }
    if(n.tagName==='IMG'){
     attrs(n,['src','alt']);
     out.push({kind:'image',src:n.getAttribute('src'),
      alt:n.getAttribute('alt')});continue;
    }
    if(n.tagName==='A'){
     attrs(n,['href']);
     out.push({kind:'link',url:n.getAttribute('href'),
      parts:inline([...n.childNodes],false)});continue;
    }
    throw Error('Unrecognized inline markup '+n.outerHTML.slice(0,130));
   }
   return out;
  }
  attrs(section,[]);
  if([...section.childNodes].some(n=>n.nodeType!==Node.ELEMENT_NODE&&
   (n.nodeType!==Node.TEXT_NODE||(n.nodeValue??'').trim()!=='')))
   throw Error('Unrecognized direct section content');
  const blocks=[...section.children].map(n=>{
   if(n.tagName==='H2'){
    attrs(n,['id']);
    if(n.id!=='figures'||n.childNodes.length!==1||
     n.firstChild.nodeType!==Node.TEXT_NODE)throw Error('Heading changed');
    return {kind:'heading',id:n.id,value:n.textContent};
   }
   if(n.tagName==='P'){
    attrs(n,[]);
    return {kind:'paragraph',parts:inline([...n.childNodes])};
   }
   if(n.tagName==='PRE'){
    attrs(n,[]);
    if(n.childNodes.length!==1||n.firstElementChild?.tagName!=='CODE')
     throw Error('Unexpected PRE content');
    attrs(n.firstElementChild,[]);
    if(n.firstElementChild.childNodes.length!==1||
     n.firstElementChild.firstChild.nodeType!==Node.TEXT_NODE)
     throw Error('Unexpected PRE/CODE children');
    return {kind:'pre',value:n.firstElementChild.textContent};
   }
   if(n.tagName==='FIGURE'){
    if(n.className==='iframe-wrapper'){
     attrs(n,['class']);
     if(n.children.length!==1||n.firstElementChild.tagName!=='IFRAME'||
      [...n.childNodes].some(c=>c.nodeType!==Node.ELEMENT_NODE&&
       (c.nodeType!==Node.TEXT_NODE||(c.nodeValue??'').trim()!=='')))
      throw Error('Iframe must be one direct child of wrapper');
     attrs(n.firstElementChild,['width','height','src','frameborder','allowfullscreen']);
     return {kind:'embed',iframe:Object.fromEntries([...n.firstElementChild.attributes]
      .map(a=>[a.name,a.value]))};
    }
    attrs(n,n.hasAttribute('class')?['class']:[]);
    if(n.hasAttribute('class')&&n.className!=='fullwidth')
     throw Error('Unsupported figure class');
    const children=[...n.childNodes].filter(c=>{
     if(c.nodeType===Node.TEXT_NODE&&(c.nodeValue??'').trim()==='')return false;
     if(c.nodeType!==Node.ELEMENT_NODE)throw Error('Figure text is not formatting');
     return true;
    });
    const parts=inline(children);
    if(parts.filter(p=>p.kind==='image').length!==1)
     throw Error('Expected one direct image in reference figure');
    return {kind:'figure',width:n.className==='fullwidth'?'fullwidth':'body',
     parts};
   }
   throw Error('Unhandled Figures block '+n.tagName);
  });
  return {blocks};
 },upstream);

 assert.deepEqual(source.blocks.map(b=>b.kind),[
  'heading','paragraph','paragraph','figure','paragraph','paragraph',
  'figure','paragraph','pre','embed','paragraph'
 ],'All 11 upstream Figures blocks must survive');
 const notes=source.blocks.flatMap(b=>(b.parts??[]).filter(x=>x.kind==='note'));
 assert.deepEqual(notes.map(n=>n.id),['mn-exports-imports','mn-figure-1']);
 assert.deepEqual(source.blocks.find(b=>b.kind==='embed').iframe,originalFrame,
  'Legacy iframe oracle changed without an explicit decision');
 assert.match(source.blocks.find(b=>b.kind==='pre').value,/frameborder="0"/,
  'Pinned upstream code example was unexpectedly rewritten');

 const toInline=p=>{
  if(p.kind==='text')return text(p.value);
  if(p.kind==='em')return text(p.value,2);
  if(p.kind==='code')return text(p.value,16);
  if(p.kind==='image')return {type:'tufte-inline-image',version:1,src:p.src,alt:p.alt};
  if(p.kind==='link')return element('link',p.parts.map(toInline),{
   url:p.url,rel:null,target:null,title:null
  });
  if(p.kind==='note')return element('tufte-marginnote',
   p.parts.map(toInline),{noteId:p.id});
  throw Error('Unhandled Figures inline kind '+p.kind);
 };
 const toBlock=b=>{
  if(b.kind==='heading')return element('heading',[text(b.value)],{tag:'h2',id:b.id});
  if(b.kind==='paragraph')return paragraph(b.parts.map(toInline));
  if(b.kind==='figure')return element('tufte-figure',b.parts.map(toInline),
   {width:b.width});
  if(b.kind==='pre')return element('tufte-code',[text(modernCode)],
   {width:'body',language:null});
  if(b.kind==='embed')return {type:'tufte-embed',version:1,provider:'youtube',
   src:modernFrame.src,title:modernFrame.title,wrapper:'figure',
   width:'body',aspectRatio:16/9};
  throw Error('Unhandled Figures block '+b.kind);
 };
 const document={
  schemaVersion:1,id:'upstream-figures',locale:'en-US',title:'Tufte CSS',
  assets:[],lexicalState:{root:{
   ...element('root',[element('tufte-section',source.blocks.map(toBlock))]),
   textFormat:0,textStyle:''
  }}
 };
 const before=JSON.stringify(document),valid=validateDocument(document);
 assert.equal(valid.ok,true,JSON.stringify(valid.diagnostics));
 const rendered=renderArticle(document);
 assert.equal(rendered.ok,true,JSON.stringify(rendered.diagnostics));
 assert.equal(JSON.stringify(document),before,'Renderer mutated document JSON');
 assert.doesNotMatch(rendered.html,/<svg|frameborder=|<script/);

 const compared=await page.evaluate(({upstream,published,modernCode,modernFrame,originalFrame})=>{
  const parse=html=>new DOMParser().parseFromString(html,'text/html');
  const original=parse(upstream).querySelectorAll('article > section')[5];
  const output=parse(published).querySelector('article > section');
  if(!original||!output)throw Error('Source or published section missing');
  const attrMap=n=>Object.fromEntries([...n.attributes].map(a=>[a.name,a.value]));
  const same=(a,b)=>JSON.stringify(Object.entries(a).sort())===
   JSON.stringify(Object.entries(b).sort());
  const sourceIframe=original.querySelector('figure.iframe-wrapper > iframe');
  const resultIframe=output.querySelector('figure.iframe-wrapper > iframe');
  if(!sourceIframe||!resultIframe)throw Error('CSS direct-child selector missing');
  if(!same(attrMap(sourceIframe),originalFrame)||
   !same(attrMap(resultIframe),modernFrame))
   throw Error('Unexpected attributes outside explicit iframe modernization contract');
  if(resultIframe.parentElement.children.length!==1||
   resultIframe.querySelector('*')||resultIframe.textContent)
   throw Error('Iframe hierarchy contains extra SVG, wrapper or children');
  const oldCode=original.querySelector('pre > code');
  const newCode=output.querySelector('pre > code');
  if(!oldCode||!newCode||!oldCode.textContent.includes('frameborder="0"')||
   newCode.textContent!==modernCode)
   throw Error('Modernized example must replace only the obsolete code snippet');

  const before=[...original.querySelectorAll('input.margin-toggle')];
  const after=[...output.querySelectorAll('input.margin-toggle')];
  if(before.length!==2||after.length!==2)throw Error('Note count mismatch');
  for(let i=0;i<before.length;i++){
   const oldID=before[i].id,newID=after[i].id;
   if(oldID===newID||!newID.endsWith(oldID))throw Error('Note namespace mismatch');
   const label=output.querySelector('label[for="'+newID+'"]');
   if(!label)throw Error('Missing note label reference');
   after[i].id=oldID;label.setAttribute('for',oldID);
  }
  const canonical=node=>{
   if(node.nodeType===Node.TEXT_NODE)return {tag:'#text',text:node.nodeValue};
   if(node.nodeType!==Node.ELEMENT_NODE)throw Error('Unexpected DOM node');
   return {
    tag:node.tagName.toLowerCase(),
    attrs:Object.entries(attrMap(node)).sort((a,b)=>a[0].localeCompare(b[0])),
    children:[...node.childNodes].filter(child=>
     !(child.nodeType===Node.TEXT_NODE&&(child.nodeValue??'').trim()===''&&
      ['SECTION','FIGURE'].includes(node.tagName))).map(canonical)
   };
  };
  const expected=canonical(original),actual=canonical(output);
  const frame=expected.children.find(x=>x.tag==='figure'&&
   x.attrs.some(a=>a[0]==='class'&&a[1]==='iframe-wrapper'));
  const pre=expected.children.find(x=>x.tag==='pre');
  if(!frame||frame.children.length!==1||frame.children[0].tag!=='iframe'||
   !pre||pre.children.length!==1||pre.children[0].tag!=='code'||
   pre.children[0].children.length!==1)
   throw Error('Reference hierarchy changed; no broad canonicalization');
  frame.children[0].attrs=Object.entries(modernFrame)
   .sort((a,b)=>a[0].localeCompare(b[0]));
  pre.children[0].children[0].text=modernCode;
  return {expected,actual,originalHTML:original.outerHTML,outputHTML:output.outerHTML};
 },{upstream,published:rendered.html,modernCode,modernFrame,originalFrame});
 assert.deepEqual(compared.actual,compared.expected,
  'Figures full DOM differs beyond note IDs and two explicit embed modernization exceptions');

 await page.route(/^https?:\/\//,r=>r.fulfill({
  status:200,contentType:'text/html',body:'<!doctype html><title>offline iframe stub</title>'
 }));
 for(const width of [375,759,760,761,1024,1440]){
  const snapshots=[];
  for(const sectionHTML of [compared.originalHTML,compared.outputHTML]){
   await page.setViewportSize({width,height:900});
   await page.setContent('<!doctype html><style>'+css+
    '</style><article>'+sectionHTML+'</article>');
   snapshots.push(await page.evaluate(()=>{
    const wrapper=document.querySelector('section > figure.iframe-wrapper');
    const frame=wrapper?.querySelector(':scope > iframe');
    if(!wrapper||!frame||wrapper.children.length!==1)
     throw Error('Broken iframe hierarchy in layout test');
    const region=wrapper.getBoundingClientRect();
    const rect=frame.getBoundingClientRect();
    return {
     figure:[region.width,region.height],iframe:[rect.width,rect.height],
     figurePosition:getComputedStyle(wrapper).position,
     iframePosition:getComputedStyle(frame).position
    };
   }));
  }
  const [beforeLayout,afterLayout]=snapshots;
  assert.equal(afterLayout.figurePosition,'relative');
  assert.equal(afterLayout.iframePosition,'absolute');
  for(const part of ['figure','iframe'])
   for(let i=0;i<2;i++)
    assert.ok(Math.abs(beforeLayout[part][i]-afterLayout[part][i])<=1,
     width+'px '+part+' layout changed from pinned Tufte CSS');
 }
 console.log('Figures: 11 complete blocks, two rich notes, strict DOM except modern iframe/code, and 375/759/760/761/1024/1440px iframe CSS geometry parity.');
}finally{await browser.close();}
