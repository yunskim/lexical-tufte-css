import {$addUpdateTag,$createTextNode,$getSelection,$isRangeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {type Diagnostic} from '@lexical-tufte/document';
import {SectionNode} from './LayoutNodes.js';
import {TufteCodeNode,$createTufteCodeNode,type CodeWidth} from './CodeBlockNode.js';
import {$getContainingNote} from './noteOperations.js';

export type InsertTufteCode={text:string;width?:CodeWidth;language?:string|null};
export const INSERT_TUFTE_CODE_COMMAND:LexicalCommand<InsertTufteCode>=createCommand('INSERT_TUFTE_CODE');

export function registerCodeCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([SectionNode,TufteCodeNode]))throw Error('Code commands require TUFTE_NODES');
 return editor.registerCommand(INSERT_TUFTE_CODE_COMMAND,payload=>{
  const reject=(code:string,message:string)=>{onDiagnostic?.({code,path:'$.selection',message});return true;};
  if(!payload||typeof payload.text!=='string'||payload.text.length>1000000||
    (payload.width!==undefined&&payload.width!=='body'&&payload.width!=='fullwidth')||
    (payload.language!==undefined&&payload.language!==null&&
      (typeof payload.language!=='string'||!/^[A-Za-z0-9_+-]{1,64}$/.test(payload.language))))
   return reject('INVALID_CODE_PAYLOAD','코드 내용, 너비 또는 언어가 올바르지 않습니다.');
  const selection=$getSelection();
  if(!$isRangeSelection(selection)||!selection.isCollapsed()||editor.isComposing()||$getContainingNote(selection.anchor.getNode()))
   return reject('INVALID_CODE_SELECTION','섹션 본문에서 한 삽입 위치를 선택하세요.');
  let node:LexicalNode=selection.anchor.getNode();
  let section:SectionNode|null=null;
  for(let parent:LexicalNode|null=node;parent;parent=parent.getParent()){
   if(parent instanceof SectionNode){section=parent;break;}
  }
  if(!section||section.getParent()?.getType()!=='root')return reject('INVALID_CODE_SELECTION','최상위 섹션 본문에서만 코드를 삽입할 수 있습니다.');
  while(node.getParent()&&!node.getParent()!.is(section))node=node.getParent()!;
  if(!node.getParent()?.is(section)||node instanceof TufteCodeNode)
   return reject('INVALID_CODE_SELECTION','유효한 섹션 블록을 선택하세요.');
  $addUpdateTag(HISTORY_PUSH_TAG);
  const code=$createTufteCodeNode(payload.width??'body',payload.language??null);
  if(payload.text)code.append($createTextNode(payload.text));
  node.insertAfter(code);
  code.selectEnd();
  return true;
 },COMMAND_PRIORITY_EDITOR);
}
