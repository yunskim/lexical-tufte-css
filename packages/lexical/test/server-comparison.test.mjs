import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeadlessEditor} from '@lexical/headless';
import {withDOM} from '@lexical/headless/dom';
import {$generateHtmlFromNodes} from '@lexical/html';
import {LinkNode} from '@lexical/link';
import {TableNode,TableRowNode,TableCellNode} from '@lexical/table';
import {SectionNode,FigureNode,CaptionNode,TableLayoutNode,NoteNode,InlineImageNode} from '../dist/index.js';
const doc=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
function editor(){const e=createHeadlessEditor({namespace:'server-comparison',nodes:[SectionNode,FigureNode,CaptionNode,TableLayoutNode,NoteNode,InlineImageNode,LinkNode,TableNode,TableRowNode,TableCellNode],onError(error){throw error;}});e.setEditorState(e.parseEditorState(doc.lexicalState));return e;}
test('headless state import works without DOM but HTML export explicitly requires DOM',()=>{
 assert.equal(typeof document,'undefined');const e=editor();
 assert.deepEqual(JSON.parse(JSON.stringify(e.getEditorState().toJSON())),doc.lexicalState);
 assert.throws(()=>e.read(()=>$generateHtmlFromNodes(e)),/headless browser|withDOM/);
});
test('withDOM restores globals but pinned Happy DOM removes self replacements',()=>{
 withDOM(()=>{const p=document.createElement('div');const t=document.createElement('table');p.append(t);t.replaceWith(t);assert.equal(p.children.length,0,'pinned adapter limitation: self replace removes the table');});
 const e=editor();const before=e.getEditorState().toJSON();
 assert.throws(()=>withDOM(()=>e.read(()=>$generateHtmlFromNodes(e))),/Table layout requires exactly one table/);
 assert.deepEqual(e.getEditorState().toJSON(),before);assert.equal(typeof document,'undefined');
});
