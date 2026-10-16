import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderArticle,validateDocument} from '../dist/index.js';
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const note=d=>d.lexicalState.root.children[0].children[0].children[1];
test('pure renderer works without browser/editor globals and is deterministic without mutation',()=>{
 assert.equal(typeof document,'undefined');assert.equal(typeof window,'undefined');
 const d=fixture(),before=JSON.stringify(d);const a=renderArticle(d),b=renderArticle(d);
 assert.equal(a.ok,true,JSON.stringify(a.diagnostics));assert.deepEqual(a,b);assert.equal(JSON.stringify(d),before);
 assert.match(a.html,/&lt;script&gt;/);assert.doesNotMatch(a.html,/<script/);assert.match(a.html,/<th scope="col">/);assert.match(a.html,/tufte-14-server-fixture-server-note/);
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));assert.deepEqual(pkg.dependencies,{'@lexical-tufte/document':'workspace:*'});
});
test('unknown node/version and invalid nesting block the whole render with paths',()=>{
 for(const mutate of [d=>note(d).version=2,d=>note(d).children[0].type='future-node',d=>note(d).children.push({type:'paragraph',version:1,children:[]})]){
  const d=fixture();mutate(d);const r=renderArticle(d);assert.equal(r.ok,false);assert.equal(r.html,null);assert.ok(r.diagnostics.some(x=>x.path.includes('children')));
 }
});
test('duplicate and nested note references are rejected',()=>{
 let d=fixture();d.lexicalState.root.children[0].children[1].children[1].noteId='server-note';assert.equal(validateDocument(d).ok,false);
 d=fixture();note(d).children.push(structuredClone(note(d)));const r=renderArticle(d);assert.equal(r.ok,false);assert.ok(r.diagnostics.some(x=>x.code==='NESTED_NOTE'));
});
test('unsafe URLs, arbitrary styles and unsupported table semantics are not silently dropped',()=>{
 for(const mutate of [d=>note(d).children[1].url='javascript:alert(1)',d=>note(d).children[2].src='//evil.test/image',d=>note(d).children[0].style='position:fixed',d=>d.lexicalState.root.children[0].children[4].children[0].children[0].children[0].colSpan=2]){
  const d=fixture();mutate(d);const r=renderArticle(d);assert.equal(r.ok,false);assert.equal(r.html,null);
 }
});
test('cycles and future envelope versions return diagnostics rather than recurse or render',()=>{
 const d=fixture();d.lexicalState.root.children.push(d.lexicalState.root);
 assert.ok(validateDocument(d).diagnostics.some(x=>x.code==='CYCLIC_OR_SHARED_NODE'));
 const v=fixture();v.schemaVersion=2;assert.equal(renderArticle(v).ok,false);
});
test('article namespaces separate note ids, titles and attributes are escaped',()=>{
 const d=fixture();d.title='"><script>alert(1)</script>';d.locale='ko-KR';d.lexicalState.root.children[0].children[0].children[1].children[2].alt='" onerror="alert(1)';
 const a=renderArticle(d,{idPrefix:'first'}),b=renderArticle(d,{idPrefix:'second'});assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert.match(a.html,/tufte-5-first-server-note/);assert.match(b.html,/tufte-6-second-server-note/);assert.match(a.html,/alt="&quot; onerror=&quot;alert\(1\)"/);assert.doesNotMatch(a.html,/<script/);
 assert.equal(renderArticle(d,{idPrefix:'bad"id'}).ok,false);
});

test('canonical JSON import validates without HTML fallback',async()=>{
 const {parseDocument}=await import('../dist/index.js');const doc=fixture();
 assert.equal(parseDocument(JSON.stringify(doc)).ok,true);
 for(const input of ['<p>HTML</p>','{',JSON.stringify({...doc,schemaVersion:2}),'x'.repeat(5000001)])assert.equal(parseDocument(input).ok,false);
});

test('valid future node/data schemas do not imply renderer support',()=>{
 const d=fixture();d.lexicalState.root.children[0].children.push({type:'tufte-figure',version:1,width:'body',children:[{type:'tufte-imagequilt',version:1,src:'/quilt.png',alt:'Quilt',width:640,height:480}]});
 assert.equal(validateDocument(d).ok,true);const r=renderArticle(d);assert.equal(r.ok,true,JSON.stringify(r.diagnostics));assert.match(r.html,/class="imagequilt" width="640" height="480"/);
 const imageDoc=fixture(),image=note(imageDoc).children[2];image.width=800;assert.equal(validateDocument(imageDoc).ok,true);assert.ok(renderArticle(imageDoc).diagnostics.some(x=>x.code==='UNSUPPORTED_RENDER_PROPERTY'));
});

test('length-delimited namespaces avoid prefix and note ID ambiguity',()=>{
 const a=fixture(),b=fixture();
 note(a).noteId='c';note(b).noteId='b-note-c';
 const first=renderArticle(a,{idPrefix:'a-note-b'});
 const second=renderArticle(b,{idPrefix:'a'});
 // Legacy "prefix-note-noteId" yielded "a-note-b-note-c" for both.
 assert.equal('a-note-b'+'-note-'+'c','a'+'-note-'+'b-note-c');
 assert.equal(first.ok,true,JSON.stringify(first.diagnostics));
 assert.equal(second.ok,true,JSON.stringify(second.diagnostics));
 const id=html=>html.match(/<input id="([^"]+)" type="checkbox"/)?.[1];
 assert.equal(id(first.html),'tufte-8-a-note-b-c');
 assert.equal(id(second.html),'tufte-1-a-b-note-c');
 assert.notEqual(id(first.html),id(second.html));
 for(const result of [first,second])assert.ok(result.html.includes('for="'+id(result.html)+'"'));
});

test('publication output has no inline style and uses scoped CSS classes',()=>{
 const d=fixture();
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.doesNotMatch(result.html,/\\sstyle=/);
 assert.match(result.html,/class="tufte-article/);
 assert.match(result.html,/class="tufte-pre-wrap"/);
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/counter-reset: sidenote-counter/);
 assert.match(css,/white-space: pre-wrap/);
});

test('table column headers use thead and preserve tbody and scope',()=>{
 const d=fixture();
 const table=d.lexicalState.root.children[0].children[4].children[0];
 const first=table.children[0];
 assert.ok(first.children.every(cell=>cell.headerState===1));
 const rendered=renderArticle(d);
 assert.equal(rendered.ok,true,JSON.stringify(rendered.diagnostics));
 assert.match(rendered.html,/<thead><tr[^>]*><th scope="col">/);
 assert.match(rendered.html,/<\/thead><tbody>/);
 assert.match(rendered.html,/<\/tbody><\/table>/);
});
test('a mixed or non-leading column header row remains in tbody',()=>{
 const d=fixture();
 const table=d.lexicalState.root.children[0].children[4].children[0];
 const first=table.children[0];
 first.children[0].headerState=0;
 const rendered=renderArticle(d);
 assert.equal(rendered.ok,true,JSON.stringify(rendered.diagnostics));
 const tables=[...rendered.html.matchAll(/<table(?: [^>]*)?>[\s\S]*?<\/table>/g)].map(m=>m[0]);
 assert.ok(tables.length>=1);
 assert.doesNotMatch(tables[0],/<thead>/);
 assert.match(tables[0],/<tbody><tr/);
});

test('R10 underline, strike and highlight compose without losing text',()=>{
 for(const [flag,tag] of [[4,'s'],[8,'u'],[128,'mark']]){
  const d=fixture();
  const text=note(d).children[0];
  text.format=flag;
  const result=renderArticle(d);
  assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
  assert.match(result.html,new RegExp('<'+tag+'><span class="tufte-pre-wrap">'));
  assert.match(result.html,new RegExp('</span></'+tag+'>'));
 }
 const d=fixture();note(d).children[0].format=4|8|128;
 const combined=renderArticle(d);
 assert.equal(combined.ok,true,JSON.stringify(combined.diagnostics));
 assert.match(combined.html,/<mark><u><s><span class="tufte-pre-wrap">/);
 assert.match(combined.html,/<\/span><\/s><\/u><\/mark>/);
});

test('P2.2 F02-F09 headings, lists, definitions and quotations render semantically',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 const text=value=>({type:'text',version:1,text:value,format:0});
 const para=value=>({type:'paragraph',version:1,children:[text(value)]});
 section.children.push(
  {type:'heading',version:1,tag:'h2',children:[text('Heading')]},
  {type:'horizontalrule',version:1},
  {type:'list',version:1,listType:'bullet',tag:'ul',start:1,children:[
   {type:'listitem',version:1,value:1,children:[text('Item')]}
  ]},
  {type:'tufte-definition-list',version:1,children:[
   {type:'tufte-term',version:1,children:[text('Term')]},
   {type:'tufte-definition',version:1,children:[para('Meaning')]}
  ]},
  {type:'tufte-epigraph',version:1,children:[
   {type:'quote',version:1,children:[text('Quotation')]}
  ]},
  {type:'paragraph',version:1,children:[{type:'tufte-span',version:1,kind:'sans',children:[text('Sans')]}]}
 );
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 for(const pattern of [/<h2>/,/<hr>/,/<ul>/,/<li>/,/<dl>/,/<dt>/,/<dd>/,/<div class="epigraph">/,/<blockquote>/,/<span class="sans">/])assert.match(result.html,pattern);
});

test('P2.2 ordered list numbering is retained; unordered list has no numeric attributes',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 const t=value=>({type:'text',version:1,text:value,format:0});
 section.children.push(
  {type:'list',version:1,tag:'ol',listType:'number',start:7,children:[
   {type:'listitem',version:1,value:7,children:[t('seven')]},
   {type:'listitem',version:1,value:12,children:[t('twelve')]}
  ]},
  {type:'list',version:1,tag:'ul',listType:'bullet',start:1,children:[
   {type:'listitem',version:1,value:5,children:[t('bullet')]}
  ]}
 );
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<ol start="7">/);
 assert.match(result.html,/<li value="7">/);
 assert.match(result.html,/<li value="12">/);
 assert.match(result.html,/<ul><li>/);
});

test('F15 fullwidth renders nested blocks and escapes content without editor DOM',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 section.children.push({type:'tufte-fullwidth',version:1,children:[
  {type:'paragraph',version:1,children:[{type:'text',version:1,text:'Wide <figure> & text',format:0}]},
  {type:'quote',version:1,children:[{type:'text',version:1,text:'Wide quotation',format:0}]}
 ]});
 const before=JSON.stringify(d),result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<div class="fullwidth"><p>/);
 assert.match(result.html,/Wide &lt;figure&gt; &amp; text/);
 assert.match(result.html,/<blockquote>/);
 assert.equal(JSON.stringify(d),before);
});
test('F15 fullwidth rejects nested fullwidth without silently flattening',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 section.children.push({type:'tufte-fullwidth',version:1,children:[
  {type:'tufte-fullwidth',version:1,children:[{type:'paragraph',version:1,children:[]}]}
 ]});
 const result=renderArticle(d);
 assert.equal(result.ok,false);
 assert.equal(result.html,null);
 assert.ok(result.diagnostics.some(x=>x.code==='INVALID_CHILD'),JSON.stringify(result.diagnostics));
});

test('F17 plain code renders pre/code with exact spaces tabs newlines and escaped text',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 section.children.push({type:'tufte-code',version:1,width:'fullwidth',language:null,children:[
  {type:'text',version:1,text:'  const x = "<tag>";',format:0},
  {type:'linebreak',version:1},
  {type:'tab',version:1,text:'\t',format:0},
  {type:'text',version:1,text:'return x & y;',format:0}
 ]});
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<pre class="fullwidth"><code>  const x = &quot;&lt;tag&gt;&quot;;\n\treturn x &amp; y;<\/code><\/pre>/);
 assert.doesNotMatch(result.html,/<script|style=/);
});
test('F17 code language and highlight metadata fail closed until publishing semantics are implemented',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 const code={type:'tufte-code',version:1,width:'body',language:'js',children:[
  {type:'text',version:1,text:'const x = 1;',format:0}
 ]};
 section.children.push(code);
 assert.equal(validateDocument(d).ok,true,JSON.stringify(validateDocument(d).diagnostics));
 const result=renderArticle(d);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='UNSUPPORTED_RENDER_PROPERTY'&&x.path.endsWith('.language')));
 code.language=null;
 code.children=[{type:'code-highlight',version:1,text:'const',format:0,highlightType:'keyword'}];
 const highlighted=renderArticle(d);
 assert.equal(highlighted.ok,false);
 assert.ok(highlighted.diagnostics.some(x=>x.path.endsWith('.highlightType')));
});

test('F18 embeds publish escaped sandboxed iframe with responsive dimensions',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 section.children.push({type:'tufte-embed',version:1,provider:'youtube',
  src:'https://www.youtube-nocookie.com/embed/abcdefghijk',
  title:'Tutorial "quoted" & explained',wrapper:'figure',width:'fullwidth',aspectRatio:16/9});
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<figure class="fullwidth tufte-embed" data-tufte-ratio="1\.777/);
 assert.match(result.html,/<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk"/);
 assert.match(result.html,/title="Tutorial &quot;quoted&quot; &amp; explained"/);
 assert.match(result.html,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
 assert.match(result.html,/width="960" height="540" allowfullscreen=""/);
 assert.match(result.html,/<svg viewBox="0 0 960 540" width="960" height="540" aria-hidden="true" focusable="false"><\/svg><iframe/);
 assert.doesNotMatch(result.html,/style=|<script/);
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/\.tufte-embed iframe/);
});
test('F18 rejects unsafe provider URL before iframe rendering',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 section.children.push({type:'tufte-embed',version:1,provider:'youtube',
  src:'https://evil.example/embed/abcdefghijk',title:'Bad',wrapper:'div',width:'body',aspectRatio:4/3});
 const result=renderArticle(d);
 assert.equal(result.ok,false);
 assert.equal(result.html,null);
 assert.ok(result.diagnostics.some(x=>x.code==='UNSAFE_EMBED'),JSON.stringify(result.diagnostics));
});

test('F19 ImageQuilt publishes intrinsic size and escaped alt without mutating assets',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 d.assets.push({id:'quilt-asset',src:'/assets/quilt.png',mimeType:'image/png',width:1200,height:720,byteLength:4096});
 section.children.push({type:'tufte-figure',version:1,width:'fullwidth',children:[
  {type:'tufte-imagequilt',version:1,src:'/assets/quilt.png',alt:'Quilt "wide" & safe',
   assetId:'quilt-asset',width:1200,height:720}
 ]});
 const before=JSON.stringify(d),result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<figure class="fullwidth"><img src="\/assets\/quilt.png" alt="Quilt &quot;wide&quot; &amp; safe" class="imagequilt" width="1200" height="720">/);
 assert.equal(JSON.stringify(d),before);
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/figure img\.imagequilt/);
});
test('F19 ImageQuilt rejects asset source and dimension mismatches before publication',()=>{
 for(const mismatch of [
  {src:'/assets/other.png'},
  {width:1199},
  {height:721},
  {assetId:'missing-asset'}
 ]){
  const d=fixture(),section=d.lexicalState.root.children[0];
  d.assets.push({id:'quilt-asset',src:'/assets/quilt.png',mimeType:'image/png',width:1200,height:720});
  section.children.push({type:'tufte-figure',version:1,width:'body',children:[
   {type:'tufte-imagequilt',version:1,src:'/assets/quilt.png',alt:'Quilt',assetId:'quilt-asset',width:1200,height:720,...mismatch}
  ]});
  const result=renderArticle(d);
  assert.equal(result.ok,false);
  assert.equal(result.html,null);
  assert.ok(result.diagnostics.some(x=>['ASSET_MISMATCH','MISSING_ASSET'].includes(x.code)),JSON.stringify(result.diagnostics));
 }
});

test('F17 code block preserves validated direction/alignment classes',()=>{
 const d=fixture();d.lexicalState.root.children[0].children.push({type:'tufte-code',version:1,width:'fullwidth',language:null,direction:'rtl',format:'right',children:[{type:'text',version:1,text:'  code',format:0}]});
 const r=renderArticle(d);assert.equal(r.ok,true,JSON.stringify(r.diagnostics));assert.match(r.html,/<pre dir="rtl" class="fullwidth tufte-align-right"><code>  code<\/code><\/pre>/);
});
