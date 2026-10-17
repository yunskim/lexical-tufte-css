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
/** Remove the whole definition list, including its contents, after explicit user action. */
export const REMOVE_TUFTE_DEFINITION_LIST_COMMAND:LexicalCommand<void>=createCommand('REMOVE_TUFTE_DEFINITION_LIST');

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
 const selectedGroup=()=>{
  const s=selection();if(!s)return null;
  const node=s.anchor.getNode(),list=nearest(node,'tufte-definition-list');
  if(!(list instanceof DefinitionListNode)||!(list.getParent() instanceof SectionNode)||
     list.getParent()?.getParent()?.getType()!=='root')return null;
  const children=list.getChildren();
  const groups:{terms:DefinitionTermNode[];description:DefinitionDescriptionNode}[]=[];
  let terms:DefinitionTermNode[]=[];
  // A group consists of one or more terms followed by exactly one description.
  for(const child of children){
   if(child instanceof DefinitionTermNode){terms.push(child);continue;}
   if(!(child instanceof DefinitionDescriptionNode)||terms.length===0)return null;
   groups.push({terms,description:child});terms=[];
  }
  if(terms.length||groups.length===0)return null;
  const subject=nearest(node,'tufte-term')??nearest(node,'tufte-definition');
  if(!subject||!subject.getParent()?.is(list))return null;
  const groupIndex=groups.findIndex(group=>group.description.is(subject)||group.terms.some(term=>term.is(subject)));
  return groupIndex<0?null:{list,groups,group:groups[groupIndex]!,groupIndex};
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
  editor.registerCommand(REMOVE_TUFTE_DEFINITION_LIST_COMMAND,()=>{
   const s=selection();if(!s)return reject('삭제할 정의목록 안에 커서를 두세요.');
   const list=nearest(s.anchor.getNode(),'tufte-definition-list');
   if(!(list instanceof DefinitionListNode)||!(list.getParent() instanceof SectionNode)||
      list.getParent()?.getParent()?.getType()!=='root')return reject('최상위 섹션의 정의목록만 삭제할 수 있습니다.');
   const section=list.getParent();
   const previous=list.getPreviousSibling(),next=list.getNextSibling();
   $addUpdateTag(HISTORY_PUSH_TAG);
   if(previous){list.remove();previous.selectEnd();}
   else if(next){list.remove();next.selectStart();}
   else{
    const placeholder=$createParagraphNode();
    list.insertBefore(placeholder);list.remove();placeholder.selectStart();
   }
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,()=>{
   const selected=selectedGroup();
   if(!selected)return reject('유효한 용어 그룹과 설명을 선택하세요.');
   if(selected.groups.length===1)return reject('마지막 정의 그룹은 남겨두어 빈 정의목록을 만들지 않습니다.');
   const {group,groups,groupIndex}=selected;
   const survivor=groups[groupIndex===groups.length-1?groupIndex-1:groupIndex+1]!.terms[0]!;
   $addUpdateTag(HISTORY_PUSH_TAG);
   group.description.remove();
   for(const term of group.terms)term.remove();
   survivor.selectStart();
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(MOVE_TUFTE_DEFINITION_PAIR_COMMAND,direction=>{
   if(direction!=='up'&&direction!=='down')return reject('지원하지 않는 정의목록 이동 방향입니다.');
   const selected=selectedGroup();
   if(!selected)return reject('유효한 용어 그룹과 설명을 선택하세요.');
   const {group,groups,groupIndex}=selected;
   if(direction==='up'&&groupIndex===0||direction==='down'&&groupIndex===groups.length-1)
    return reject('정의목록의 처음/끝을 넘어서는 이동은 지원하지 않습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   if(direction==='up'){
    const previousFirst=groups[groupIndex-1]!.terms[0]!;
    for(const term of group.terms)term.insertBefore(previousFirst);
    group.description.insertBefore(previousFirst);
   }else{
    const nextDescription=groups[groupIndex+1]!.description;
    // Repeated insertAfter reverses order; advance the insertion anchor instead.
    let after:LexicalNode=nextDescription;
    for(const node of [...group.terms,group.description]){
     after.insertAfter(node);after=node;
    }
   }
   return true;
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(unregister=>unregister());
}
