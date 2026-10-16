import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {TableNode,TableRowNode,TableCellNode,$createTableNode,$createTableRowNode,$createTableCellNode} from '@lexical/table';
import {SectionNode,FigureNode,CaptionNode,TableLayoutNode,InlineImageNode,$createSectionNode,$createFigureNode,$createCaptionNode,$createTableLayoutNode,$createInlineImageNode} from '../dist/index.js';
function editor(){return createHeadlessEditor({namespace:'layout-test',nodes:[SectionNode,FigureNode,CaptionNode,TableLayoutNode,InlineImageNode,TableNode,TableRowNode,TableCellNode],onError(e){throw e;}});}
test('layout combinations survive JSON restore without flattening section, caption or table',()=>{
 const e=editor();e.update(()=>{
  const section=$createSectionNode();
  for(const width of ['body','fullwidth'])section.append($createFigureNode(width).append($createInlineImageNode('/fixture.svg','그림'),$createCaptionNode().append($createTextNode('캡션'))));
  for(const layout of ['body','fullwidth','scroll'])section.append($createTableLayoutNode(layout).append($createTableNode().append($createTableRowNode().append($createTableCellNode().append($createParagraphNode().append($createTextNode('셀')))))));
  $getRoot().append(section);
 },{discrete:true});
 const json=e.getEditorState().toJSON(),other=editor();other.setEditorState(other.parseEditorState(JSON.stringify(json)));
 assert.deepEqual(other.getEditorState().toJSON(),json);
 assert.deepEqual(json.root.children[0].children.map(n=>n.width??n.layout),['body','fullwidth','body','fullwidth','scroll']);
});
test('unknown layout versions and modes are explicitly rejected',()=>{
 const e=editor();e.update(()=>{$getRoot().append($createSectionNode().append($createFigureNode().append($createInlineImageNode('/fixture.svg','그림'))));},{discrete:true});
 const json=e.getEditorState().toJSON();json.root.children[0].children[0].width='unknown';
 assert.throws(()=>e.parseEditorState(JSON.stringify(json)),/Unsupported figure/);
});
