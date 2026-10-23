import {$addUpdateTag,$getSelection,$isRangeSelection,$isTextNode,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,createCommand,type LexicalCommand,type LexicalEditor} from 'lexical';
import {NODE_SCHEMA,type Diagnostic,type HostReference} from '@lexical-tufte/document';
import {HostLinkNode,$createHostLinkNode} from './HostLinkNode.js';

export const INSERT_HOST_LINK_COMMAND:LexicalCommand<HostReference>=createCommand('INSERT_HOST_LINK');

/** Wrap a single selected plain-text fragment; reject unsupported ranges without mutation. */
export function registerHostLinkCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([HostLinkNode]))throw Error('Host links require HostLinkNode registration');
 const reject=(code:string,message:string)=>{
  onDiagnostic?.({code,path:'$.selection',message});return true;
 };
 return editor.registerCommand(INSERT_HOST_LINK_COMMAND,reference=>{
  if(!reference||typeof reference!=='object'||Array.isArray(reference)||
    Object.keys(reference).some(k=>!['namespace','kind','id'].includes(k))||
    typeof reference.namespace!=='string'||!reference.namespace.trim()||reference.namespace.length>128||
    typeof reference.id!=='string'||!reference.id.trim()||reference.id.length>256||
    !['document','note','task','asset'].includes(reference.kind))
   return reject('INVALID_REFERENCE','내부 링크 식별자가 올바르지 않습니다.');
  const selection=$getSelection();
  if(!$isRangeSelection(selection)||selection.isCollapsed()||editor.isComposing()||
     selection.anchor.type!=='text'||selection.focus.type!=='text'||
     selection.anchor.key!==selection.focus.key)
   return reject('INVALID_LINK_SELECTION','조합 중이 아닌 단일 텍스트 노드의 구간을 선택하세요.');
  const node=selection.anchor.getNode();
  const start=Math.min(selection.anchor.offset,selection.focus.offset);
  const end=Math.max(selection.anchor.offset,selection.focus.offset);
  if(!$isTextNode(node)||!node.isSimpleText()||start===end||start<0||end>node.getTextContentSize())
   return reject('INVALID_LINK_SELECTION','일반 텍스트 구간만 링크로 만들 수 있습니다.');
  for(let parent=node.getParent();parent;parent=parent.getParent()){
   if(parent.getType()==='link'||parent.getType()==='host-link')
    return reject('NESTED_LINK','링크 안에 다른 링크를 만들 수 없습니다.');
  }
  const parent=node.getParent();
  if(!parent||!NODE_SCHEMA[parent.getType()]?.children?.includes('host-link'))
   return reject('INVALID_LINK_PARENT','현재 위치에는 내부 링크를 삽입할 수 없습니다.');
  $addUpdateTag(HISTORY_PUSH_TAG);
  const pieces=node.splitText(start,end);
  const fragment=pieces[start>0?1:0];
  if(!fragment)throw Error('Text split failed after validated range');
  const link=$createHostLinkNode(reference);
  fragment.insertBefore(link);
  link.append(fragment);
  fragment.select(0,fragment.getTextContentSize());
  return true;
 },COMMAND_PRIORITY_EDITOR);
}
