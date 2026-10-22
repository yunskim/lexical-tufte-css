import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {withDOM} from '@lexical/headless/dom';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$getRoot} from 'lexical';
import {TUFTE_NODES,$createSectionNode,$createEmbedNode} from '../dist/index.js';
import {renderArticle} from '../../render/dist/index.js';

const url='https://www.youtube-nocookie.com/embed/YslQ2625TR4';
const editor=()=>createHeadlessEditor({
 namespace:'iframe-wrapper-parity',nodes:TUFTE_NODES,onError(error){throw error;}
});

test('Lexical exportDOM and pure publication have the same iframe-wrapper direct-child DOM',()=>{
 const e=editor();
 e.update(()=>$getRoot().append($createSectionNode().append(
  $createEmbedNode('youtube',url,'YouTube video: Tufte CSS example','figure','body',16/9),
  $createEmbedNode('youtube',url,'Second clip','div','fullwidth',16/9)
 )),{discrete:true});
 const state=e.getEditorState().toJSON();
 const doc={
  schemaVersion:1,id:'embed-parity',locale:'en-US',title:'Embed parity',
  assets:[],lexicalState:state
 };
 const pub=renderArticle(doc);
 assert.equal(pub.ok,true,JSON.stringify(pub.diagnostics));
 const lexicalHTML=withDOM(()=>e.getEditorState().read(()=>$generateHtmlFromNodes(e)));
 const inspect=html=>withDOM(()=>{
  const container=document.createElement('main');container.innerHTML=html;
  return [...container.querySelectorAll('.iframe-wrapper')].map(wrapper=>({
   tag:wrapper.tagName.toLowerCase(),
   className:wrapper.className,
   childTags:[...wrapper.children].map(n=>n.tagName.toLowerCase()),
   iframe:[...wrapper.querySelector('iframe').attributes].map(a=>[a.name,a.value])
    .sort((a,b)=>a[0].localeCompare(b[0]))
  }));
 });
 const actual=inspect(lexicalHTML),published=inspect(pub.html);
 assert.equal(actual.length,2);
 assert.deepEqual(actual,published,'Both HTML exporters must agree on modern iframe properties');
 assert.deepEqual(actual.map(x=>[x.tag,x.className,x.childTags]),[
  ['figure','iframe-wrapper',['iframe']],
  ['div','fullwidth iframe-wrapper',['iframe']]
 ]);
 for(const item of actual){
  const attrs=Object.fromEntries(item.iframe);
  assert.equal(attrs.src,url);
  assert.equal(attrs.loading,'lazy');
  assert.equal(attrs.referrerpolicy,'strict-origin-when-cross-origin');
  assert.equal(attrs.sandbox,'allow-scripts allow-same-origin allow-presentation');
  assert.equal(attrs.allowfullscreen,'');
  assert.equal(attrs.frameborder,undefined);
 }
 assert.deepEqual(e.getEditorState().toJSON(),state,'HTML export must not modify editor state');
});

test('old unsafe YouTube host cannot be imported as a modern embed',()=>{
 const e=editor();
 e.update(()=>{
  assert.throws(()=>$createEmbedNode('youtube',
   'https://www.youtube.com/embed/YslQ2625TR4','legacy host'),/Invalid embed properties/);
  assert.throws(()=>$createEmbedNode('youtube',
   'javascript:alert(1)','unsafe'),/Invalid embed properties/);
 },{discrete:true});
});
