import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode as p,$createTextNode as t,$createLineBreakNode as br,$createTabNode as tab} from 'lexical';
import {$createQuoteNode as quote} from '@lexical/rich-text';
import {$createListNode as list,$createListItemNode as item} from '@lexical/list';
import {$createLinkNode as link} from '@lexical/link';
import {$createTableNode as table,$createTableRowNode as row,$createTableCellNode as cell} from '@lexical/table';
import {$createHorizontalRuleNode as hr} from '@lexical/react/LexicalHorizontalRuleNode';
import {
 TUFTE_NODES,$createTufteHeadingNode as heading,$createTufteCodeHighlightNode as token,$createSectionNode as section,$createSidenoteNode as side,$createMarginnoteNode as margin,$createInlineImageNode as image,$createTufteSpanNode as span,
 $createHostLinkNode as hostLink,$createFigureNode as figure,$createCaptionNode as caption,$createTableLayoutNode as layout,
 $createDefinitionListNode as dl,$createDefinitionTermNode as dt,$createDefinitionDescriptionNode as dd,
 $createEpigraphNode as epigraph,$createAttributionNode as attribution,$createCiteNode as cite,$createSectionFooterNode as footer,
 $createFullwidthNode as fullwidth,$createTufteCodeNode as code,$createImageQuiltNode as quilt,$createEmbedNode as embed,
} from '../dist/index.js';
export function createFixtureEditor(){return createHeadlessEditor({namespace:'all-node-contract',nodes:TUFTE_NODES,onError(error){throw error;}});}
export function createAllNodesDocument(){
 const e=createFixtureEditor();
 e.update(()=>{
  const first=section().append(
   heading('h2').append(t('한글 제목 '),t('code').toggleFormat('code')),
   heading('h3').append(t('작은 제목')),
   p().append(t('본문 & <escape> '),t('bold').toggleFormat('bold'),t('italic').toggleFormat('italic'),t('underline').toggleFormat('underline'),t('strike').toggleFormat('strikethrough'),t('mark').toggleFormat('highlight'),t('sub').toggleFormat('subscript'),t('sup').toggleFormat('superscript'),br(),link('https://lexical.dev',{target:'_blank',rel:'author',title:'문서'}).append(t('링크'))),
   p().append(t('호스트 '),hostLink({namespace:'magnolia',kind:'note',id:'note-123'}).append(t('참조'))),
   p().append(...['sans','newthought','numeral','danger'].map(kind=>span(kind).append(t(kind)))),
   p().append(t('주석 '),side('golden-side').append(t('번호 있는 주석 '),link('/reference').append(t('참고')),image('/fixture.svg','여백 그림')),margin('golden-margin').append(t('번호 없는 주석'))),
   p().append(image('/fixture.svg','관리 자산','chart',120,48)),
   list('number',3).append(item().append(t('첫째')),item().append(list('bullet').append(item().append(t('하위 항목')))),item().append(t('둘째'))),
   dl().append(dt().append(t('용어')),dt().append(t('별칭')),dd().append(p().append(t('정의'))),dd().append(p().append(t('추가 정의')))),
   hr(),
   quote().append(p().append(t('인용 '),side('golden-quote').append(t('인용 주석'))),attribution().append(t('저자 '),cite().append(t('책')))),
   epigraph().append(quote().append(p().append(t('첫 인용')),attribution().append(t('첫 저자'))),quote().append(p().append(t('둘째 인용')),attribution().append(cite().append(t('둘째 책'))))),
   footer().append(t('맺음말 '),cite().append(t('출처'))),
  );
  const second=section().append(
   figure('body').append(image('/fixture.svg','본문 그림'),caption().append(t('본문 캡션'))),
   figure('fullwidth').append(quilt('/fixture.svg','ImageQuilt','chart',120,48),caption().append(t('전체 폭 캡션')),margin('golden-figure').append(t('그림 여백'))),
   fullwidth().append(p().append(t('전체 폭 문단'))),
   code('body',null).append(t('  plain'),tab(),br(),t('    next & <tag>')),
   code('fullwidth','typescript').append(token('const','keyword'),t(' value = '),token('1','number'),t(';'),br(),token('plain',null)),
   embed('youtube','https://www.youtube-nocookie.com/embed/abcdefghijk','YouTube','figure','body',16/9),
   embed('vimeo','https://player.vimeo.com/video/1234','Vimeo','div','fullwidth',4/3),
  );
  for(const kind of ['body','fullwidth','scroll']){
   const grid=table();for(let r=0;r<2;r++){const line=row();for(let c=0;c<2;c++)line.append(cell(r===0?1:c===0?2:0).append(p().append(t(`${kind} ${r}:${c}`))));grid.append(line);}second.append(layout(kind).append(grid));
  }
  $getRoot().append(first,second);
 },{discrete:true});
 return JSON.parse(JSON.stringify({schemaVersion:1,id:'all-nodes',locale:'ko-KR',title:'전체 노드 저장 계약',subtitle:'Lexical 0.52.0',assets:[{id:'chart',src:'/fixture.svg',mimeType:'image/svg+xml',width:120,height:48}],lexicalState:e.getEditorState().toJSON()}));
}
export function collectNodes(root){const nodes=[];function walk(n,path){nodes.push({node:n,path});n.children?.forEach((child,i)=>walk(child,`${path}.children[${i}]`));}walk(root,'$.lexicalState.root');return nodes;}
