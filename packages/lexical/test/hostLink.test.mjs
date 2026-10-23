import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor,HostLinkNode,TUFTE_NODES,$createHostLinkNode,INSERT_HOST_LINK_COMMAND,registerHostLinkCommands} from '../dist/index.js';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';

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
 assert.equal(Object.hasOwn(saved,'url'),false);
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
