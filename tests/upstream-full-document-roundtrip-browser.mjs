import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {
 validateDocument,migrateStoredDocument,validateDocumentV2
} from '../packages/document/dist/index.js';
import {renderArticle} from '../packages/render/dist/index.js';
import {
 createHeadlessEditor,TUFTE_NODES,
 loadMigratedDocumentIntoEditor,exportEditorToDocumentV2
} from '../packages/lexical/dist/index.js';
import {reconstructPinnedArticle} from './helpers/pinned-upstream-article.mjs';

// This test covers the *one document* boundary missing from the section
// oracles: 9 source sections -> canonical stored JSON -> real Lexical parser
// -> v2 save -> fresh editor -> pure HTML -> all-section strict DOM. It does
// not claim the standalone official page's obsolete iframe or inaccessible
// checkbox attributes should be shipped unchanged.
const upstream=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const officialCSS=readFileSync(new URL('../fixtures/tufte/upstream/tufte.css',import.meta.url),'utf8');
const scopedCSS=readFileSync(new URL('../packages/render/styles.css',import.meta.url),'utf8');
const modernFrame=Object.freeze({
 src:'https://www.youtube-nocookie.com/embed/YslQ2625TR4',
 title:'YouTube video: Tufte CSS example',
 loading:'lazy',
 referrerpolicy:'strict-origin-when-cross-origin',
 sandbox:'allow-scripts allow-same-origin allow-presentation',
 width:'960',height:'540',allowfullscreen:''
});
const modernCode='<figure class="iframe-wrapper">\n'+
 '  <iframe src="'+modernFrame.src+'" title="'+modernFrame.title+
 '" loading="'+modernFrame.loading+'" referrerpolicy="'+modernFrame.referrerpolicy+
 '" sandbox="'+modernFrame.sandbox+'" width="'+modernFrame.width+
 '" height="'+modernFrame.height+'" allowfullscreen></iframe>\n</figure>';
const originalFrame=Object.freeze({
 src:'https://www.youtube.com/embed/YslQ2625TR4',
 width:'853',height:'480',frameborder:'0',allowfullscreen:''
});
const expectedHeadings=[
 null,'getting-started','fundamentals','epigraphs','sidenotes',
 'figures','code','imagequilts','epilogue'
];
const makeEditor=()=>createHeadlessEditor({
 namespace:'official-upstream-all-nine-sections',
 nodes:TUFTE_NODES,
 onError(error){throw error;}
});
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});
try{
 const page=await browser.newPage();
 const source=await page.evaluate(reconstructPinnedArticle,{
  html:upstream,modernFrame,modernCode
 });
 assert.equal(source.inventory.length,9);
 assert.deepEqual(source.headingIds,expectedHeadings);
 assert.equal(source.notes.length,7);
 assert.equal(source.document.titleId,'tufte-css');
 assert.equal(source.inventory.reduce((sum,section)=>sum+section.types.length,0),60,
  'Pinned full-page section/block inventory changed');
 const input=source.document;
 const inputSnapshot=JSON.stringify(input);
 const checked=validateDocument(input);
 assert.equal(checked.ok,true,JSON.stringify(checked.diagnostics));
 const migrated=migrateStoredDocument(input);
 assert.equal(migrated.ok,true,JSON.stringify(migrated.diagnostics));
 assert.deepEqual(migrated.from,{schemaVersion:1,formatVersion:'legacy-v1'});
 assert.deepEqual(migrated.to,{schemaVersion:2,formatVersion:1});
 assert.equal(validateDocumentV2(migrated.document).ok,true);

 const initialEditor=makeEditor();
 const loaded=loadMigratedDocumentIntoEditor(initialEditor,input);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 assert.deepEqual(initialEditor.getEditorState().toJSON(),input.lexicalState,
  'Lexical must not normalize away any pinned demo node');
 const saved=exportEditorToDocumentV2(initialEditor,loaded.value);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value,migrated.document);
 const onDisk=JSON.parse(JSON.stringify(saved.value));
 assert.deepEqual(onDisk,migrated.document,'Simulated JSON persistence must preserve v2 envelope');
 const reopened=makeEditor();
 const reopenedResult=loadMigratedDocumentIntoEditor(reopened,onDisk);
 assert.equal(reopenedResult.ok,true,JSON.stringify(reopenedResult.diagnostics));
 const roundtrip=exportEditorToDocumentV2(reopened,reopenedResult.value);
 assert.equal(roundtrip.ok,true,JSON.stringify(roundtrip.diagnostics));
 assert.deepEqual(roundtrip.value,onDisk);
 assert.equal(JSON.stringify(input),inputSnapshot,'Roundtrip mutated upstream-derived source');

 const publishV2=value=>{
  const {schemaVersion:_,editorFormat:__,...legacy}=value;
  const result=renderArticle({...legacy,schemaVersion:1});
  assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
  return result.html;
 };
 const published=publishV2(roundtrip.value);
 assert.equal((published.match(/<section>/g)||[]).length,9);
 assert.equal((published.match(/class="iframe-wrapper"/g)||[]).length,1);
 assert.equal((published.match(/aria-label="Toggle /g)||[]).length,7);
 assert.doesNotMatch(published,/<span class="tufte-pre-wrap"|data-tufte-note=|<svg|frameborder=/);

 async function compareWholePage(actualHTML,edited=false){
  return page.evaluate(({originalHTML,publishedHTML,modernFrame,modernCode,
   originalFrame,expectedHeadings,edited})=>{
   const parse=markup=>new DOMParser().parseFromString(markup,'text/html');
   const official=parse(originalHTML).querySelector('body > article');
   const published=parse(publishedHTML).querySelector('body > article');
   if(!official||!published)throw Error('Missing original or published article');
   const attrs=node=>Object.fromEntries([...node.attributes].map(a=>[a.name,a.value]));
   const normalized=obj=>JSON.stringify(Object.entries(obj).sort());
   if(normalized(attrs(official))!=='{}'||
    normalized(attrs(published))!==normalized({
     id:'upstream-complete-demo-article',lang:'en-US',class:'tufte-article'
    }))throw Error('Unexpected original/published article attributes');
   const fromTitle=official.querySelector(':scope > h1');
   const toTitle=published.querySelector(':scope > h1');
   const fromSubtitle=official.querySelector(':scope > p.subtitle');
   const toSubtitle=published.querySelector(':scope > p.subtitle');
   if(!fromTitle||!toTitle||!fromSubtitle||!toSubtitle||
    normalized(attrs(fromTitle))!=='[["id","tufte-css"]]'||
    normalized(attrs(toTitle))!=='[["id","tufte-css"]]'||
    fromTitle.textContent!==toTitle.textContent||
    fromSubtitle.textContent!==toSubtitle.textContent||
    normalized(attrs(fromSubtitle))!==normalized(attrs(toSubtitle)))
    throw Error('Title/subtitle parity changed, including h1#tufte-css');
   const fromSections=[...official.children].filter(n=>n.tagName==='SECTION');
   const toSections=[...published.children].filter(n=>n.tagName==='SECTION');
   if(fromSections.length!==9||toSections.length!==9)
    throw Error('Expected exactly nine original/published sections');
   const sourceHeadings=fromSections.map(s=>s.querySelector('h2')?.id??null);
   const resultHeadings=toSections.map(s=>s.querySelector('h2')?.id??null);
   if(JSON.stringify(sourceHeadings)!==JSON.stringify(expectedHeadings)||
    JSON.stringify(resultHeadings)!==JSON.stringify(expectedHeadings))
    throw Error('Section heading IDs changed during Lexical persistence');

   // The official title ID must survive the versioned Lexical roundtrip.
   const originalInputs=[...official.querySelectorAll('input.margin-toggle')];
   const resultInputs=[...published.querySelectorAll('input.margin-toggle')];
   if(originalInputs.length!==7||resultInputs.length!==7)
    throw Error('Pinned note inventory must be seven');
   for(let i=0;i<originalInputs.length;i++){
    const source=originalInputs[i],target=resultInputs[i];
    const originalId=source.id;
    const expectedId='tufte-22-upstream-complete-demo-'+originalId;
    if(target.id!==expectedId)
     throw Error('Published note namespace changed at '+i);
    const label=official.querySelector('label[for="'+originalId+'"]');
    const outputLabel=published.querySelector('label[for="'+expectedId+'"]');
    if(!label||!outputLabel)throw Error('Missing source or published label '+originalId);
    const kind=source.nextElementSibling?.className;
    if(kind!=='sidenote'&&kind!=='marginnote')throw Error('Unexpected note kind');
    const name=kind==='sidenote'?'Toggle sidenote':'Toggle margin note';
    if(source.hasAttribute('aria-label')||
     target.getAttribute('aria-label')!==name)
     throw Error('Wrong accessibility exception for pinned note '+originalId);
    label.setAttribute('for',expectedId);
    source.id=expectedId;
    source.setAttribute('aria-label',name);
   }

   // Exception 1: modern HTTPS privacy-preserving iframe attributes, but
   // figure.iframe-wrapper > iframe and its sibling ordering are immutable.
   const officialWrapper=official.querySelector('section > figure.iframe-wrapper');
   const modernWrapper=published.querySelector('section > figure.iframe-wrapper');
   const sourceFrame=officialWrapper?.querySelector(':scope > iframe');
   const targetFrame=modernWrapper?.querySelector(':scope > iframe');
   if(!sourceFrame||!targetFrame||
    officialWrapper.children.length!==1||modernWrapper.children.length!==1||
    normalized(attrs(sourceFrame))!==normalized(originalFrame)||
    normalized(attrs(targetFrame))!==normalized(modernFrame)||
    modernWrapper.querySelector('svg,div,span'))
    throw Error('Modern iframe attributes or exact direct-child hierarchy diverged');
   for(const name of sourceFrame.getAttributeNames())sourceFrame.removeAttribute(name);
   for(const [name,value] of Object.entries(modernFrame))
    sourceFrame.setAttribute(name,value);
   // Exception 2: the one source code example teaching obsolete iframe attrs.
   const oldSnippet=officialWrapper.previousElementSibling?.querySelector('code');
   const newSnippet=modernWrapper.previousElementSibling?.querySelector('code');
   if(!oldSnippet||!newSnippet||!oldSnippet.textContent.includes('frameborder="0"')||
    newSnippet.textContent!==modernCode)
    throw Error('Expected exactly one modernized iframe example');
   oldSnippet.textContent=modernCode;

   // Test one intentional stored text edit independently of the immutable
   // pinned-source comparison. No other original content is modified.
   if(edited){
    const first=fromSections[0].querySelector(':scope > p')?.firstChild;
    if(first?.nodeType!==Node.TEXT_NODE||
     !first.nodeValue.startsWith('Tufte CSS provides tools'))
     throw Error('Original first paragraph changed');
    first.nodeValue=first.nodeValue.replace('Tufte CSS provides tools',
     'Tufte CSS provides additional tools');
   }

   const white=node=>node.nodeType===Node.TEXT_NODE&&
    (node.nodeValue??'').trim()==='';
   const structural=node=>node.tagName==='SECTION'||node.tagName==='FIGURE'||
    node.tagName==='BLOCKQUOTE'||(node.tagName==='DIV'&&node.className==='epigraph');
   const canonical=node=>{
    if(node.nodeType===Node.TEXT_NODE)return {tag:'#text',text:node.nodeValue};
    if(node.nodeType!==Node.ELEMENT_NODE)
     throw Error('Unsupported DOM comparison node '+node.nodeName);
    const children=[...node.childNodes];
    return {
     tag:node.tagName.toLowerCase(),
     attrs:Object.entries(attrs(node)).sort((a,b)=>a[0].localeCompare(b[0])),
     children:children.filter((child,i)=>{
      if(!white(child))return true;
      if(structural(node))return false;
      const prev=children[i-1],next=children[i+1];
      if(prev?.nodeType!==Node.ELEMENT_NODE||
       next?.nodeType!==Node.ELEMENT_NODE)return true;
      // Precisely two historic formatting whitespace gaps around the
      // Sidenotes section's margin note controls.
      return !(
       (prev.matches('label.margin-toggle')&&next.matches('input.margin-toggle'))||
       (prev.matches('input.margin-toggle')&&
        next.matches('span.sidenote,span.marginnote'))
      );
     }).map(canonical)
    };
   };
   return {
    expected:fromSections.map(canonical),
    actual:toSections.map(canonical),
    sourceSectionCount:fromSections.length,
    resultSectionCount:toSections.length,
    headingIds:resultHeadings
   };
  },{
   originalHTML:upstream,publishedHTML:actualHTML,modernFrame,modernCode,
   originalFrame,expectedHeadings,edited
  });
 }
 const originalComparison=await compareWholePage(published);
 assert.deepEqual(originalComparison.actual,originalComparison.expected,
  'The *single* saved/reloaded article must match all nine source sections');
 
 // A content edit must retain all nine sections, note IDs and the embed.
 // Editing here starts from versioned JSON; separate UI tests cover actual
 // Lexical keyboard/undo semantics, which this roundtrip does not claim.
 const editedDocument=structuredClone(onDisk);
 const firstText=editedDocument.lexicalState.root.children[0].children[0].children[0];
 assert.equal(firstText.type,'text');
 assert.match(firstText.text,/^Tufte CSS provides tools/);
 firstText.text=firstText.text.replace('Tufte CSS provides tools',
  'Tufte CSS provides additional tools');
 assert.equal(validateDocumentV2(editedDocument).ok,true);
 const editedEditor=makeEditor();
 const editedLoad=loadMigratedDocumentIntoEditor(editedEditor,editedDocument);
 assert.equal(editedLoad.ok,true,JSON.stringify(editedLoad.diagnostics));
 const editedSaved=exportEditorToDocumentV2(editedEditor,editedLoad.value);
 assert.equal(editedSaved.ok,true,JSON.stringify(editedSaved.diagnostics));
 assert.deepEqual(editedSaved.value,editedDocument);
 const editedHTML=publishV2(editedSaved.value);
 const editedComparison=await compareWholePage(editedHTML,true);
 assert.deepEqual(editedComparison.actual,editedComparison.expected,
  'Exactly the one intentional text edit may differ from pinned demo DOM');
 assert.equal(JSON.stringify(onDisk),JSON.stringify(migrated.document),
  'Editing a separate stored copy mutated the original persisted document');

 // Narrow geometry check; image/font pixel parity is deliberately deferred
 // to the external-asset visual test with real locally served sample images.
 await page.route(/^https?:\/\//,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<!doctype html><title>offline embed stub</title>'
 }));
 for(const width of [375,759,760,761,1024,1440]){
  const measures=[];
  for(const markup of [upstream,published]){
   await page.setViewportSize({width,height:900});
   await page.setContent('<!doctype html><style>'+officialCSS+'\n'+
    scopedCSS+'</style>'+markup);
   measures.push(await page.evaluate(()=>{
    const wrapper=document.querySelector('figure.iframe-wrapper');
    const frame=wrapper?.querySelector(':scope > iframe');
    if(!wrapper||!frame||wrapper.children.length!==1)
     throw Error('Pinned iframe wrapper geometry hierarchy disappeared');
    const outer=wrapper.getBoundingClientRect(),inner=frame.getBoundingClientRect();
    return {
     wrapper:[outer.width,outer.height],
     iframe:[inner.width,inner.height],
     wrapperPosition:getComputedStyle(wrapper).position,
     iframePosition:getComputedStyle(frame).position
    };
   }));
  }
  const [oldLayout,newLayout]=measures;
  assert.deepEqual(
   [oldLayout.wrapperPosition,oldLayout.iframePosition],
   ['relative','absolute']
  );
  assert.deepEqual(
   [newLayout.wrapperPosition,newLayout.iframePosition],
   ['relative','absolute']
  );
  for(const target of ['wrapper','iframe']){
   for(let i=0;i<2;i++)
    assert.ok(Math.abs(oldLayout[target][i]-newLayout[target][i])<=1,
     width+'px: '+target+' dimension '+i+' deviates from official CSS');
  }
 }
 console.log('All-nine-section document: pinned DOM/7 notes, safe iframe/code exceptions, v1->v2 strict Lexical persistence/reopen, one isolated edit, and six iframe CSS viewport checks.');
}finally{
 await browser.close();
}
