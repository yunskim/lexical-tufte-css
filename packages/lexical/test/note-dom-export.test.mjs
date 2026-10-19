import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {SidenoteNode,MarginnoteNode} from '../dist/index.js';

const require=createRequire(import.meta.url);
let JSDOM;
try { ({JSDOM}=require('jsdom')); } catch { /* Optional DOM dependency; test skipped below. */ }

for(const [name,Node] of [['sidenote',SidenoteNode],['marginnote',MarginnoteNode]]){
 test(`Lexical ${name} DOM export emits CSS-compatible sibling controls`,{skip:!JSDOM},()=>{
  const previousDocument=globalThis.document;
  const previousHTMLElement=globalThis.HTMLElement;
  const dom=new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.document=dom.window.document;
  globalThis.HTMLElement=dom.window.HTMLElement;
  try{
   const node=new Node('note-test');
   const exported=node.exportDOM(null);
   const content=exported.element;
   content.append(document.createTextNode('Rich note body'));
   const result=exported.after(content);
   assert.equal(result.nodeType,11,'note export must use a DocumentFragment');
   const host=document.createElement('div');
   host.append(result);
   assert.equal(host.children.length,3);
   const [label,input,span]=host.children;
   assert.equal(label.tagName,'LABEL');
   assert.equal(input.tagName,'INPUT');
   assert.equal(span.tagName,'SPAN');
   assert.equal(label.htmlFor,input.id);
   assert.equal(input.nextElementSibling,span);
   assert.equal(span.className,name);
   assert.equal(span.textContent,'Rich note body');
   assert.equal(label.classList.contains('sidenote-number'),name==='sidenote');
   assert.equal(label.textContent,name==='marginnote'?'⊕':'');
  }finally{
   globalThis.document=previousDocument;
   globalThis.HTMLElement=previousHTMLElement;
   dom.window.close();
  }
 });
}
