import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot} from 'lexical';
import {$createHorizontalRuleNode} from '@lexical/extension/HorizontalRuleExtension';
import {withDOM} from '@lexical/headless/dom';
import {$generateHtmlFromNodes} from '@lexical/html';
import {TUFTE_NODES,$createSectionNode} from '../dist/index.js';

test('headless node package imports no React HorizontalRule module or React/Yjs peers',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(pkg.dependencies['@lexical/extension'],'0.52.0');
 assert.equal(pkg.dependencies['@lexical/react'],undefined);
 assert.equal(pkg.peerDependencies,undefined);
 for(const filename of [
  '../src/nodes.ts',
  '../src/quotationCommands.ts',
  './all-nodes-fixture.mjs',
  './document-bridge.test.mjs',
  './publication-browser-harness.mjs'
 ]){
  const source=readFileSync(new URL(filename,import.meta.url),'utf8');
  assert.doesNotMatch(source,/from ['"]@lexical\/react\/LexicalHorizontalRuleNode['"]/,
   filename+' must not pull the deprecated React HorizontalRule into headless code');
  assert.match(source,/from ['"]@lexical\/extension\/HorizontalRuleExtension['"]/,
   filename+' must use the same React-free horizontal-rule registry');
 }
 const lock=readFileSync(new URL('../../../pnpm-lock.yaml',import.meta.url),'utf8');
 const lexicalImporter=lock.split('  packages/lexical:\n')[1]?.split('\n  packages/render:')[0];
 assert.ok(lexicalImporter,'Missing lexical importer in frozen pnpm lockfile');
 assert.match(lexicalImporter,/'@lexical\/extension':\n\s+specifier: 0\.52\.0/);
 assert.doesNotMatch(lexicalImporter,/'@lexical\/react':|^\s{6}(react|react-dom|yjs):/m);
});

test('React-free horizontal rule retains the horizontalrule JSON wire type and HTML output',()=>{
 const makeEditor=()=>createHeadlessEditor({
  namespace:'react-free-rule',
  nodes:TUFTE_NODES,
  onError(error){throw error;}
 });
 const editor=makeEditor();
 editor.update(()=>$getRoot().append(
  $createSectionNode().append($createHorizontalRuleNode())
 ),{discrete:true});
 const original=editor.getEditorState().toJSON();
 assert.equal(original.root.children[0].children[0].type,'horizontalrule');
 assert.equal(original.root.children[0].children[0].version,1);
 const editor2=makeEditor();
 editor2.setEditorState(editor2.parseEditorState(JSON.stringify(original)));
 assert.deepEqual(editor2.getEditorState().toJSON(),original,
  'Changing horizontal-rule implementations must not alter canonical saved JSON');
 const html=withDOM(()=>editor2.getEditorState().read(()=>$generateHtmlFromNodes(editor2)));
 assert.match(html,/<hr\s*\/?>/);
 assert.doesNotMatch(html,/data-lexical|react|contenteditable/);
});
