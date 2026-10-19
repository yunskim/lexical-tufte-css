import {$getSelection,$isRangeSelection,$isTextNode,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,$addUpdateTag,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {NODE_SCHEMA,type Diagnostic} from '@lexical-tufte/document';
import {TufteSpanNode,$createTufteSpanNode,type TufteSpanKind} from './TufteSpanNode.js';
import {$getContainingNote} from './noteOperations.js';

export const SET_TUFTE_SPAN_KIND_COMMAND:LexicalCommand<TufteSpanKind>=createCommand('SET_TUFTE_SPAN_KIND');
/** Wrap a nonempty range inside a single plain text node; no implicit cross-node merge. */
export const WRAP_TUFTE_SPAN_COMMAND:LexicalCommand<TufteSpanKind>=createCommand('WRAP_TUFTE_SPAN');
/** Remove the containing span entirely when a caret is inside it, preserving its children. */
export const UNWRAP_TUFTE_SPAN_COMMAND:LexicalCommand<void>=createCommand('UNWRAP_TUFTE_SPAN');

/** Change an existing Tufte inline span without replacing its children or losing note IDs. */
export function registerInlineCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([TufteSpanNode]))throw Error('Inline commands require TUFTE_NODES');
 const reject=(code:string,message:string)=>{onDiagnostic?.({code,path:'$.selection',message});return true;};
 const validKind=(kind:string)=>['sans','newthought','numeral','danger'].includes(kind);
 const nearest=(node:LexicalNode):TufteSpanNode|null=>{
  for(let n:LexicalNode|null=node;n;n=n.getParent())if(n instanceof TufteSpanNode)return n;
  return null;
 };
 const registrations=[
 editor.registerCommand(SET_TUFTE_SPAN_KIND_COMMAND,kind=>{
  if(!validKind(kind))
   return reject('INVALID_SPAN_KIND','지원하지 않는 Tufte 인라인 속성입니다.');
  const selection=$getSelection();
  if(!$isRangeSelection(selection)||editor.isComposing())
   return reject('INVALID_SPAN_SELECTION','텍스트 선택이 필요하며 IME 조합 중에는 속성을 변경하지 않습니다.');
  const first=nearest(selection.anchor.getNode()),last=nearest(selection.focus.getNode());
  if(!first||!last||!first.is(last))
   return reject('INVALID_SPAN_SELECTION','같은 Tufte 인라인 요소 안에서만 속성을 변경할 수 있습니다.');
  if(first.getKind()===kind)return true;
  if(first.getChildren().some(child=>child.getType()==='tufte-note'))
   return reject('INVALID_SPAN_KIND','주석 앵커를 포함한 newthought는 다른 span 종류로 바꿀 수 없습니다.');
  $addUpdateTag(HISTORY_PUSH_TAG);
  first.setKind(kind);
  return true;
 },COMMAND_PRIORITY_EDITOR),
 editor.registerCommand(WRAP_TUFTE_SPAN_COMMAND,kind=>{
  if(!validKind(kind))return reject('INVALID_SPAN_KIND','지원하지 않는 Tufte 인라인 속성입니다.');
  const selection=$getSelection();
  if(!$isRangeSelection(selection)||selection.isCollapsed()||editor.isComposing())
   return reject('INVALID_SPAN_SELECTION','조합 중이 아닌 텍스트 구간을 선택하세요.');
  if(selection.anchor.type!=='text'||selection.focus.type!=='text'||selection.anchor.key!==selection.focus.key)
   return reject('UNSUPPORTED_SPAN_RANGE','서로 다른 텍스트 노드 사이를 걸친 선택은 아직 지원하지 않습니다.');
  const text=selection.anchor.getNode(),start=Math.min(selection.anchor.offset,selection.focus.offset),end=Math.max(selection.anchor.offset,selection.focus.offset);
  if(!$isTextNode(text)||!text.isSimpleText()||start===end||start<0||end>text.getTextContentSize()||
     $getContainingNote(text)||nearest(text))
   return reject('INVALID_SPAN_SELECTION','노트·기존 span 안의 텍스트에는 새 span을 씌울 수 없습니다.');
  const parent=text.getParent();
  if(!parent||!NODE_SCHEMA[parent.getType()]?.children?.includes('tufte-span'))
   return reject('INVALID_SPAN_PARENT','현재 부모 요소에는 Tufte 인라인 속성을 삽입할 수 없습니다.');
  // Validate before splitText: a rejected command must not modify the editor tree.
  $addUpdateTag(HISTORY_PUSH_TAG);
  const pieces=text.splitText(start,end);
  const fragment=pieces[start>0?1:0];
  if(!fragment)throw Error('Text split failed after validated range');
  const span=$createTufteSpanNode(kind);
  fragment.insertBefore(span);
  span.append(fragment);
  fragment.select(0,fragment.getTextContentSize());
  return true;
 },COMMAND_PRIORITY_EDITOR),
 editor.registerCommand(UNWRAP_TUFTE_SPAN_COMMAND,()=>{
  const selection=$getSelection();
  if(!$isRangeSelection(selection)||!selection.isCollapsed()||selection.anchor.type!=='text'||editor.isComposing()||$getContainingNote(selection.anchor.getNode()))
   return reject('INVALID_SPAN_SELECTION','기존 인라인 속성 내부의 한 위치를 선택하세요.');
  const span=nearest(selection.anchor.getNode()),parent=span?.getParent();
  if(!span)return reject('INVALID_SPAN_SELECTION','기존 인라인 속성 내부의 한 위치를 선택하세요.');
  if(!parent||!NODE_SCHEMA[parent.getType()]?.children?.includes('text'))
   return reject('INVALID_SPAN_PARENT','현재 부모 요소에는 span의 텍스트를 직접 배치할 수 없습니다.');
  if(span.getChildren().some(child=>!NODE_SCHEMA[parent.getType()]!.children!.includes(child.getType())))
   return reject('INVALID_SPAN_PARENT','인라인 속성 해제로 현재 자식 구조를 보존할 수 없습니다.');
  // Preserve the logical caret inside the unwrapped text, not a potentially
  // stale selection clone pointing through a removed element.
  const caret=selection.anchor.getNode(),offset=selection.anchor.offset;
  $addUpdateTag(HISTORY_PUSH_TAG);
  for(const child of span.getChildren())span.insertBefore(child);
  span.remove();
  if($isTextNode(caret)&&caret.isAttached())caret.select(offset,offset);
  return true;
 },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(unregister=>unregister());
}
