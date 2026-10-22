/**
 * Browser-only fixture construction from the immutable upstream Tufte CSS demo.
 * Call with page.evaluate(reconstructPinnedArticle,{html,modernFrame,modernCode}).
 * This function is deliberately standalone: no closure state is captured by
 * Playwright, and every unexpected element/attribute aborts reconstruction.
 *
 * This is a verification fixture builder, not an import-any-HTML feature.
 */
export function reconstructPinnedArticle({html,modernFrame,modernCode}){
 const parsed=new DOMParser().parseFromString(html,'text/html');
 const article=parsed.querySelector('body > article');
 if(!article)throw Error('Pinned upstream article was not found');
 const actualAttrs=node=>[...node.attributes].map(a=>a.name).sort();
 const exactAttrs=(node,allowed)=>{
  if(actualAttrs(node).join(',')!==allowed.slice().sort().join(','))
   throw Error('Unexpected '+node.tagName+' attributes: '+actualAttrs(node).join(','));
 };
 exactAttrs(article,[]);
 const title=article.querySelector(':scope > h1');
 const subtitle=article.querySelector(':scope > p.subtitle');
 if(!title||!subtitle||title.id!=='tufte-css'||
  title.textContent!=='Tufte CSS'||subtitle.textContent!=='Dave Liepmann')
  throw Error('Pinned article title/subtitle contract changed');
 exactAttrs(title,['id']);exactAttrs(subtitle,['class']);
 const sections=[...article.children].filter(n=>n.tagName==='SECTION');
 const header=[...article.children].map(n=>n.tagName);
 if(header.length!==11||header[0]!=='H1'||header[1]!=='P'||
  header.slice(2).some(tag=>tag!=='SECTION')||sections.length!==9)
  throw Error('Pinned article top-level order changed');

 const text=(value,format=0)=>({
  type:'text',version:1,detail:0,format,mode:'normal',style:'',text:value
 });
 const element=(type,children,fields={})=>({
  type,version:1,children,direction:null,format:'',indent:0,...fields
 });
 const paragraph=(children,fields={})=>
  element('paragraph',children,{textFormat:0,textStyle:'',...fields});
 const meaningful=node=>[...node.childNodes].filter(child=>
  child.nodeType!==Node.TEXT_NODE||(child.nodeValue??'').trim()!=='');
 const isWhite=node=>node?.nodeType===Node.TEXT_NODE&&
  (node.nodeValue??'').trim()==='';
 const onlyElements=(node,allowed)=>{
  if(meaningful(node).some(child=>child.nodeType!==Node.ELEMENT_NODE))
   throw Error('Unexpected direct text in '+node.tagName);
  const children=[...node.children];
  if(allowed&&children.some(child=>!allowed.includes(child.tagName)))
   throw Error('Unexpected '+node.tagName+' child: '+children.map(n=>n.tagName));
  return children;
 };
 const notes=[];
 const expectedLegacy={
  src:'https://www.youtube.com/embed/YslQ2625TR4',
  width:'853',height:'480',frameborder:'0',allowfullscreen:''
 };
 const sameAttrs=(node,expected)=>{
  const actual=Object.fromEntries([...node.attributes].map(a=>[a.name,a.value]));
  const normalize=obj=>JSON.stringify(Object.entries(obj).sort());
  if(normalize(actual)!==normalize(expected))
   throw Error('Pinned iframe source contract changed');
 };

 function findControl(nodes,start){
  const next=i=>{
   let j=i;
   while(j<nodes.length&&isWhite(nodes[j]))j++;
   return j;
  };
  const inputAt=next(start+1),payloadAt=next(inputAt+1);
  const input=nodes[inputAt],payload=nodes[payloadAt];
  if(!input||input.tagName!=='INPUT'||!payload||payload.tagName!=='SPAN')
   throw Error('Incomplete label/input/note payload trio');
  return {input,payload,end:payloadAt};
 }
 function makeNote(label,input,payload){
  exactAttrs(label,['for','class']);
  exactAttrs(input,['type','id','class']);
  exactAttrs(payload,['class']);
  const kind=label.className==='margin-toggle sidenote-number'
   ?'sidenote':label.className==='margin-toggle'?'marginnote':null;
  if(!kind||input.type!=='checkbox'||input.className!=='margin-toggle'||
   !input.id||input.id!==label.htmlFor||
   payload.className!==kind||label.textContent!==(kind==='sidenote'?'':'⊕'))
   throw Error('Unexpected pinned note controls or structure');
  if(notes.some(n=>n.id===input.id))throw Error('Duplicated note ID '+input.id);
  notes.push({id:input.id,kind});
  return element(kind==='sidenote'?'tufte-sidenote':'tufte-marginnote',
   inline([...payload.childNodes]),{noteId:input.id});
 }

 function inline(children,format=0){
  const output=[];
  for(let i=0;i<children.length;i++){
   const n=children[i];
   if(n.nodeType===Node.TEXT_NODE){
    if(n.nodeValue)output.push(text(n.nodeValue,format));
    continue;
   }
   if(n.nodeType!==Node.ELEMENT_NODE)
    throw Error('Unsupported inline node: '+n.nodeName);
   if(n.tagName==='LABEL'){
    const {input,payload,end}=findControl(children,i);
    output.push(makeNote(n,input,payload));
    i=end;
    continue;
   }
   if(n.tagName==='SPAN'){
    exactAttrs(n,['class']);
    const kind=n.className;
    if(!['newthought','sans','numeral','danger'].includes(kind))
     throw Error('Unsupported pinned inline span '+kind);
    if(kind==='newthought'&&n.lastElementChild?.tagName==='LABEL'){
     if(n.lastChild!==n.lastElementChild)
      throw Error('Newthought label must be the last span child');
     const label=n.lastElementChild;
     const contents=[...n.childNodes].slice(0,-1);
     if(!contents.length)throw Error('Empty newthought anchor');
     const {input,payload,end}=findControl(children,i);
     output.push(element('tufte-span',inline(contents,format),{kind}));
     output.push(makeNote(label,input,payload));
     i=end;
     continue;
    }
    output.push(element('tufte-span',inline([...n.childNodes],format),{kind}));
    continue;
   }
   if(n.tagName==='A'){
    exactAttrs(n,['href']);
    const href=n.getAttribute('href');
    if(!href)throw Error('Pinned link missing URL');
    output.push(element('link',inline([...n.childNodes],format),{
     url:href,rel:null,target:null,title:null
    }));
    continue;
   }
   if(n.tagName==='IMG'){
    exactAttrs(n,['src','alt']);
    output.push({
     type:'tufte-inline-image',version:1,
     src:n.getAttribute('src'),alt:n.getAttribute('alt')
    });
    continue;
   }
   if(n.tagName==='CITE'){
    exactAttrs(n,[]);
    output.push(element('tufte-cite',inline([...n.childNodes],format)));
    continue;
   }
   const marks={
    EM:2,STRONG:1,CODE:16,S:4,U:8,
    SUB:32,SUP:64,MARK:128
   };
   if(Object.hasOwn(marks,n.tagName)){
    exactAttrs(n,[]);
    if([...n.childNodes].some(child=>child.nodeType!==Node.TEXT_NODE))
     throw Error('Nested inline formatting changed '+n.tagName);
    output.push(...inline([...n.childNodes],format|marks[n.tagName]));
    continue;
   }
   throw Error('Unhandled pinned inline DOM: '+n.tagName);
  }
  return output;
 }
 const allowedBlockAttrs=(node,expected)=>exactAttrs(node,expected);
 function quote(node){
  allowedBlockAttrs(node,node.hasAttribute('cite')?['cite']:[]);
  const parts=[];
  for(const child of meaningful(node)){
   if(child.nodeType===Node.TEXT_NODE){
    parts.push(text(child.nodeValue));
    continue;
   }
   if(child.tagName==='P'){
    allowedBlockAttrs(child,[]);
    parts.push(paragraph(inline([...child.childNodes])));
   }else if(child.tagName==='FOOTER'){
    allowedBlockAttrs(child,[]);
    parts.push(element('tufte-attribution',inline([...child.childNodes])));
   }else throw Error('Unsupported blockquote child '+child.tagName);
  }
  return element('quote',parts,node.hasAttribute('cite')
   ?{cite:node.getAttribute('cite')}:{});
 }
 function block(node,sectionIndex){
  if(node.tagName==='H2'||node.tagName==='H3'){
   allowedBlockAttrs(node,['id']);
   if(node.children.length!==0||node.childNodes.length!==1||
    node.firstChild.nodeType!==Node.TEXT_NODE||!node.id)
    throw Error('Unsupported heading source markup');
   return element('heading',[text(node.textContent)],{
    tag:node.tagName.toLowerCase(),id:node.id
   });
  }
  if(node.tagName==='P'){
   allowedBlockAttrs(node,node.hasAttribute('class')?['class']:[]);
   if(node.hasAttribute('class')&&node.className!=='sans')
    throw Error('Unsupported pinned paragraph class '+node.className);
   return paragraph(inline([...node.childNodes]),node.className==='sans'
    ?{tufteClass:'sans'}:{});
  }
  if(node.tagName==='BLOCKQUOTE')return quote(node);
  if(node.tagName==='DIV'){
   allowedBlockAttrs(node,['class']);
   if(node.className!=='epigraph')throw Error('Unsupported pinned div class');
   return element('tufte-epigraph',onlyElements(node,['BLOCKQUOTE']).map(quote));
  }
  if(node.tagName==='PRE'){
   allowedBlockAttrs(node,[]);
   if(node.children.length!==1||node.firstElementChild.tagName!=='CODE'||
    node.childNodes.length!==1)
    throw Error('PRE must have one code child');
   const code=node.firstElementChild;allowedBlockAttrs(code,[]);
   if(code.childNodes.length!==1||code.firstChild.nodeType!==Node.TEXT_NODE)
    throw Error('Pinned pre/code must contain one text node');
   let contents=code.textContent;
   if(sectionIndex===5&&contents.includes('frameborder="0"')){
    const expectedSnippet='<iframe width="853" height="480" src="https://www.youtube.com/embed/YslQ2625TR4" frameborder="0" allowfullscreen></iframe>';
    if(!contents.includes(expectedSnippet))
     throw Error('Unexpected legacy iframe source code snippet');
    contents=modernCode;
   }
   return element('tufte-code',[text(contents)],{
    width:'body',language:null
   });
  }
  if(node.tagName==='FIGURE'){
   allowedBlockAttrs(node,node.hasAttribute('class')?['class']:[]);
   if(node.className==='iframe-wrapper'){
    if(sectionIndex!==5)throw Error('Unexpected iframe outside Figures');
    const frame=onlyElements(node,['IFRAME']);
    if(frame.length!==1)throw Error('Iframe must be a single direct child');
    exactAttrs(frame[0],Object.keys(expectedLegacy));
    sameAttrs(frame[0],expectedLegacy);
    if(meaningful(frame[0]).length!==0)
     throw Error('Unexpected nested iframe fallback content');
    return {
     type:'tufte-embed',version:1,provider:'youtube',
     src:modernFrame.src,title:modernFrame.title,
     wrapper:'figure',width:'body',aspectRatio:16/9
    };
   }
   if(node.className!==''&&node.className!=='fullwidth')
    throw Error('Unsupported source figure class '+node.className);
   const children=[...node.childNodes].filter(child=>!isWhite(child));
   const parts=inline(children);
   if(parts.filter(part=>part.type==='tufte-inline-image').length!==1)
    throw Error('A pinned static figure must have exactly one direct image');
   return element('tufte-figure',parts,{
    width:node.className==='fullwidth'?'fullwidth':'body'
   });
  }
  throw Error('Unsupported pinned section block '+node.tagName);
 }
 const expectedInventory=[
  ['paragraph','paragraph','paragraph','paragraph'],
  ['heading','paragraph','tufte-code','paragraph'],
  ['heading','heading','paragraph','paragraph','quote','paragraph',
   'paragraph','heading','paragraph','paragraph','paragraph','paragraph',
   'paragraph','paragraph'],
  ['heading','tufte-epigraph','paragraph'],
  ['heading','paragraph','paragraph','paragraph','tufte-code','paragraph',
   'paragraph','paragraph','paragraph','paragraph','tufte-code','paragraph'],
  ['heading','paragraph','paragraph','tufte-figure','paragraph','paragraph',
   'tufte-figure','paragraph','tufte-code','tufte-embed','paragraph'],
  ['heading','paragraph','paragraph','tufte-code'],
  ['heading','paragraph','paragraph','tufte-figure','paragraph','tufte-figure'],
  ['heading','paragraph']
 ];
 const parsedSections=sections.map((section,i)=>{
  allowedBlockAttrs(section,[]);
  const converted=onlyElements(section).map(node=>block(node,i));
  const types=converted.map(node=>node.type);
  if(JSON.stringify(types)!==JSON.stringify(expectedInventory[i]))
   throw Error('Pinned block inventory changed in section '+(i+1)+': '+types);
  return element('tufte-section',converted);
 });
 if(notes.length!==7)throw Error('Pinned source note count changed: '+notes.length);
 const headingIds=parsedSections.map(s=>s.children.find(n=>n.type==='heading')?.id??null);
 if(JSON.stringify(headingIds)!==JSON.stringify([
  null,'getting-started','fundamentals','epigraphs','sidenotes',
  'figures','code','imagequilts','epilogue'
 ]))throw Error('Upstream section headings changed');
 const result={
  schemaVersion:1,id:'upstream-complete-demo',
  locale:'en-US',title:title.textContent,subtitle:subtitle.textContent,
  assets:[],
  lexicalState:{root:{
   ...element('root',parsedSections),textFormat:0,textStyle:''
  }}
 };
 return {
  document:result,
  inventory:expectedInventory.map((types,i)=>({section:i+1,types})),
  notes,
  headingIds
 };
}
