import {$getRoot,$getSelection,$isRangeSelection,$isElementNode,$setSelection,$createParagraphNode,$addUpdateTag,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalEditor,type LexicalNode,type RangeSelection,type LexicalCommand,type ElementNode} from 'lexical';
import {HeadingNode,$createHeadingNode} from '@lexical/rich-text';
import {NODE_SCHEMA,type Diagnostic} from '@lexical-tufte/document';
import {SectionNode,$createSectionNode} from './LayoutNodes.js';
import {$getContainingNote} from './noteOperations.js';
export type TufteBlockType='paragraph'|'h2'|'h3';
export const WRAP_TUFTE_ROOT_COMMAND:LexicalCommand<void>=createCommand('WRAP_TUFTE_ROOT');
export const INSERT_TUFTE_SECTION_COMMAND:LexicalCommand<void>=createCommand('INSERT_TUFTE_SECTION');
export const SPLIT_TUFTE_SECTION_COMMAND:LexicalCommand<void>=createCommand('SPLIT_TUFTE_SECTION');
export const MERGE_TUFTE_SECTION_COMMAND:LexicalCommand<void>=createCommand('MERGE_TUFTE_SECTION');
export const SET_TUFTE_BLOCK_COMMAND:LexicalCommand<TufteBlockType>=createCommand('SET_TUFTE_BLOCK');
const nearest=(node:LexicalNode,predicate:(n:LexicalNode)=>boolean):LexicalNode|null=>{for(let current:LexicalNode|null=node;current;current=current.getParent())if(predicate(current))return current;return null;};
const block=(node:LexicalNode)=>nearest(node,n=>n.getType()==='paragraph'||n.getType()==='heading');
const properties=(node:ElementNode)=>{const {children:_,...value}=node.exportJSON();return JSON.stringify(value);};
/** Register once per editor, outside editor.update. Invalid commands are consumed with diagnostics and no content mutation. */
export function registerSectionCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([SectionNode,HeadingNode]))throw Error('Section commands require TUFTE_NODES');
 const reject=(code:string,message:string)=>{onDiagnostic?.({code,path:'$.selection',message});return true;};
 const range=(collapsed:boolean):RangeSelection|null=>{const s=$getSelection();return $isRangeSelection(s)&&(!collapsed||s.isCollapsed())&&!editor.isComposing()&&!$getContainingNote(s.anchor.getNode())&&!$getContainingNote(s.focus.getNode())?s:null;};
 const current=(s:RangeSelection):SectionNode|null=>{const n=nearest(s.anchor.getNode(),n=>n instanceof SectionNode);return n instanceof SectionNode&&n.getParent()?.getType()==='root'?n:null;};
 const registrations=[
  editor.registerCommand(WRAP_TUFTE_ROOT_COMMAND,()=>{
   if(!range(true))return reject('INVALID_SECTION_SELECTION','본문의 한 삽입 위치를 선택하세요. 조합 중에는 구조를 바꾸지 않습니다.');
   const root=$getRoot(),children=root.getChildren();
   if(children.some(n=>!NODE_SCHEMA['tufte-section']!.children!.includes(n.getType())))return reject('UNSUPPORTED_ROOT_WRAP','섹션이 없는 본문 블록만 한 섹션으로 묶을 수 있습니다.');
   const selection=$getSelection()!.clone();$addUpdateTag(HISTORY_PUSH_TAG);
   const section=$createSectionNode();root.append(section);section.append(...children);
   if(children.length===0)section.append($createParagraphNode());
   // Root element selections need a surviving target after reparenting.
   if($isRangeSelection(selection)&&selection.anchor.key==='root')section.selectStart();else $setSelection(selection);
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(INSERT_TUFTE_SECTION_COMMAND,()=>{
   const s=range(true),section=s?current(s):null;if(!section)return reject('INVALID_SECTION_SELECTION','본문 섹션의 한 삽입 위치를 선택하세요.');
   $addUpdateTag(HISTORY_PUSH_TAG);const next=$createSectionNode().append($createParagraphNode());section.insertAfter(next);next.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(SPLIT_TUFTE_SECTION_COMMAND,()=>{
   const s=range(true),section=s?current(s):null;if(!section||!s)return reject('INVALID_SECTION_SELECTION','본문 섹션에서 나눌 블록을 선택하세요.');
   let child=s.anchor.getNode();while(child.getParent()&&!child.getParent()!.is(section))child=child.getParent()!;
   if(!child.getParent()?.is(section))return reject('INVALID_SECTION_SELECTION','섹션 안의 블록을 선택하세요.');
   const selected=s.clone(),moving=[child,...child.getNextSiblings()];$addUpdateTag(HISTORY_PUSH_TAG);
   const next=$createSectionNode().updateFromJSON(section.exportJSON());section.insertAfter(next);next.append(...moving);
   if(section.getChildrenSize()===0)section.append($createParagraphNode());$setSelection(selected);return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(MERGE_TUFTE_SECTION_COMMAND,()=>{
   const s=range(true),section=s?current(s):null,next=section?.getNextSibling();
   if(!section||!(next instanceof SectionNode))return reject('NO_NEXT_SECTION','합칠 다음 섹션이 없습니다.');
   if(properties(section)!==properties(next))return reject('SECTION_ATTRIBUTE_MISMATCH','방향·정렬 등의 섹션 속성이 달라 합칠 수 없습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);section.append(...next.getChildren());next.remove();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(SET_TUFTE_BLOCK_COMMAND,type=>{
   if(!['paragraph','h2','h3'].includes(type))return reject('UNSUPPORTED_BLOCK_TYPE','본문 문단 또는 h2/h3만 사용할 수 있습니다.');
   const s=range(false);if(!s)return reject('INVALID_BLOCK_SELECTION','본문의 같은 문단 안을 선택하세요.');
   const old=block(s.anchor.getNode()),end=block(s.focus.getNode());
   if(!old||!end||!old.is(end)||!$isElementNode(old))return reject('INVALID_BLOCK_SELECTION','여러 블록을 한꺼번에 바꿀 수 없습니다.');
   const target=type==='paragraph'?'paragraph':'heading',parent=old.getParent();
   if(!parent||!NODE_SCHEMA[parent.getType()]?.children?.includes(target))return reject('INVALID_BLOCK_PARENT','이 위치에는 해당 제목/문단을 사용할 수 없습니다.');
   if(old.getChildren().some(n=>!NODE_SCHEMA[target]!.children!.includes(n.getType())))return reject('INVALID_BLOCK_CHILD','주석 등 현재 내용을 보존하며 이 제목으로 바꿀 수 없습니다.');
   if(old.getType()===target&&(type==='paragraph'||(old instanceof HeadingNode&&old.getTag()===type)))return true;
   const selected=s.clone(),replacement=type==='paragraph'?$createParagraphNode():$createHeadingNode(type);
   replacement.setDirection(old.getDirection()).setFormat(old.getFormatType()).setIndent(old.getIndent()).setTextFormat(old.getTextFormat()).setTextStyle(old.getTextStyle());
   $addUpdateTag(HISTORY_PUSH_TAG);replacement.append(...old.getChildren());old.replace(replacement);
   for(const point of [selected.anchor,selected.focus])if(point.key===old.getKey())point.set(replacement.getKey(),point.offset,'element');
   $setSelection(selected);return true;
  },COMMAND_PRIORITY_EDITOR),
 ];
 return ()=>registrations.forEach(unregister=>unregister());
}
