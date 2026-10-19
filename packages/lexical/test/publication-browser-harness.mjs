/** Browser-only regression harness, loaded explicitly by publication-browser.mjs. */
import {createEditor,$getRoot,$createParagraphNode,$createTextNode,$createLineBreakNode,$createTabNode} from 'lexical';
import {registerRichText,HeadingNode,QuoteNode,$createQuoteNode} from '@lexical/rich-text';
import {LinkNode} from '@lexical/link';
import {ListNode,ListItemNode} from '@lexical/list';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {$generateHtmlFromNodes} from '@lexical/html';
import {
 TUFTE_NODES,loadDocumentIntoEditor,SectionNode,NoteNode,InlineImageNode,TufteSpanNode,FigureNode,CaptionNode,TableLayoutNode,
 DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,EpigraphNode,AttributionNode,CiteNode,SectionFooterNode,
 FullwidthNode,TufteCodeNode,ImageQuiltNode,EmbedNode,
 $createTufteHeadingNode,$createSectionNode,$createDefinitionListNode,$createDefinitionTermNode,$createDefinitionDescriptionNode,
 $createEpigraphNode,$createAttributionNode,$createCiteNode,$createSectionFooterNode,$createFullwidthNode,
 $createTufteCodeNode,$createImageQuiltNode,$createFigureNode,$createEmbedNode,exportEditorToDocument,
} from '../src/index.js';
export function mountPublicationHarness(input){
 const host=document.createElement('div');host.contentEditable='true';host.setAttribute('aria-label','신규 노드 검증 편집기');document.body.replaceChildren(host);
 const editor=createEditor({namespace:'publication-regression',nodes:TUFTE_NODES,onError(error){throw error;}});
 editor.setRootElement(host);const unregister=registerRichText(editor);
 if(input){const loaded=loadDocumentIntoEditor(editor,input);if(!loaded.ok)throw Error(JSON.stringify(loaded.diagnostics));}
 else editor.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createTufteHeadingNode('h2').append($createTextNode('검증 제목')),
   $createDefinitionListNode().append($createDefinitionTermNode().append($createTextNode('검증 용어')),$createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('검증 정의')))),
   $createEpigraphNode().append($createQuoteNode().append($createParagraphNode().append($createTextNode('검증 인용문')),$createAttributionNode().append($createTextNode('저자 '),$createCiteNode().append($createTextNode('출처'))))),
   $createSectionFooterNode().append($createTextNode('검증 맺음말')),
   $createFullwidthNode().append($createParagraphNode().append($createTextNode('전체 폭 문단'))),
   $createTufteCodeNode('fullwidth',null).setDirection('rtl').setFormat('right').append($createTextNode('  <code>&'),$createTabNode(),$createLineBreakNode(),$createTextNode('    preserved')),
   $createFigureNode('fullwidth').append($createImageQuiltNode('/fixture.svg','검증 ImageQuilt',undefined,120,48)),
   $createEmbedNode('youtube','https://www.youtube-nocookie.com/embed/abcdefghijk','검증 16:9','figure','body',16/9),
   $createEmbedNode('vimeo','https://player.vimeo.com/video/1234','검증 4:3','div','fullwidth',4/3),
  ));
 },{discrete:true});
 const base=input??{schemaVersion:1,id:'publication-check',locale:'ko-KR',title:'신규 노드 검증',assets:[],lexicalState:editor.getEditorState().toJSON()};
 return {
  snapshot(){const result=exportEditorToDocument(editor,base);if(!result.ok)throw Error(JSON.stringify(result.diagnostics));return {document:JSON.parse(JSON.stringify(result.value)),html:editor.read(()=>$generateHtmlFromNodes(editor))};},
  dispose(){unregister();editor.setRootElement(null);host.remove();},
 };
}
