import {canonicalBlockType} from './blockSerialization.js';
import {HorizontalRuleNode,$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {$addUpdateTag,$createTextNode,$getSelection,$isRangeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {QuoteNode,$createQuoteNode} from '@lexical/rich-text';
import {NODE_SCHEMA,type Diagnostic} from '@lexical-tufte/document';
import {SectionNode} from './LayoutNodes.js';
import {EpigraphNode,AttributionNode,CiteNode,$createEpigraphNode,$createAttributionNode,$createCiteNode} from './QuotationNodes.js';
import {SectionFooterNode,$createSectionFooterNode} from './SectionFooterNode.js';
import {$getContainingNote} from './noteOperations.js';

export type TufteQuotationKind='quote'|'epigraph'|'section-footer';
export const INSERT_TUFTE_QUOTATION_COMMAND:LexicalCommand<TufteQuotationKind>=createCommand('INSERT_TUFTE_QUOTATION');
export const INSERT_TUFTE_HORIZONTAL_RULE_COMMAND:LexicalCommand<void>=createCommand('INSERT_TUFTE_HORIZONTAL_RULE');
export const APPEND_TUFTE_SECTION_CITE_COMMAND:LexicalCommand<void>=createCommand('APPEND_TUFTE_SECTION_CITE');
export const APPEND_TUFTE_ATTRIBUTION_COMMAND:LexicalCommand<void>=createCommand('APPEND_TUFTE_ATTRIBUTION');

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
 const quote=()=> $createQuoteNode().append($createTextNode('인용문'));
 const registrations=[
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
