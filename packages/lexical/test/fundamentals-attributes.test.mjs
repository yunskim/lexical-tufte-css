import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {withDOM} from '@lexical/headless/dom';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {$createQuoteNode,QuoteNode} from '@lexical/rich-text';
import {
 TUFTE_NODES,TUFTE_NODE_TYPES,$createSectionNode,
 TufteParagraphNode,TufteQuoteNode,$createTufteParagraphNode,$createTufteQuoteNode
} from '../dist/index.js';

const quoteURL='http://www.edwardtufte.com/bboard/q-and-a-fetch-msg?msg_id=0000hB';
const editor=()=>createHeadlessEditor({
 namespace:'fundamentals-attributes',nodes:TUFTE_NODES,onError(error){throw error;}
});

test('standard Lexical factories resolve to Tufte subclasses without changing their node types',()=>{
 const e=editor();
 e.update(()=>{
  const p=$createParagraphNode().append($createTextNode('ordinary'));
  const q=$createQuoteNode().append($createTextNode('quote'));
  assert.ok(p instanceof TufteParagraphNode);
  assert.ok(q instanceof TufteQuoteNode);
  assert.ok(q instanceof QuoteNode);
  $getRoot().append($createSectionNode().append(p,q));
 },{discrete:true});
 const nodes=e.getEditorState().toJSON().root.children[0].children;
 assert.equal(nodes[0].type,'paragraph');
 assert.equal(nodes[1].type,'quote');
 assert.equal(Object.hasOwn(nodes[0],'tufteClass'),false);
 assert.equal(Object.hasOwn(nodes[1],'cite'),false);
 assert.equal(new Set(TUFTE_NODE_TYPES).size,TUFTE_NODE_TYPES.length,'registry types stay unique');
});

test('paragraph sans and quote cite survive real editor JSON load/save and ordinary editing',()=>{
 const e=editor();
 e.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createTufteParagraphNode('sans').append($createTextNode('Gill Sans')),
   $createTufteQuoteNode(quoteURL).append(
    $createParagraphNode().append($createTextNode('Quoted text'))
   )
  ));
 },{discrete:true});
 const stored=e.getEditorState().toJSON();
 const [p,q]=stored.root.children[0].children;
 assert.equal(p.type,'paragraph');
 assert.equal(p.tufteClass,'sans');
 assert.equal(q.type,'quote');
 assert.equal(q.cite,quoteURL);
 assert.equal(q.children[0].type,'paragraph');

 const next=editor();
 next.setEditorState(next.parseEditorState(stored));
 assert.deepEqual(next.getEditorState().toJSON(),stored,'new optional fields survive import/export');
 next.update(()=>{
  const paragraph=$getRoot().getFirstChild().getFirstChild();
  const quote=paragraph.getNextSibling();
  assert.equal(paragraph.getTufteClass(),'sans');
  assert.equal(quote.getCite(),quoteURL);
  paragraph.setTufteClass(undefined);
  quote.setCite(undefined);
 },{discrete:true});
 const cleared=next.getEditorState().toJSON().root.children[0].children;
 assert.equal(Object.hasOwn(cleared[0],'tufteClass'),false);
 assert.equal(Object.hasOwn(cleared[1],'cite'),false);
});

test('mutation and JSON imports reject unsupported classes and unsafe cite URLs',()=>{
 const e=editor();
 e.update(()=>{
  assert.throws(()=>$createTufteParagraphNode('evil'),/Invalid paragraph Tufte class/);
  assert.throws(()=>$createTufteQuoteNode('javascript:alert(1)'),/Invalid blockquote citation URL/);
  assert.throws(()=>TufteParagraphNode.importJSON({
   type:'paragraph',version:1,children:[],tufteClass:'not-sans'
  }),/Invalid Tufte paragraph/);
  assert.throws(()=>TufteQuoteNode.importJSON({
   type:'quote',version:1,children:[],cite:'data:text/html,evil'
  }),/Invalid Tufte quotation citation/);
 },{discrete:true});
});

test('real Lexical HTML exporter keeps direct p.sans and blockquote cite attributes',()=>{
 const e=editor();
 e.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createTufteParagraphNode('sans').append($createTextNode('Gill Sans')),
   $createTufteQuoteNode(quoteURL).append($createTextNode('Quote'))
  ));
 },{discrete:true});
 const json=e.getEditorState().toJSON();
 const html=withDOM(()=>e.getEditorState().read(()=>$generateHtmlFromNodes(e)));
 assert.match(html,/<p class="sans">Gill Sans<\/p>/);
 assert.ok(html.includes('<blockquote cite="'+quoteURL+'">Quote</blockquote>'));
 assert.deepEqual(e.getEditorState().toJSON(),json,'HTML export does not alter editor JSON');
});
