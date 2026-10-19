import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SidenoteNode,MarginnoteNode} from '../dist/index.js';


// Minimal DOM fixture for the export contract; no optional dependency or silent skip.
class FakeNode {
 constructor(nodeType,tagName=''){this.nodeType=nodeType;this.tagName=tagName;this.childNodes=[];this.className='';this.textContent='';this.id='';this.htmlFor='';this.parentNode=null;}
 append(...nodes){for(const node of nodes){if(node.nodeType===11){for(const child of [...node.childNodes])this.append(node.removeChild(child));continue;}if(node.parentNode)node.parentNode.removeChild(node);node.parentNode=this;this.childNodes.push(node);}}
 appendChild(node){this.append(node);return node;}
 get firstChild(){return this.childNodes[0]??null;}
 removeChild(node){const i=this.childNodes.indexOf(node);if(i<0)throw Error('Missing child');this.childNodes.splice(i,1);node.parentNode=null;return node;}
 get children(){return this.childNodes.filter(n=>n.nodeType===1);}
 get nextElementSibling(){if(!this.parentNode)return null;const siblings=this.parentNode.children;return siblings[siblings.indexOf(this)+1]??null;}
 get classList(){return {contains:name=>this.className.split(' ').includes(name)};}
}
class FakeElement extends FakeNode {constructor(tag){super(1,tag.toUpperCase());}}
function makeDocument(){return {
 createElement:tag=>new FakeElement(tag),
 createDocumentFragment:()=>new FakeNode(11),
 createTextNode:value=>Object.assign(new FakeNode(3),{textContent:value})
};}

for(const [name,Node] of [['sidenote',SidenoteNode],['marginnote',MarginnoteNode]]){
 test(`Lexical ${name} DOM export emits CSS-compatible sibling controls`,()=>{
  const previousDocument=globalThis.document;
  const previousHTMLElement=globalThis.HTMLElement;
  globalThis.document=makeDocument();
  globalThis.HTMLElement=FakeElement;
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
   assert.equal(span.firstChild.textContent,'Rich note body');
   assert.equal(label.classList.contains('sidenote-number'),name==='sidenote');
   assert.equal(label.textContent,name==='marginnote'?'⊕':'');
  }finally{
   globalThis.document=previousDocument;
   globalThis.HTMLElement=previousHTMLElement;
  }
 });
}
