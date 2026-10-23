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
