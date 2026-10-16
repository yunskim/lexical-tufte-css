import {$addUpdateTag,$createParagraphNode,$createTextNode,$getSelection,$isRangeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {NODE_SCHEMA,type Diagnostic} from '@lexical-tufte/document';
import {DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,$createDefinitionListNode,$createDefinitionTermNode,$createDefinitionDescriptionNode} from './DefinitionListNodes.js';
import {SectionNode} from './LayoutNodes.js';
import {$getContainingNote} from './noteOperations.js';

/** Insert a semantic dl/dt/dd after the selected top-level section block. */
export const INSERT_TUFTE_DEFINITION_LIST_COMMAND:LexicalCommand<void>=createCommand('INSERT_TUFTE_DEFINITION_LIST');
/** Add a new dt/dd pair at the end of the current definition list. */
export const APPEND_TUFTE_DEFINITION_PAIR_COMMAND:LexicalCommand<void>=createCommand('APPEND_TUFTE_DEFINITION_PAIR');

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
  const term=$createDefinitionTermNode().append($createTextNode(''));
  const description=$createDefinitionDescriptionNode().append($createParagraphNode());
  return {term,description};
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
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(unregister=>unregister());
}
