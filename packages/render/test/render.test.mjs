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
 assert.doesNotMatch(result.html,/class="tufte-pre-wrap"/);
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/counter-reset: sidenote-counter/);
 assert.doesNotMatch(css,/\.tufte-pre-wrap/);
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
  assert.match(result.html,new RegExp('<'+tag+'>'));
  assert.match(result.html,new RegExp('</'+tag+'>'));
 }
 const d=fixture();note(d).children[0].format=4|8|128;
 const combined=renderArticle(d);
 assert.equal(combined.ok,true,JSON.stringify(combined.diagnostics));
 assert.match(combined.html,/<mark><u><s>/);
 assert.match(combined.html,/<\/s><\/u><\/mark>/);
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

test('R02 complete editor golden does not bypass unsupported publication capabilities',()=>{
 const doc=JSON.parse(readFileSync(new URL('../../lexical/test/golden/lexical-0.52.0-all-nodes.json',import.meta.url),'utf8'));
 assert.equal(validateDocument(doc).ok,true);const r=renderArticle(doc);assert.equal(r.ok,false);assert.equal(r.html,null);
 assert.ok(r.diagnostics.some(d=>d.path.endsWith('highlightType')));assert.ok(r.diagnostics.every(d=>d.code==='UNSUPPORTED_RENDER_PROPERTY'));
});

test('R05 invalid section/figure/table wrapper blocks all publication without mutating recovery JSON',()=>{
 for(const [type,code,mutate]of [
  ['tufte-section','EMPTY_NODE',n=>n.children=[]],
  ['tufte-figure','INVALID_FIGURE',n=>n.children.shift()],
  ['tufte-table-layout','INVALID_TABLE_LAYOUT',n=>n.children=[]],
 ]){
  const d=fixture(),collect=n=>[n,...(n.children?.flatMap(collect)??[])];
  const node=collect(d.lexicalState.root).find(n=>n.type===type);assert.ok(node,type);mutate(node);
  const before=JSON.stringify(d),result=renderArticle(d);assert.equal(result.ok,false);assert.equal(result.html,null);assert.ok(result.diagnostics.some(d=>d.code===code));assert.equal(JSON.stringify(d),before);
 }
});

test('F07 horizontal rule is published between paragraphs without losing their content',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 const text=value=>({type:'text',version:1,text:value,format:0});
 section.children.push(
  {type:'paragraph',version:1,children:[text('before-rule')]},
  {type:'horizontalrule',version:1},
  {type:'paragraph',version:1,children:[text('after-rule')]}
 );
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const before=result.html.indexOf('before-rule'),rule=result.html.indexOf('<hr>',before),after=result.html.indexOf('after-rule',rule);
 assert.ok(before>=0&&rule>before&&after>rule,'the rule must publish between both preserved paragraphs');
});

test('F07 section footer citation publishes semantic footer and cite in order',()=>{
 const d=fixture(),section=d.lexicalState.root.children[0];
 const text=value=>({type:'text',version:1,text:value,format:0});
 section.children.push({
  type:'tufte-section-footer',version:1,children:[
   text('References: '),
   {type:'tufte-cite',version:1,children:[text('A published source')]}
  ]
 });
 const original=JSON.stringify(d),result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const footer=result.html.match(/<footer>(.*?)<\/footer>/s)?.[1];
 assert.ok(footer);
 assert.equal(footer,'References: <cite>A published source</cite>');
 assert.equal(JSON.stringify(d),original);
});

const hostLink=(reference={namespace:'workspace',kind:'note',id:'note-123'},text='Read note',format='')=>({
 type:'host-link',version:1,format,indent:0,direction:null,reference,
 children:[{type:'text',version:1,text,format:0,detail:0,mode:'normal',style:''}]
});
const withHostLink=(link=hostLink())=>{
 const d=fixture();
 d.lexicalState.root.children[0].children[0].children.push(link);
 return d;
};

test('host references render as non-navigable spans with escaped identifiers',()=>{
 const d=withHostLink();
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/<span class="tufte-host-link" data-host-reference="note-123" data-host-namespace="workspace" data-host-kind="note">/);
 assert.doesNotMatch(result.html,/href="note-123"/);
});

test('host reference retains its identity class when aligned',()=>{
 const d=withHostLink(hostLink({namespace:'workspace',kind:'task',id:'task-123'},'Task','center'));
 const result=renderArticle(d);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.html,/class="tufte-host-link tufte-align-center" data-host-reference="task-123"/);
 assert.doesNotMatch(result.html,/<a[^>]*data-host-reference=/);
});

test('host reference attributes and text are HTML-escaped without creating navigation',()=>{
 const d=withHostLink(hostLink({namespace:'space\" <team>&',kind:'asset',id:'item\" <script>&'},'Open <asset> & \"details\"'));
 const rendered=renderArticle(d);
 assert.equal(rendered.ok,true,JSON.stringify(rendered.diagnostics));
 assert.match(rendered.html,/data-host-reference="item&quot; &lt;script&gt;&amp;"/);
 assert.match(rendered.html,/data-host-namespace="space&quot; &lt;team&gt;&amp;"/);
 assert.match(rendered.html,/data-host-kind="asset"/);
 assert.match(rendered.html,/Open &lt;asset&gt; &amp; &quot;details&quot;/);
 assert.doesNotMatch(rendered.html,/<script>|href="item/);
});

test('invalid host references fail publication without partial HTML',()=>{
 const valid=withHostLink(hostLink(undefined,'Note'));
 for(const patch of [
  {namespace:''},{kind:'external'},{id:''},{url:'https://example.org'},
  {namespace:'a'.repeat(129)},{id:'x'.repeat(257)}
 ]){
  const d=structuredClone(valid);
  Object.assign(d.lexicalState.root.children[0].children[0].children.at(-1).reference,patch);
  const rendered=renderArticle(d);
  assert.equal(rendered.ok,false,JSON.stringify(patch));
  assert.equal(rendered.html,null);
 }
});

test('host reference rejects missing, non-object and unexpected identity fields',()=>{
 for(const reference of [
  null,undefined,[],42,'note-123',
  {namespace:'workspace',kind:'note'},
  {namespace:'workspace',kind:'note',id:'note-123',href:'#note-123'},
  {namespace:' ',kind:'note',id:'note-123'},
  {namespace:'workspace',kind:'note',id:' '}
 ]){
  // Set undefined explicitly: hostLink(undefined) would activate its valid default.
  const link=hostLink();link.reference=reference;
  const d=withHostLink(link);
  const result=renderArticle(d);
  assert.equal(result.ok,false,JSON.stringify(reference));
  assert.equal(result.html,null);
  assert.ok(result.diagnostics.some(x=>x.code==='INVALID_REFERENCE'));
 }
});

test('host references cannot contain nested URL or host links',()=>{
 for(const type of ['link','host-link']){
  const d=withHostLink();
  const link=d.lexicalState.root.children[0].children[0].children.at(-1);
  link.children=[type==='link'
   ?{type:'link',version:1,url:'#target',children:[{type:'text',version:1,text:'nested',format:0}]}
   :hostLink({namespace:'workspace',kind:'task',id:'nested'},'nested')];
  const result=renderArticle(d);
  assert.equal(result.ok,false,type);
  assert.equal(result.html,null);
  assert.ok(result.diagnostics.some(x=>x.code==='INVALID_CHILD'||x.code==='NESTED_LINK'),JSON.stringify(result.diagnostics));
 }
});
