import {writeFileSync} from 'node:fs';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {LinkNode,$createLinkNode} from '@lexical/link';
import {TableNode,TableRowNode,TableCellNode,$createTableNode,$createTableRowNode,$createTableCellNode,TableCellHeaderStates} from '@lexical/table';
import {SectionNode,FigureNode,CaptionNode,TableLayoutNode,NoteNode,InlineImageNode,$createSectionNode,$createFigureNode,$createCaptionNode,$createTableLayoutNode,$createInlineImageNode,$createNoteNode} from '../dist/index.js';
const e=createHeadlessEditor({namespace:'server-fixture',nodes:[SectionNode,FigureNode,CaptionNode,TableLayoutNode,NoteNode,InlineImageNode,LinkNode,TableNode,TableRowNode,TableCellNode],onError(error){throw error;}});
e.update(()=>{
 const section=$createSectionNode();
 const note=$createNoteNode('server-note').append($createTextNode('주석 <내용>').toggleFormat('bold'),$createLinkNode('https://lexical.dev').append($createTextNode('문서')),$createInlineImageNode('/fixture.svg','주석 그림'));
 section.append($createParagraphNode().append($createTextNode('서버 본문 & <script> 금지 '),note,$createTextNode(' 다음 본문')));
 section.append($createParagraphNode().append($createTextNode('여백 '),$createNoteNode('server-margin','marginnote').append($createTextNode('번호 없는 주석'))));
 for(const width of ['body','fullwidth'])section.append($createFigureNode(width).append($createInlineImageNode('/fixture.svg','그림'),$createCaptionNode().append($createTextNode('서버 그림 캡션'))));
 for(const layout of ['body','fullwidth','scroll']){
  const table=$createTableNode();
  for(let r=0;r<2;r++){
   const row=$createTableRowNode();
   for(let c=0;c<2;c++)row.append($createTableCellNode(r===0?TableCellHeaderStates.ROW:TableCellHeaderStates.NO_STATUS).append($createParagraphNode().append($createTextNode(layout==='scroll'?'SCROLLABLECONTENT'.repeat(12):`${r===0?'항목':'값'} ${c+1}`))));
   table.append(row);
  }
  section.append($createTableLayoutNode(layout).append(table));
 }
 $getRoot().append(section);
},{discrete:true});
const doc={schemaVersion:1,id:'server-fixture',locale:'ko-KR',title:'서버 렌더링 <검증>',subtitle:'주석·그림·표',lexicalState:e.getEditorState().toJSON(),assets:[]};
writeFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),JSON.stringify(doc,null,2)+'\n');
const fields={};function walk(n){fields[n.type]=Object.keys(n);n.children?.forEach(walk);}walk(doc.lexicalState.root);console.log(JSON.stringify(fields,null,2));
