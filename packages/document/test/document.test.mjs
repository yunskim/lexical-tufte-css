import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDocument,parseDocument,canonicalizeDocument,parseCanonicalDocument,validateMetadata,validatePostRecord,isTimestamp,NODE_SCHEMA,DOCUMENT_LIMITS} from '../dist/index.js';
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const text=(value='한글')=>({type:'text',version:1,text:value,format:0});
const el=(type,children=[],props={})=>({type,version:1,children,...props});
const p=(...children)=>el('paragraph',children.length?children:[text()]);
const note=d=>d.lexicalState.root.children[0].children[0].children[1];
const metadata=()=>({slug:'한글-블로그',summary:'소개',tags:['Tufte'],authors:['작성자'],status:'draft',createdAt:'2026-10-16T09:00:00+09:00',updatedAt:'2026-10-16T10:00:00+09:00',revision:1});
const has=(result,code)=>!result.ok&&result.diagnostics.some(d=>d.code===code);
test('canonical P1 fixture stays valid without mutation and JSON parse preserves storage',()=>{
 const d=fixture(),before=JSON.stringify(d);assert.equal(validateDocument(d).ok,true);assert.equal(JSON.stringify(d),before);assert.deepEqual(parseDocument(before).document,d);
 assert.equal(parseDocument('<article>not JSON</article>').ok,false);
 assert.equal(Object.isFrozen(NODE_SCHEMA.paragraph.children),true);
});
test('planned semantic node contracts compose in one document before editor/render implementation',()=>{
 const d=fixture(),s=d.lexicalState.root.children[0];
 s.children.push(
  el('heading',[text('제목')],{tag:'h2'}),
  p(el('tufte-span',[text('새 생각')],{kind:'newthought'})),
  el('list',[el('listitem',[text(),el('list',[el('listitem',[text()],{value:1})],{listType:'bullet',tag:'ul',start:1})],{value:1})],{listType:'number',tag:'ol',start:1}),
  el('tufte-definition-list',[el('tufte-term',[text('용어')]),el('tufte-definition',[p()])]),
  {type:'horizontalrule',version:1},
  el('tufte-epigraph',[el('quote',[p(),el('tufte-attribution',[text('출처'),el('tufte-cite',[text('책')])])])]),
  el('tufte-section-footer',[text('각 섹션의 끝')]),
  el('tufte-fullwidth',[p()]),
  el('tufte-code',[text('const x ='),{type:'tab',version:1,text:'\t',format:0},{type:'code-highlight',version:1,text:'1',format:0,highlightType:'number'},{type:'linebreak',version:1}],{width:'fullwidth',language:'typescript'}),
  {type:'tufte-embed',version:1,provider:'youtube',src:'https://www.youtube-nocookie.com/embed/abcdefghijk',title:'예제 동영상',wrapper:'figure',width:'body',aspectRatio:16/9},
  el('tufte-figure',[{type:'tufte-imagequilt',version:1,src:'/quilt.svg',alt:'완성된 ImageQuilt',width:800,height:400},el('tufte-caption',[text('그림 설명')]),el('tufte-note',[text('그림 여백')],{noteId:'figure-margin',kind:'marginnote'})],{width:'fullwidth'})
 );
 const result=validateDocument(d);assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
});
test('malformed structures and unsupported versions fail with precise paths',()=>{
 for(const [mutate,code]of [
  [d=>d.schemaVersion=2,'UNSUPPORTED_VERSION'],[d=>note(d).version=2,'UNSUPPORTED_NODE_VERSION'],
  [d=>d.locale='not_a_locale','INVALID_LOCALE'],[d=>note(d).kind=['sidenote'],'INVALID_NOTE_KIND'],
  [d=>d.lexicalState.root.children[0].children.push(el('heading',[text()],{tag:'h4'})),'INVALID_HEADING'],
  [d=>d.lexicalState.root.children[0].children.push(el('tufte-definition-list',[el('tufte-definition',[p()])])),'INVALID_DEFINITION_LIST'],
  [d=>note(d).children.push(el('paragraph',[text()])),'INVALID_CHILD'],
  [d=>note(d).children.push(structuredClone(note(d))),'NESTED_NOTE'],
  [d=>note(d).children[0].future=true,'UNKNOWN_FIELD'],
 ]){const d=fixture();mutate(d);const r=validateDocument(d);assert.ok(has(r,code),JSON.stringify(r));assert.ok(r.diagnostics.every(x=>x.path.startsWith('$.')));}
});
test('managed images resolve declared assets, dimensions and duplicate identifiers',()=>{
 const d=fixture(),image=note(d).children[2];
 d.assets=[{id:'chart',src:image.src,mimeType:'image/svg+xml',width:800,height:400,byteLength:120,sha256:'a'.repeat(64)}];
 Object.assign(image,{assetId:'chart',width:800,height:400});assert.equal(validateDocument(d).ok,true);
 image.src='/different.svg';assert.ok(has(validateDocument(d),'ASSET_MISMATCH'));image.src=d.assets[0].src;
 image.assetId='missing';assert.ok(has(validateDocument(d),'MISSING_ASSET'));image.assetId='chart';
 d.assets.push({...d.assets[0]});assert.ok(has(validateDocument(d),'INVALID_ASSET_ID'));
});
test('URL/style injection and nested links through spans are blocked',()=>{
 for(const url of ['javascript:alert(1)','//evil.test/a','https://user:pass@example.com/a','data:image/svg+xml,foo','/a\\b']){const d=fixture();note(d).children[2].src=url;assert.ok(has(validateDocument(d),'UNSAFE_URL'));}
 const d=fixture();note(d).children[1].children=[el('tufte-span',[el('link',[text()],{url:'https://lexical.dev'})],{kind:'sans'})];assert.ok(has(validateDocument(d),'NESTED_LINK'));
 note(d).children=[text()];note(d).children[0].style='background:url(//evil.test)';assert.ok(has(validateDocument(d),'UNSUPPORTED_STYLE'));
});
test('embed URLs are provider specific and titles are mandatory',()=>{
 const d=fixture();const embed={type:'tufte-embed',version:1,provider:'vimeo',src:'https://player.vimeo.com/video/1234',title:'설명',wrapper:'div',width:'body',aspectRatio:1.5};d.lexicalState.root.children[0].children.push(embed);assert.equal(validateDocument(d).ok,true);
 for(const src of ['https://player.vimeo.com.evil.test/video/1234','https://player.vimeo.com/video/1234?autoplay=1','http://player.vimeo.com/video/1234']){embed.src=src;assert.ok(has(validateDocument(d),'UNSAFE_EMBED'));}
 embed.src='https://player.vimeo.com/video/1234';embed.title='';assert.ok(has(validateDocument(d),'INVALID_EMBED_TITLE'));
});
test('budgets, cyclic objects, accessors and ragged tables return diagnostics',()=>{
 let d=fixture();d.lexicalState.root.children.push(d.lexicalState.root);assert.ok(has(validateDocument(d),'CYCLIC_OR_SHARED_NODE'));
 d=fixture();note(d).children=[text('x'.repeat(DOCUMENT_LIMITS.textCharacters+1))];assert.ok(has(validateDocument(d),'LIMIT_EXCEEDED'));
 d=fixture();note(d).children=Array.from({length:10001},()=>text());assert.ok(has(validateDocument(d),'LIMIT_EXCEEDED'));
 d=fixture();let child=el('tufte-span',[text()],{kind:'sans'});for(let i=0;i<65;i++)child=el('tufte-span',[child],{kind:'sans'});note(d).children=[child];assert.ok(has(validateDocument(d),'LIMIT_EXCEEDED'));
 d=fixture();let read=false;const malicious={version:1};Object.defineProperty(malicious,'type',{enumerable:true,get(){read=true;throw Error('must not execute');}});d.lexicalState.root.children[0].children.push(malicious);assert.equal(validateDocument(d).ok,false);assert.equal(read,false);
 d=fixture();d.lexicalState.root.children[0].children[4].children[0].children[0].children.pop();assert.ok(has(validateDocument(d),'RAGGED_TABLE'));
});
test('metadata validates Korean slugs, strict calendar dates, offsets and lifecycle relationships',()=>{
 const m=metadata();assert.equal(validateMetadata(m).ok,true);
 const published={...m,status:'published',publishedAt:'2026-10-16T00:30:00Z'};assert.equal(validateMetadata(published).ok,true);
 for(const stamp of ['2026-02-29T00:00:00Z','2026-04-31T00:00:00Z','2026-10-16T24:00:00Z','2026-10-16T09:00:00','2026-10-16T09:00:00+14:01'])assert.equal(isTimestamp(stamp),false,stamp);
 assert.equal(isTimestamp('2024-02-29T12:00:00+09:00'),true);
 for(const patch of [{slug:'../secret'},{slug:'a/b'},{tags:['same','same']},{authors:[]},{status:'published'},{revision:0},{updatedAt:'2026-10-15T23:00:00+09:00'},{publishedAt:'2026-10-16T00:30:00Z'},{status:'published',publishedAt:'2026-10-17T00:00:00Z'}])assert.equal(validateMetadata({...m,...patch}).ok,false,JSON.stringify(patch));
});
test('post validation keeps body and metadata separate and returns contextual paths',()=>{
 const post={document:fixture(),metadata:metadata()};assert.equal(validatePostRecord(post).ok,true);
 post.metadata.revision=-1;post.document.id='bad/id';const r=validatePostRecord(post);assert.equal(r.ok,false);assert.ok(r.diagnostics.some(x=>x.path==='$.metadata.revision'));assert.ok(r.diagnostics.some(x=>x.path==='$.document.id'));
});

test('R03 canonical serialization is deterministic, reversible and rejects unknown fields',()=>{
 const original=fixture();
 const shuffled=Object.fromEntries(Object.entries(original).reverse());
 const a=canonicalizeDocument(original),b=canonicalizeDocument(shuffled);
 assert.equal(a.ok,true);
 assert.equal(b.ok,true);
 assert.equal(a.value,b.value);
 assert.deepEqual(parseCanonicalDocument(a.value).value,original);
 assert.equal(canonicalizeDocument({...original,unexpected:'must not drop'}).ok,false);
 assert.equal(canonicalizeDocument({...original,schemaVersion:2}).ok,false);
 assert.equal(canonicalizeDocument(original).value,a.value);
});
