import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createTextNode} from 'lexical';
import {HeadingNode,QuoteNode,$createHeadingNode,$createQuoteNode} from '@lexical/rich-text';
import {ListNode,ListItemNode,$createListNode,$createListItemNode} from '@lexical/list';
import {SectionNode,$createSectionNode} from '../dist/index.js';
import {validateDocument} from '../../document/dist/index.js';
test('shared schema accepts actual official heading, quote and nested list JSON',()=>{
 const e=createHeadlessEditor({namespace:'schema-contract',nodes:[SectionNode,HeadingNode,QuoteNode,ListNode,ListItemNode],onError(error){throw error;}});
 e.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createHeadingNode('h2').append($createTextNode('제목')),
   $createQuoteNode().append($createTextNode('인용문')),
   $createListNode('number').append($createListItemNode().append($createTextNode('첫 항목')),$createListItemNode().append($createListNode('bullet').append($createListItemNode().append($createTextNode('하위 항목')))))
  ));
 },{discrete:true});
 const d=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));d.lexicalState=JSON.parse(JSON.stringify(e.getEditorState().toJSON()));
 const result=validateDocument(d);assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
});
