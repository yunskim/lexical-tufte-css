import {test} from 'node:test';
import assert from 'node:assert/strict';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {createFixtureEditor,createAllNodesDocument} from './all-nodes-fixture.mjs';
import {loadDocumentIntoEditor,inspectEditorStructure,focusStructureIssue,$createSectionNode,$createFigureNode,$createCaptionNode,$createTableLayoutNode,$createInlineImageNode} from '../dist/index.js';
for(const [name,create,codes]of [
 ['empty section',()=>$createSectionNode(),['EMPTY_NODE']],
 ['figure without image',()=>$createSectionNode().append($createFigureNode().append($createCaptionNode().append($createTextNode('캡션 보존')))),['INVALID_FIGURE']],
 ['table wrapper without table',()=>$createSectionNode().append($createTableLayoutNode().append($createParagraphNode().append($createTextNode('표 밖 내용 보존')))),['INVALID_CHILD','INVALID_TABLE_LAYOUT']],
 ['two images',()=>$createSectionNode().append($createFigureNode().append($createInlineImageNode('/a.svg','A'),$createInlineImageNode('/b.svg','B'))),['INVALID_FIGURE']],
]){
 test(`R05 ${name}: inspect retains content and reports recovery location`,()=>{
  const editor=createFixtureEditor();editor.update(()=>$getRoot().append(create()),{discrete:true});
  const before=editor.getEditorState().toJSON(),issues=inspectEditorStructure(editor);
  for(const code of codes)assert.ok(issues.some(issue=>issue.code===code));
  assert.ok(issues.every(issue=>issue.key&&issue.path.startsWith('$.lexicalState.root')));
  assert.deepEqual(editor.getEditorState().toJSON(),before);
  // Headless selection without DOM focus is tested by the real browser integration.
 });
}
test('R05 complete registry document is structurally accepted without normalizing data',()=>{
 const editor=createFixtureEditor(),doc=createAllNodesDocument();assert.equal(loadDocumentIntoEditor(editor,doc).ok,true);
 const before=editor.getEditorState().toJSON();assert.deepEqual(inspectEditorStructure(editor),[]);assert.deepEqual(editor.getEditorState().toJSON(),before);assert.deepEqual(JSON.parse(JSON.stringify(before)),doc.lexicalState);
});
test('R05 stale recovery location does not mutate or throw',()=>{
 const editor=createFixtureEditor();editor.update(()=>$getRoot().append($createSectionNode().append($createParagraphNode())),{discrete:true});
 const before=editor.getEditorState().toJSON();assert.equal(focusStructureIssue(editor,'missing-node'),false);assert.deepEqual(editor.getEditorState().toJSON(),before);
});
