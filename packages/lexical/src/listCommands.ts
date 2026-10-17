import {$addUpdateTag,$createParagraphNode,$getSelection,$isRangeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {$createListNode,$createListItemNode,ListNode,ListItemNode} from '@lexical/list';
import {SectionNode} from './LayoutNodes.js';
import {$getContainingNote} from './noteOperations.js';
import {NODE_SCHEMA,type Diagnostic} from '@lexical-tufte/document';

export type TufteListKind='bullet'|'number';
export const INSERT_TUFTE_LIST_COMMAND:LexicalCommand<TufteListKind>=createCommand('INSERT_TUFTE_LIST');
export const APPEND_TUFTE_LIST_ITEM_COMMAND:LexicalCommand<void>=createCommand('APPEND_TUFTE_LIST_ITEM');
/** Switch an existing list between ul and ol without replacing its items or moving any note anchors. */
export const SET_TUFTE_LIST_KIND_COMMAND:LexicalCommand<TufteListKind>=createCommand('SET_TUFTE_LIST_KIND');
/** Adjust nesting by one level using Lexical's structural ListItemNode indent operation. */
export const CHANGE_TUFTE_LIST_INDENT_COMMAND:LexicalCommand<'indent'|'outdent'>=createCommand('CHANGE_TUFTE_LIST_INDENT');
/** Turn a flat section-level list into paragraphs, retaining inline children and note identities. */
export const UNWRAP_TUFTE_LIST_COMMAND:LexicalCommand<void>=createCommand('UNWRAP_TUFTE_LIST');

/** Conservative list commands: preserve existing content and reject unsupported selections. */
export function registerListCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([ListNode,ListItemNode,SectionNode]))throw Error('List commands require TUFTE_NODES');
 const reject=(message:string)=>{onDiagnostic?.({code:'INVALID_LIST_SELECTION',path:'$.selection',message});return true;};
 const selected=()=>{
  const s=$getSelection();
  return $isRangeSelection(s)&&s.isCollapsed()&&!editor.isComposing()&&!$getContainingNote(s.anchor.getNode())?s:null;
 };
 const ancestor=(node:LexicalNode,type:string):LexicalNode|null=>{
  for(let n:LexicalNode|null=node;n;n=n.getParent())if(n.getType()===type)return n;
  return null;
 };
 const registrations=[
  editor.registerCommand(INSERT_TUFTE_LIST_COMMAND,kind=>{
   if(kind!=='bullet'&&kind!=='number')return reject('지원하지 않는 목록 종류입니다.');
   const s=selected();if(!s)return reject('목록을 삽입할 섹션의 한 위치를 선택하세요.');
   const section=ancestor(s.anchor.getNode(),'tufte-section');
   if(!(section instanceof SectionNode)||section.getParent()?.getType()!=='root')return reject('최상위 섹션에서만 목록을 삽입할 수 있습니다.');
   let block:LexicalNode=s.anchor.getNode();
   while(block.getParent()&&!block.getParent()!.is(section))block=block.getParent()!;
   if(!block.getParent()?.is(section)||!NODE_SCHEMA['tufte-section']!.children!.includes(block.getType()))return reject('유효한 섹션 블록을 선택하세요.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const item=$createListItemNode();
   const list=$createListNode(kind).append(item);
   block.insertAfter(list);item.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(APPEND_TUFTE_LIST_ITEM_COMMAND,()=>{
   const s=selected();if(!s)return reject('목록 안의 한 위치를 선택하세요.');
   const list=ancestor(s.anchor.getNode(),'list');
   if(!(list instanceof ListNode))return reject('목록 안에서만 항목을 추가할 수 있습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const item=$createListItemNode();list.append(item);item.selectStart();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(SET_TUFTE_LIST_KIND_COMMAND,kind=>{
   if(kind!=='bullet'&&kind!=='number')return reject('지원하지 않는 목록 종류입니다.');
   const s=selected();
   if(!s)return reject('유형을 바꿀 목록 안의 한 위치를 선택하세요.');
   const list=ancestor(s.anchor.getNode(),'list');
   if(!(list instanceof ListNode)||!list.getParent()||!NODE_SCHEMA[list.getParent()!.getType()]?.children?.includes('list'))
    return reject('현재 위치에는 유형을 변경할 목록이 없습니다.');
   if(list.getListType()==='check')return reject('체크리스트를 Tufte 목록으로 자동 변환하지 않습니다.');
   if(list.getListType()===kind)return true;
   $addUpdateTag(HISTORY_PUSH_TAG);
   list.setListType(kind);
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(CHANGE_TUFTE_LIST_INDENT_COMMAND,direction=>{
   if(direction!=='indent'&&direction!=='outdent')return reject('지원하지 않는 목록 들여쓰기 명령입니다.');
   const s=selected();
   if(!s)return reject('목록 항목의 한 위치를 선택하세요.');
   const item=ancestor(s.anchor.getNode(),'listitem');
   if(!(item instanceof ListItemNode))return reject('목록 항목 안에서만 들여쓰기를 변경할 수 있습니다.');
   const list=item.getParent();
   if(!(list instanceof ListNode)||list.getListType()==='check'||!list.getParent()||
      !NODE_SCHEMA[list.getParent()!.getType()]?.children?.includes('list'))
    return reject('지원하지 않는 목록 구조에서는 들여쓰기를 변경할 수 없습니다.');
   // Lexical's setIndent performs structural nesting; never set CSS-only indentation on a list.
   const depth=item.getIndent();
   if(direction==='indent'&&(!item.getPreviousSibling()||depth>=20))
    return reject('첫 목록 항목은 들여쓸 수 없으며 최대 중첩 깊이는 20입니다.');
   if(direction==='outdent'&&depth===0)
    return reject('최상위 목록에서는 내어쓰기를 할 수 없습니다.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   item.setIndent(depth+(direction==='indent'?1:-1));
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(UNWRAP_TUFTE_LIST_COMMAND,()=>{
   const s=selected();if(!s)return reject('해제할 목록 안의 한 위치를 선택하세요.');
   const list=ancestor(s.anchor.getNode(),'list');
   if(!(list instanceof ListNode)||list.getListType()==='check'||!(list.getParent() instanceof SectionNode)||
      list.getParent()?.getParent()?.getType()!=='root')
    return reject('최상위 섹션에 직접 속한 목록만 문단으로 해제할 수 있습니다.');
   const items=list.getChildren();
   const allowed=NODE_SCHEMA.paragraph?.children;
   if(items.length===0||items.some(item=>!(item instanceof ListItemNode)||
       item.getIndent()!==0||item.getChildren().some(child=>!allowed?.includes(child.getType()))))
    return reject('중첩 목록·지원하지 않는 자식이 있는 항목은 내용 보존을 위해 해제하지 않습니다.');
   const selectedItem=ancestor(s.anchor.getNode(),'listitem');
   const selectedIndex=items.findIndex(item=>item.is(selectedItem));
   $addUpdateTag(HISTORY_PUSH_TAG);
   const paragraphs=items.map(item=>{
    const paragraph=$createParagraphNode();
    list.insertBefore(paragraph);
    paragraph.append(...item.getChildren());
    return paragraph;
   });
   list.remove();
   paragraphs[Math.max(0,selectedIndex)]?.selectStart();
   return true;
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(unregister=>unregister());
}
