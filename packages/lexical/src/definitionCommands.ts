import {$addUpdateTag,$createParagraphNode,$createTextNode,$getSelection,$isRangeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {NODE_SCHEMA,type Diagnostic} from '@lexical-tufte/document';
import {DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,$createDefinitionListNode,$createDefinitionTermNode,$createDefinitionDescriptionNode} from './DefinitionListNodes.js';
import {SectionNode} from './LayoutNodes.js';
import {$getContainingNote} from './noteOperations.js';

/** Insert a semantic dl/dt/dd after the selected top-level section block. */
export const INSERT_TUFTE_DEFINITION_LIST_COMMAND:LexicalCommand<void>=createCommand('INSERT_TUFTE_DEFINITION_LIST');
/** Add a new dt/dd pair at the end of the current definition list. */
export const APPEND_TUFTE_DEFINITION_PAIR_COMMAND:LexicalCommand<void>=createCommand('APPEND_TUFTE_DEFINITION_PAIR');
/** Remove one complete dt/dd pair. The final pair cannot be deleted, avoiding an invalid empty dl. */
export const REMOVE_TUFTE_DEFINITION_PAIR_COMMAND:LexicalCommand<void>=createCommand('REMOVE_TUFTE_DEFINITION_PAIR');
/** Reorder complete dt/dd pairs while retaining their node keys and all existing content. */
export const MOVE_TUFTE_DEFINITION_PAIR_COMMAND:LexicalCommand<'up'|'down'>=createCommand('MOVE_TUFTE_DEFINITION_PAIR');

export function registerDefinitionCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,SectionNode]))
  throw Error('Definition commands require TUFTE_NODES');
 const reject=(message:string)=>{onDiagnostic?.({code:'INVALID_DEFINITION_SELECTION',path:'$.selection',message});return true;};
 const nearest=(node:LexicalNode,type:string):LexicalNode|null=>{
  for(let n:LexicalNode|null=node;n;n=n.getParent())if(n.getType()===type)return n;
  return null;
 };
 const selection=()=>{
  const s=$getSelection();
  if(!$isRangeSelection(s)||!s.isCollapsed()||editor.isComposing()||$getContainingNote(s.anchor.getNode()))return null;
  return s;
 };
 const pair=()=>{
  const term=$createDefinitionTermNode().append($createTextNode('용어'));
  const description=$createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('설명')));
  return {term,description};
 };
 const strictSelectedPair=()=>{
  const s=selection();if(!s)return null;
  const node=s.anchor.getNode(),list=nearest(node,'tufte-definition-list');
  if(!(list instanceof DefinitionListNode)||!(list.getParent() instanceof SectionNode)||
     list.getParent()?.getParent()?.getType()!=='root')return null;
  const children=list.getChildren();
  // A dl may legally group multiple dt per dd; do not silently reinterpret those groups as pairs.
  if(children.length===0||children.length%2!==0||
     children.some((child,i)=>i%2===0?!(child instanceof DefinitionTermNode):!(child instanceof DefinitionDescriptionNode)))return null;
  const subject=nearest(node,'tufte-term')??nearest(node,'tufte-definition');
  if(!subject||!subject.getParent()?.is(list))return null;
  const index=children.findIndex(child=>child.is(subject));
  if(index<0)return null;
  const start=index-(index%2);
  return {list,children,term:children[start] as DefinitionTermNode,description:children[start+1] as DefinitionDescriptionNode,pairIndex:start/2,pairCount:children.length/2};
 };
 const registrations=[
  editor.registerCommand(INSERT_TUFTE_DEFINITION_LIST_COMMAND,()=>{
   const s=selection();if(!s)return reject('섹션 본문의 한 삽입 위치를 선택하세요.');
   const section=nearest(s.anchor.getNode(),'tufte-section');
   if(!(section instanceof SectionNode)||section.getParent()?.getType()!=='root')return reject('최상위 섹션 안에서만 정의목록을 삽입할 수 있습니다.');
   let block:LexicalNode=s.anchor.getNode();
   while(block.getParent()&&!block.getParent()!.is(section))block=block.getParent()!;
   if(!block.getParent()?.is(section)||!NODE_SCHEMA['tufte-section']!.children!.includes('tufte-definition-list'))
    return reject('유효한 섹션 블록을 선택하세요.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const {term,description}=pair(),list=$createDefinitionListNode().append(term,description);
   block.insertAfter(list);term.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(APPEND_TUFTE_DEFINITION_PAIR_COMMAND,()=>{
   const s=selection();if(!s)return reject('정의목록의 한 삽입 위치를 선택하세요.');
   const list=nearest(s.anchor.getNode(),'tufte-definition-list');
   if(!(list instanceof DefinitionListNode))return reject('정의목록 안에서만 항목을 추가할 수 있습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const {term,description}=pair();list.append(term,description);term.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,()=>{
   const group=strictSelectedPair();
   if(!group)return reject('정의목록의 연속된 용어·설명 쌍 안에서만 삭제할 수 있습니다.');
   if(group.pairCount===1)return reject('마지막 정의 쌍은 남겨두어 빈 정의목록을 만들지 않습니다.');
   // Select a surviving term before removing the active nodes, avoiding a dangling caret.
   const survivor=group.children[(group.pairIndex===group.pairCount-1?group.pairIndex-1:group.pairIndex+1)*2] as DefinitionTermNode;
   $addUpdateTag(HISTORY_PUSH_TAG);
   group.description.remove();
   group.term.remove();
   survivor.selectStart();
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,direction=>{
   if(direction!=='up'&&direction!=='down')return reject('지원하지 않는 정의목록 이동 방향입니다.');
   const group=strictSelectedPair();
   if(!group)return reject('정의목록의 연속된 용어·설명 쌍 안에서만 이동할 수 있습니다.');
   if(direction==='up'&&group.pairIndex===0||direction==='down'&&group.pairIndex===group.pairCount-1)
    return reject('정의목록의 처음/끝을 넘어서는 이동은 지원하지 않습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   if(direction==='up'){
    const previous=group.children[(group.pairIndex-1)*2] as DefinitionTermNode;
    group.term.insertBefore(previous);
    group.description.insertAfter(group.term);
   }else{
    const nextDescription=group.children[(group.pairIndex+1)*2+1] as DefinitionDescriptionNode;
    group.term.insertAfter(nextDescription);
    group.description.insertAfter(group.term);
   }
   // The content nodes retain their keys, so a caret within either child stays valid.
   return true;
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(unregister=>unregister());
}
