import {TufteQuoteNode,$createTufteQuoteNode} from './TufteBlockNodes.js';
import {canonicalBlockType} from './blockSerialization.js';
import {HorizontalRuleNode,$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {$addUpdateTag,$copyNode,$createParagraphNode,$isElementNode,$isNodeSelection,$setSelection,$createTextNode,$getSelection,$isRangeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {QuoteNode,$createQuoteNode} from '@lexical/rich-text';
import {NODE_SCHEMA,isSafeURL,type Diagnostic} from '@lexical-tufte/document';
import {SectionNode} from './LayoutNodes.js';
import {EpigraphNode,AttributionNode,CiteNode,$createEpigraphNode,$createAttributionNode,$createCiteNode} from './QuotationNodes.js';
import {SectionFooterNode,$createSectionFooterNode} from './SectionFooterNode.js';
import {$getContainingNote} from './noteOperations.js';

export type TufteQuotationKind='quote'|'epigraph'|'section-footer';
export const INSERT_TUFTE_QUOTATION_COMMAND:LexicalCommand<TufteQuotationKind>=createCommand('INSERT_TUFTE_QUOTATION');
export const INSERT_TUFTE_HORIZONTAL_RULE_COMMAND:LexicalCommand<void>=createCommand('INSERT_TUFTE_HORIZONTAL_RULE');
export const APPEND_TUFTE_SECTION_CITE_COMMAND:LexicalCommand<void>=createCommand('APPEND_TUFTE_SECTION_CITE');
export const APPEND_TUFTE_ATTRIBUTION_COMMAND:LexicalCommand<void>=createCommand('APPEND_TUFTE_ATTRIBUTION');

export const APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND:LexicalCommand<void>=createCommand('APPEND_TUFTE_EPIGRAPH_ITEM');
export const MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND:LexicalCommand<'up'|'down'>=createCommand('MOVE_TUFTE_EPIGRAPH_ITEM');

export type TufteQuotationRemoval='quote'|'epigraph'|'section-footer'|'attribution'|'cite'|'horizontalrule';
export const SET_TUFTE_QUOTE_CITE_COMMAND:LexicalCommand<string|null>=createCommand('SET_TUFTE_QUOTE_CITE');
export const REMOVE_TUFTE_QUOTATION_COMMAND:LexicalCommand<TufteQuotationRemoval>=createCommand('REMOVE_TUFTE_QUOTATION');

export function registerQuotationCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([QuoteNode,SectionNode,EpigraphNode,AttributionNode,CiteNode,SectionFooterNode,HorizontalRuleNode]))
  throw Error('Quotation commands require TUFTE_NODES');
 const reject=(message:string)=>{onDiagnostic?.({code:'INVALID_QUOTATION_SELECTION',path:'$.selection',message});return true;};
 const ancestor=(node:LexicalNode,type:string):LexicalNode|null=>{
  for(let n:LexicalNode|null=node;n;n=n.getParent())if(canonicalBlockType(n.getType())===type)return n;
  return null;
 };
 const selected=()=>{
  const s=$getSelection();
  if(!$isRangeSelection(s)||!s.isCollapsed()||editor.isComposing()||$getContainingNote(s.anchor.getNode()))return null;
  return s;
 };
 // Validate the complete selected block and its ancestry before destructive edits.
 const validTree=(node:LexicalNode):boolean=>{
  const type=canonicalBlockType(node.getType()),schema=NODE_SCHEMA[type];
  if(!schema)return false;
  if(!$isElementNode(node))return !schema.children;
  const children=node.getChildren();
  return !!schema.children&& (children.length>0||['paragraph','tufte-attribution','tufte-cite','tufte-section-footer'].includes(type))
   &&children.every(child=>schema.children!.includes(canonicalBlockType(child.getType()))&&validTree(child));
 };
 const validTarget=(node:LexicalNode):boolean=>{
  let block=node;
  while(block.getParent()&&!(block.getParent() instanceof SectionNode))block=block.getParent()!;
  const section=block.getParent();
  return section instanceof SectionNode&&section.getParent()?.getType()==='root'
   &&NODE_SCHEMA['tufte-section']!.children!.includes(canonicalBlockType(block.getType()))&&validTree(block);
 };
 const remove=(node:LexicalNode)=>{
  let target=node;
  const parent=target.getParent();
  if(parent instanceof EpigraphNode&&parent.getChildrenSize()===1)target=parent;
  const container=target.getParentOrThrow(),next=target.getNextSibling(),previous=target.getPreviousSibling();
  $addUpdateTag(HISTORY_PUSH_TAG);
  if(next)next.selectStart();
  else if(previous)previous.selectEnd();
  else if(container instanceof SectionNode){const paragraph=$createParagraphNode();target.insertAfter(paragraph);paragraph.selectStart();}
  else container.selectStart();
  target.remove(true);
  if(container instanceof QuoteNode&&container.getChildrenSize()===0){
   const paragraph=$createParagraphNode();container.append(paragraph);paragraph.selectStart();
  }
  // A sole dirty, unchanged text sibling makes Lexical History merge an inline
  // removal even with HISTORY_PUSH_TAG. Renew its semantic parent so the
  // structural edit is recognized, preserving children and all metadata.
  if(node instanceof CiteNode&&$isElementNode(container)){
   const replacement=$copyNode(container),selection=$getSelection()?.clone();
   replacement.append(...container.getChildren());container.replace(replacement);
   if($isRangeSelection(selection)){
    if(selection.anchor.key===container.getKey())selection.anchor.key=replacement.getKey();
    if(selection.focus.key===container.getKey())selection.focus.key=replacement.getKey();
    $setSelection(selection);
   }
  }
 };
 const quote=()=> $createQuoteNode().append($createTextNode('인용문'));
 const epigraphItem=()=>{
  const selection=selected(),item=selection?ancestor(selection.anchor.getNode(),'quote'):null;
  const group=item?.getParent();
  return item instanceof QuoteNode&&group instanceof EpigraphNode&&validTarget(group)
   &&group.getChildren().every(child=>child instanceof QuoteNode&&validTree(child))
   ?{item,group,selection:selection!}:null;
 };
 const registrations=[
  editor.registerCommand(APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,()=>{
   const current=epigraphItem();if(!current)return reject('유효한 epigraph 인용 항목을 선택하세요.');
   $addUpdateTag(HISTORY_PUSH_TAG);const added=quote();current.item.insertAfter(added);added.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,direction=>{
   const current=epigraphItem();
   if(!current||(direction!=='up'&&direction!=='down'))return reject('이동할 epigraph 인용 항목을 선택하세요.');
   const neighbor=direction==='up'?current.item.getPreviousSibling():current.item.getNextSibling();
   if(!(neighbor instanceof QuoteNode))return reject('epigraph 항목의 이동 경계를 벗어났습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);const saved=current.selection.clone();
   if(direction==='up')neighbor.insertBefore(current.item);else neighbor.insertAfter(current.item);
   $setSelection(saved);return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(SET_TUFTE_QUOTE_CITE_COMMAND,value=>{
   const selection=selected(),q=selection?ancestor(selection.anchor.getNode(),'quote'):null;
   if(!(q instanceof QuoteNode)||!validTarget(q))return reject('유효한 섹션 인용문 안의 한 위치를 선택하세요.');
   if(value!==null&&(typeof value!=='string'||(value!==''&&!isSafeURL(value,'link'))))return reject('허용된 인용문 URL을 입력하세요.');
   const cite=value===null||value===''?undefined:value;
   if((q instanceof TufteQuoteNode?q.getCite():undefined)===cite)return true;
   $addUpdateTag(HISTORY_PUSH_TAG);
   if(q instanceof TufteQuoteNode)q.setCite(cite);
   else{
    // Keep child keys and selection; only the metadata-bearing wrapper changes.
    const replacement=$createTufteQuoteNode(cite);
    replacement.setFormat(q.getFormatType()).setIndent(q.getIndent()).setDirection(q.getDirection());
    replacement.setTextFormat(q.getTextFormat()).setTextStyle(q.getTextStyle());
    const saved=selection!.clone();
    replacement.append(...q.getChildren());q.replace(replacement);
    if(saved.anchor.key===q.getKey())saved.anchor.key=replacement.getKey();
    if(saved.focus.key===q.getKey())saved.focus.key=replacement.getKey();
    $setSelection(saved);
   }
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(REMOVE_TUFTE_QUOTATION_COMMAND,kind=>{
   const types:Record<TufteQuotationRemoval,string>={quote:'quote',epigraph:'tufte-epigraph','section-footer':'tufte-section-footer',attribution:'tufte-attribution',cite:'tufte-cite',horizontalrule:'horizontalrule'};
   if(!Object.hasOwn(types,kind))return reject('지원하지 않는 인용 삭제 대상입니다.');
   const selection=$getSelection();let target:LexicalNode|null=null;
   if(kind==='horizontalrule'&&$isNodeSelection(selection)&&!editor.isComposing()){
    const nodes=selection.getNodes();if(nodes.length===1&&nodes[0] instanceof HorizontalRuleNode)target=nodes[0];
   }else{
    const range=selected();if(range)target=ancestor(range.anchor.getNode(),types[kind]);
   }
   if(!target||$getContainingNote(target)||!validTarget(target))return reject('삭제할 인용 구조 안의 한 위치를 선택하세요.');
   remove(target);return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,()=>{
   const s=selected();if(!s)return reject('구분선을 삽입할 섹션의 한 위치를 선택하세요.');
   const section=ancestor(s.anchor.getNode(),'tufte-section');
   if(!(section instanceof SectionNode)||section.getParent()?.getType()!=='root')return reject('최상위 섹션에서만 구분선을 삽입할 수 있습니다.');
   let block:LexicalNode=s.anchor.getNode();
   while(block.getParent()&&!block.getParent()!.is(section))block=block.getParent()!;
   if(!block.getParent()?.is(section)||!NODE_SCHEMA['tufte-section']!.children!.includes(canonicalBlockType(block.getType()))||!NODE_SCHEMA['tufte-section']!.children!.includes('horizontalrule'))return reject('유효한 섹션 블록을 선택하세요.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const rule=$createHorizontalRuleNode();block.insertAfter(rule);rule.selectNext();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(INSERT_TUFTE_QUOTATION_COMMAND,kind=>{
   if(!(['quote','epigraph','section-footer'] as readonly string[]).includes(kind))return reject('지원하지 않는 인용 구조입니다.');
   const s=selected();if(!s)return reject('섹션 본문의 한 삽입 위치를 선택하세요.');
   const section=ancestor(s.anchor.getNode(),'tufte-section');
   if(!(section instanceof SectionNode)||section.getParent()?.getType()!=='root')return reject('최상위 섹션 안에서만 삽입할 수 있습니다.');
   let block:LexicalNode=s.anchor.getNode();
   while(block.getParent()&&!block.getParent()!.is(section))block=block.getParent()!;
   if(!block.getParent()?.is(section)||!NODE_SCHEMA['tufte-section']!.children!.includes(canonicalBlockType(block.getType())))return reject('유효한 섹션 블록을 선택하세요.');
   const insertedType=kind==='quote'?'quote':kind==='epigraph'?'tufte-epigraph':'tufte-section-footer';
   if(!NODE_SCHEMA['tufte-section']!.children!.includes(insertedType))return reject('섹션에 허용되지 않는 인용 구조입니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const node=kind==='quote'?quote():kind==='epigraph'?$createEpigraphNode().append(quote()):$createSectionFooterNode().append($createTextNode('섹션 출처'));
   block.insertAfter(node);node.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(APPEND_TUFTE_SECTION_CITE_COMMAND,()=>{
   const s=selected();if(!s)return reject('섹션 출처 안의 한 위치를 선택하세요.');
   const footer=ancestor(s.anchor.getNode(),'tufte-section-footer');
   if(!(footer instanceof SectionFooterNode)||footer.getParent()?.getType()!=='tufte-section'||footer.getParent()?.getParent()?.getType()!=='root')return reject('최상위 섹션의 출처에서만 인용 출처를 추가할 수 있습니다.');
   if(footer.getChildren().some(n=>canonicalBlockType(n.getType())==='tufte-cite'))return reject('섹션 출처에 인용 출처가 이미 있습니다.');
   if(!NODE_SCHEMA['tufte-section-footer']!.children!.includes('tufte-cite'))return reject('섹션 출처에 인용 출처를 추가할 수 없습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const cite=$createCiteNode().append($createTextNode('문헌'));
   footer.append(cite);cite.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(APPEND_TUFTE_ATTRIBUTION_COMMAND,()=>{
   const s=selected();if(!s)return reject('인용문 안의 한 삽입 위치를 선택하세요.');
   const q=ancestor(s.anchor.getNode(),'quote');
   if(!(q instanceof QuoteNode))return reject('인용문 안에서만 출처를 추가할 수 있습니다.');
   if(!q.getParent()||!NODE_SCHEMA[q.getParent()!.getType()]?.children?.includes('quote'))return reject('문서 스키마에 허용된 인용문에서만 출처를 추가할 수 있습니다.');
   if(q.getChildren().some(n=>canonicalBlockType(n.getType())==='tufte-attribution'))return reject('인용문에 출처가 이미 있습니다.');
   if(!NODE_SCHEMA.quote!.children!.includes('tufte-attribution'))return reject('인용문에 출처를 추가할 수 없습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const cite=$createCiteNode().append($createTextNode('출처'));
   const attribution=$createAttributionNode().append($createTextNode('— '),cite);
   q.append(attribution);cite.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(unregister=>unregister());
}
