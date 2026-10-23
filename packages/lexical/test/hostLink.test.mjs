import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor,HostLinkNode,TUFTE_NODES,$createHostLinkNode,INSERT_HOST_LINK_COMMAND,registerHostLinkCommands,hasDocumentChanged} from '../dist/index.js';
import {$getRoot,$createParagraphNode,$createTextNode,ElementNode} from 'lexical';
import {LinkNode} from '@lexical/link';

const reference={namespace:'magnolia',kind:'note',id:'note-123'};
const editor=()=>createHeadlessEditor({nodes:TUFTE_NODES,onError:error=>{throw error;}});
const flush=async e=>new Promise(resolve=>e.update(()=>{}, {onUpdate:resolve}));

test('host link JSON preserves stable reference without URL',async()=>{
 const e=editor();
 e.update(()=>{
  const p=$createParagraphNode();
  const link=$createHostLinkNode(reference);
  link.append($createTextNode('Read note'));
  p.append(link);
  $getRoot().append(p);
 });
 await flush(e);
 const json=e.getEditorState().toJSON();
 const saved=json.root.children[0].children[0];
 assert.equal(saved.type,'host-link');
 assert.deepEqual(saved.reference,reference);
 for(const field of ['url','target','rel','title'])assert.equal(Object.hasOwn(saved,field),false);
 const reopened=editor();
 const state=reopened.parseEditorState(JSON.stringify(json));
 reopened.setEditorState(state);
 assert.deepEqual(reopened.getEditorState().toJSON(),json);
});

test('host link insertion wraps selected text and preserves reference',async()=>{
 const e=editor();
 const unregister=registerHostLinkCommands(e);
 e.update(()=>{
  const p=$createParagraphNode();
  const text=$createTextNode('Example');
  p.append(text);$getRoot().append(p);
  text.select(0,7);
  e.dispatchCommand(INSERT_HOST_LINK_COMMAND,reference);
 });
 await flush(e);
 const link=e.getEditorState().toJSON().root.children[0].children[0];
 assert.equal(link.type,'host-link');
 assert.deepEqual(link.reference,reference);
 unregister();
});

test('host link rejects malformed references without creating a node',async()=>{
 const e=editor();
 e.update(()=>{
  assert.throws(()=>$createHostLinkNode({...reference,id:''}),/Invalid host reference/);
  assert.throws(()=>$createHostLinkNode({...reference,kind:'external'}),/Invalid host reference/);
  assert.throws(()=>$createHostLinkNode({...reference,namespace:'',id:'note-123'}),/Invalid host reference/);
 });
 await flush(e);
});

test('host link JSON reopen preserves two distinct namespaces',async()=>{
 const e=editor();
 e.update(()=>{
  const p=$createParagraphNode();
  for(const namespace of ['magnolia','commonplace']){
   const link=$createHostLinkNode({...reference,namespace});
   link.append($createTextNode(namespace));
   p.append(link);
  }
  $getRoot().append(p);
 });
 await flush(e);
 const serialized=e.getEditorState().toJSON();
 const reopened=editor();
 reopened.setEditorState(reopened.parseEditorState(JSON.stringify(serialized)));
 const links=reopened.getEditorState().toJSON().root.children[0].children;
 assert.deepEqual(links.map(link=>link.reference.namespace),['magnolia','commonplace']);
 assert.ok(links.every(link=>!Object.hasOwn(link,'url')));
});

test('picker ignores selection-only changes but invalidates changed document content',()=>{
 const root={type:'root',children:[{type:'paragraph',children:[{type:'text',text:'hello'}]}]};
 assert.equal(hasDocumentChanged(root,structuredClone(root)),false);
 const changed=structuredClone(root);
 changed.children[0].children[0].text='world';
 assert.equal(hasDocumentChanged(changed,root),true);
});

test('picker invalidates a structural edit even when text is unchanged',()=>{
 const before={type:'root',children:[{type:'paragraph',children:[{type:'text',text:'same'}]}]};
 const after={type:'root',children:[{type:'paragraph',children:[{type:'host-link',reference,children:[{type:'text',text:'same'}]}]}]};
 assert.equal(hasDocumentChanged(after,before),true);
});

test('host link rejects URL-bearing or unsupported-version JSON on reopen',async()=>{
 const e=editor();
 e.update(()=>{
  const p=$createParagraphNode();
  const link=$createHostLinkNode(reference);
  link.append($createTextNode('Target'));
  p.append(link);$getRoot().append(p);
 });
 await flush(e);
 const original=e.getEditorState().toJSON();
 for(const patch of [{url:'#'},{target:'_blank'},{rel:'noopener'},{title:'Injected'},{version:2}]){
  const invalid=structuredClone(original);
  Object.assign(invalid.root.children[0].children[0],patch);
  const reopened=editor();
  assert.throws(()=>reopened.parseEditorState(JSON.stringify(invalid)));
 }
});

test('host link command rejects collapsed selection without changing document',async()=>{
 const e=editor();
 const diagnostics=[];
 const unregister=registerHostLinkCommands(e,d=>diagnostics.push(d));
 e.update(()=>{
  const p=$createParagraphNode();
  const text=$createTextNode('Example');
  p.append(text);$getRoot().append(p);
  text.select(3,3);
  e.dispatchCommand(INSERT_HOST_LINK_COMMAND,reference);
 });
 await flush(e);
 const paragraph=e.getEditorState().toJSON().root.children[0];
 assert.deepEqual(paragraph.children.map(node=>node.type),['text']);
 assert.equal(diagnostics[0]?.code,'INVALID_LINK_SELECTION');
 unregister();
});

test('host link command rejects nesting inside another host link',async()=>{
 const e=editor();
 const diagnostics=[];
 const unregister=registerHostLinkCommands(e,d=>diagnostics.push(d));
 e.update(()=>{
  const p=$createParagraphNode();
  const outer=$createHostLinkNode(reference);
  const text=$createTextNode('Nested');
  outer.append(text);p.append(outer);$getRoot().append(p);
  text.select(0,6);
  e.dispatchCommand(INSERT_HOST_LINK_COMMAND,{...reference,id:'other'});
 });
 await flush(e);
 const children=e.getEditorState().toJSON().root.children[0].children;
 assert.equal(children.length,1);
 assert.equal(children[0].type,'host-link');
 assert.deepEqual(children[0].reference,reference);
 assert.equal(diagnostics[0]?.code,'NESTED_LINK');
 unregister();
});

test('host link command rejects invalid reference without mutation',async()=>{
 const e=editor();
 const diagnostics=[];
 const unregister=registerHostLinkCommands(e,d=>diagnostics.push(d));
 e.update(()=>{
  const p=$createParagraphNode();
  const text=$createTextNode('Example');
  p.append(text);$getRoot().append(p);
  text.select(0,7);
  e.dispatchCommand(INSERT_HOST_LINK_COMMAND,{...reference,kind:'external'});
 });
 await flush(e);
 assert.deepEqual(e.getEditorState().toJSON().root.children[0].children.map(node=>node.type),['text']);
 assert.equal(diagnostics[0]?.code,'INVALID_REFERENCE');
 unregister();
});

test('host link DOM exports a non-navigable span with complete reference identity',async()=>{
 const e=editor();
 e.update(()=>{
  const p=$createParagraphNode();
  const link=$createHostLinkNode(reference);
  link.append($createTextNode('Read note'));
  p.append(link);$getRoot().append(p);
 });
 await flush(e);
 const previousDocument=globalThis.document;
 const elements=[];
 globalThis.document={createElement:tag=>{
  const element={tagName:tag.toUpperCase(),dataset:{},className:'',setAttribute(name,value){if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;else this[name]=value;}};
  elements.push(element);
  return element;
 }};
 try{
  e.getEditorState().read(()=>{
   const link=$getRoot().getFirstChild().getFirstChild();
   assert.ok(link instanceof HostLinkNode);
   const {element}=link.exportDOM();
   assert.equal(element.tagName,'SPAN');
   assert.equal(element.dataset.hostNamespace,reference.namespace);
   assert.equal(element.dataset.hostKind,reference.kind);
   assert.equal(element.dataset.hostReference,reference.id);
   assert.equal(Object.hasOwn(element,'href'),false);
  });
 }finally{
  if(previousDocument===undefined)delete globalThis.document;
  else globalThis.document=previousDocument;
 }
});

test('host reference is an inline ElementNode, not a URL LinkNode',async()=>{
 const e=editor();
 e.update(()=>{
  const node=$createHostLinkNode(reference);
  assert.ok(node instanceof ElementNode);
  assert.equal(node instanceof LinkNode,false);
  assert.equal(node.isInline(),true);
 });
 await flush(e);
});

test('host link insertion wraps only the selected substring',async()=>{
 const e=editor();
 const unregister=registerHostLinkCommands(e);
 e.update(()=>{
  const p=$createParagraphNode();
  const text=$createTextNode('before target after');
  p.append(text);$getRoot().append(p);
  text.select(7,13);
  e.dispatchCommand(INSERT_HOST_LINK_COMMAND,reference);
 });
 await flush(e);
 const children=e.getEditorState().toJSON().root.children[0].children;
 assert.deepEqual(children.map(node=>node.type),['text','host-link','text']);
 assert.equal(children[0].text,'before ');
 assert.equal(children[1].children[0].text,'target');
 assert.deepEqual(children[1].reference,reference);
 assert.equal(children[2].text,' after');
 unregister();
});

test('host link serialization preserves inline element formatting on reopen',async()=>{
 const e=editor();
 e.update(()=>{
  const p=$createParagraphNode();
  const link=$createHostLinkNode(reference);
  link.setFormat('center');
  link.append($createTextNode('Formatted'));
  p.append(link);$getRoot().append(p);
 });
 await flush(e);
 const json=e.getEditorState().toJSON();
 const reopened=editor();
 reopened.setEditorState(reopened.parseEditorState(JSON.stringify(json)));
 assert.deepEqual(reopened.getEditorState().toJSON(),json);
});

test('host link schema allows inline text but forbids nested links',async()=>{
 const {NODE_SCHEMA}=await import('@lexical-tufte/document');
 assert.ok(NODE_SCHEMA.paragraph.children.includes('host-link'));
 assert.ok(NODE_SCHEMA['host-link'].children.includes('text'));
 assert.equal(NODE_SCHEMA['host-link'].children.includes('host-link'),false);
 assert.equal(NODE_SCHEMA['host-link'].children.includes('link'),false);
 assert.deepEqual(NODE_SCHEMA['host-link'].fields,['reference']);
});

test('host link DOM update keeps reference identity without creating a URL',async()=>{
 const e=editor();
 e.update(()=>{
  const p=$createParagraphNode();
  const link=$createHostLinkNode(reference);
  link.append($createTextNode('Reference'));
  p.append(link);$getRoot().append(p);
 });
 await flush(e);
 const previousDocument=globalThis.document;
 globalThis.document={createElement:tag=>({tagName:tag.toUpperCase(),dataset:{},className:'',setAttribute(name,value){if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;else this[name]=value;}})};
 try{
  e.getEditorState().read(()=>{
   const link=$getRoot().getFirstChild().getFirstChild();
   const dom=link.createDOM({});
   dom.className='host-decoration';
   assert.equal(link.updateDOM(link,dom),false);
   assert.equal(dom.className,'host-decoration tufte-host-link');
   assert.equal(link.updateDOM(link,dom),false);
   assert.equal(dom.className,'host-decoration tufte-host-link');
   assert.deepEqual(dom.dataset,{
    hostReference:reference.id,
    hostNamespace:reference.namespace,
    hostKind:reference.kind
   });
   assert.equal(Object.hasOwn(dom,'href'),false);
  });
 }finally{
  if(previousDocument===undefined)delete globalThis.document;
  else globalThis.document=previousDocument;
 }
});

test('document validator accepts a saved host reference and rejects URL metadata',async()=>{
 const {validateDocument}=await import('@lexical-tufte/document');
 const {$createSectionNode}=await import('../dist/index.js');
 const valid=editor();
 valid.update(()=>{
  const section=$createSectionNode();
  const p=$createParagraphNode();
  const link=$createHostLinkNode(reference);
  link.append($createTextNode('Reference'));
  p.append(link);section.append(p);$getRoot().append(section);
 });
 await flush(valid);
 const document={schemaVersion:1,id:'host_link_test',locale:'en-US',title:'Host link',assets:[],lexicalState:valid.getEditorState().toJSON()};
 const result=validateDocument(document);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 const invalid=structuredClone(document);
 invalid.lexicalState.root.children[0].children[0].children[0].url='#';
 const rejected=validateDocument(invalid);
 assert.equal(rejected.ok,false);
 assert.ok(rejected.diagnostics.some(d=>d.code==='UNKNOWN_FIELD'));
});

test('host reference survives save, reopen, document validation and publication',async()=>{
 const {validateDocument}=await import('@lexical-tufte/document');
 const {renderArticle}=await import('../../render/dist/index.js');
 const {$createSectionNode,exportEditorToDocument,loadDocumentIntoEditor}=await import('../dist/index.js');
 const source=editor();
 source.update(()=>{
  const section=$createSectionNode();
  const paragraph=$createParagraphNode();
  const link=$createHostLinkNode(reference);
  link.append($createTextNode('Read note'));
  paragraph.append($createTextNode('Before '),link,$createTextNode(' after'));
  section.append(paragraph);
  $getRoot().append(section);
 });
 await flush(source);
 const base={
  schemaVersion:1,id:'host-link-roundtrip',locale:'en-US',title:'Reference roundtrip',
  assets:[],lexicalState:source.getEditorState().toJSON()
 };
 const exported=exportEditorToDocument(source,base);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 const saved=JSON.parse(JSON.stringify(exported.value));
 assert.equal(validateDocument(saved).ok,true);
 const reopened=editor();
 const loaded=loadDocumentIntoEditor(reopened,saved);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const published=renderArticle(saved);
 assert.equal(published.ok,true,JSON.stringify(published.diagnostics));
 assert.equal(JSON.stringify(saved),JSON.stringify(exported.value),'publication must not mutate the saved document');
 assert.deepEqual(reopened.getEditorState().toJSON(),source.getEditorState().toJSON());
 const hostLink=reopened.getEditorState().toJSON().root.children[0].children[0].children[1];
 assert.deepEqual(hostLink.reference,reference);
 assert.equal(hostLink.children[0].text,'Read note');
 assert.match(published.html,/data-host-reference="note-123" data-host-namespace="magnolia" data-host-kind="note"/);
 assert.doesNotMatch(published.html,/<a[^>]*data-host-reference=/);
 const publishedAgain=renderArticle(saved);
 assert.deepEqual(publishedAgain,published,'publication must be deterministic');
});

test('invalid saved host reference does not replace the open editor document',async()=>{
 const {loadDocumentIntoEditor}=await import('../dist/index.js');
 const {$createSectionNode}=await import('../dist/index.js');
 const e=editor();
 e.update(()=>{
  const section=$createSectionNode(),paragraph=$createParagraphNode();
  paragraph.append($createTextNode('Keep this document'));
  section.append(paragraph);$getRoot().append(section);
 });
 await flush(e);
 const before=e.getEditorState().toJSON();
 const bad={
  schemaVersion:1,id:'invalid-host-link',locale:'en-US',title:'Rejected import',assets:[],
  lexicalState:structuredClone(before)
 };
 const paragraph=bad.lexicalState.root.children[0].children[0];
 paragraph.children=[{
  type:'host-link',version:1,reference:{namespace:'workspace',kind:'external',id:'target'},
  children:[{type:'text',version:1,text:'Invalid',format:0}]
 }];
 const result=loadDocumentIntoEditor(e,bad);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='INVALID_REFERENCE'));
 assert.deepEqual(e.getEditorState().toJSON(),before,'rejected import must leave the editor untouched');
});
