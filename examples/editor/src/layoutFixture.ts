import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {$createTableNode,$createTableRowNode,$createTableCellNode,TableCellHeaderStates} from '@lexical/table';
import {$createSectionNode,$createFigureNode,$createCaptionNode,$createTableLayoutNode,$createInlineImageNode,$createNoteNode,type TableLayout} from '@lexical-tufte/lexical';
function table(layout:TableLayout){
 const table=$createTableNode();
 for(let row=0;row<2;row++){
  const tr=$createTableRowNode();
  for(let column=0;column<2;column++){
   const text=layout==='scroll'?'SCROLLABLECONTENT'.repeat(12):`${row===0?'항목':'값'} ${column+1}`;
   tr.append($createTableCellNode(row===0?TableCellHeaderStates.ROW:TableCellHeaderStates.NO_STATUS).append($createParagraphNode().append($createTextNode(text))));
  }
  table.append(tr);
 }
 return $createTableLayoutNode(layout).append(table);
}
export function $loadLayoutFixture(){
 const section=$createSectionNode().append(
  $createParagraphNode().append($createTextNode('섹션 본문과 여백 그림 '),$createNoteNode('layout-margin','marginnote').append($createInlineImageNode('/fixture.svg','여백 막대 그림'),$createTextNode('여백 설명'))),
  $createFigureNode().append($createInlineImageNode('/fixture.svg','본문 막대 그림'),$createCaptionNode().append($createTextNode('본문 그림의 충분히 긴 캡션입니다. 구조와 폭을 비교합니다.'))),
  $createFigureNode('fullwidth').append($createInlineImageNode('/fixture.svg','전체 폭 막대 그림'),$createCaptionNode().append($createTextNode('전체 폭 그림의 캡션입니다. 본문과 여백을 함께 사용합니다.'))),
  table('body'),table('fullwidth'),table('scroll'),
  $createParagraphNode().append($createTextNode('그림과 표 다음의 본문입니다.')),
 );
 $getRoot().clear().append(section);section.getFirstChild()?.selectStart();
}
