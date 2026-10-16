import {$getSelection,$isRangeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,$addUpdateTag,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import type {Diagnostic} from '@lexical-tufte/document';
import {TufteSpanNode,type TufteSpanKind} from './TufteSpanNode.js';

export const SET_TUFTE_SPAN_KIND_COMMAND:LexicalCommand<TufteSpanKind>=createCommand('SET_TUFTE_SPAN_KIND');

/** Change an existing Tufte inline span without replacing its children or losing note IDs. */
export function registerInlineCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([TufteSpanNode]))throw Error('Inline commands require TUFTE_NODES');
 const reject=(code:string,message:string)=>{onDiagnostic?.({code,path:'$.selection',message});return true;};
 return editor.registerCommand(SET_TUFTE_SPAN_KIND_COMMAND,kind=>{
  if(!(['sans','newthought','numeral','danger'] as readonly string[]).includes(kind))
   return reject('INVALID_SPAN_KIND','지원하지 않는 Tufte 인라인 속성입니다.');
  const selection=$getSelection();
  if(!$isRangeSelection(selection)||editor.isComposing())
   return reject('INVALID_SPAN_SELECTION','텍스트 선택이 필요하며 IME 조합 중에는 속성을 변경하지 않습니다.');
  const nearest=(node:LexicalNode):TufteSpanNode|null=>{
   for(let n:LexicalNode|null=node;n;n=n.getParent())if(n instanceof TufteSpanNode)return n;
   return null;
  };
  const first=nearest(selection.anchor.getNode()),last=nearest(selection.focus.getNode());
  if(!first||!last||!first.is(last))
   return reject('INVALID_SPAN_SELECTION','같은 Tufte 인라인 요소 안에서만 속성을 변경할 수 있습니다.');
  if(first.getKind()===kind)return true;
  $addUpdateTag(HISTORY_PUSH_TAG);
  first.setKind(kind);
  return true;
 },COMMAND_PRIORITY_EDITOR);
}
