import {$addUpdateTag,$createTextNode,$getSelection,$isRangeSelection,$isNodeSelection,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor,type LexicalNode} from 'lexical';
import {NODE_SCHEMA,isSafeURL,type Diagnostic} from '@lexical-tufte/document';
import {SectionNode,FigureNode,CaptionNode,$createFigureNode,$createCaptionNode,type FigureWidth} from './LayoutNodes.js';
import {InlineImageNode,$createInlineImageNode} from './InlineImageNode.js';
import {$getContainingNote} from './noteOperations.js';

export type InsertTufteFigure={src:string;alt:string;width?:FigureWidth;caption?:string};
export const INSERT_TUFTE_FIGURE_COMMAND:LexicalCommand<InsertTufteFigure>=createCommand('INSERT_TUFTE_FIGURE');
export const SET_TUFTE_FIGURE_WIDTH_COMMAND:LexicalCommand<FigureWidth>=createCommand('SET_TUFTE_FIGURE_WIDTH');

export function registerFigureCommands(editor:LexicalEditor,onDiagnostic?:(diagnostic:Diagnostic)=>void):()=>void{
 if(!editor.hasNodes([SectionNode,FigureNode,CaptionNode]))throw Error('Figure commands require TUFTE_NODES');
 const reject=(code:string,message:string)=>{onDiagnostic?.({code,path:'$.selection',message});return true;};
 const ancestor=(node:LexicalNode,type:string):LexicalNode|null=>{
  for(let n:LexicalNode|null=node;n;n=n.getParent())if(n.getType()===type)return n;
  return null;
 };
 const selection=()=>{
  const s=$getSelection();
  return $isRangeSelection(s)&&s.isCollapsed()&&!editor.isComposing()&&!$getContainingNote(s.anchor.getNode())?s:null;
 };
 const registrations=[
  editor.registerCommand(INSERT_TUFTE_FIGURE_COMMAND,payload=>{
   if(!payload||!isSafeURL(payload.src,'image')||typeof payload.alt!=='string'
     ||(payload.width!==undefined&&!['body','fullwidth'].includes(payload.width))
     ||(payload.caption!==undefined&&(typeof payload.caption!=='string'||payload.caption.length>2000)))
    return reject('INVALID_FIGURE_PAYLOAD','그림 URL, 대체 텍스트, 너비 또는 설명이 올바르지 않습니다.');
   const s=selection();if(!s)return reject('INVALID_FIGURE_SELECTION','섹션 본문에서 한 삽입 위치를 선택하세요.');
   const section=ancestor(s.anchor.getNode(),'tufte-section');
   if(!(section instanceof SectionNode)||section.getParent()?.getType()!=='root')return reject('INVALID_FIGURE_SELECTION','최상위 섹션 안에서만 그림을 삽입할 수 있습니다.');
   let block:LexicalNode=s.anchor.getNode();
   while(block.getParent()&&!block.getParent()!.is(section))block=block.getParent()!;
   if(!block.getParent()?.is(section)||!NODE_SCHEMA['tufte-section']!.children!.includes(block.getType()))
    return reject('INVALID_FIGURE_SELECTION','유효한 섹션 블록을 선택하세요.');
   $addUpdateTag(HISTORY_PUSH_TAG);
   const figure=$createFigureNode(payload.width??'body').append($createInlineImageNode(payload.src,payload.alt));
   if(payload.caption!==undefined)figure.append($createCaptionNode().append($createTextNode(payload.caption)));
   block.insertAfter(figure);figure.selectEnd();return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(SET_TUFTE_FIGURE_WIDTH_COMMAND,width=>{
   if(width!=='body'&&width!=='fullwidth')return reject('INVALID_FIGURE_WIDTH','그림 너비는 body/fullwidth만 허용합니다.');
   if(editor.isComposing())return reject('INVALID_FIGURE_SELECTION','IME 조합 중에는 그림 너비를 변경할 수 없습니다.');
   const current=$getSelection();
   let figure:LexicalNode|null=null;
   if($isRangeSelection(current)&&current.isCollapsed()&&!$getContainingNote(current.anchor.getNode())){
    const anchor=current.anchor.getNode();
    figure=ancestor(anchor,'tufte-figure');
    if(!figure&&anchor instanceof SectionNode&&current.anchor.type==='element'){
     const candidate=anchor.getChildAtIndex(current.anchor.offset);
     if(candidate instanceof FigureNode)figure=candidate;
    }
   }else if($isNodeSelection(current)){
    const nodes=current.getNodes();
    if(nodes.length===1){
     const node=nodes[0]!;
     if(node instanceof FigureNode)figure=node;
     else if(node instanceof InlineImageNode)figure=ancestor(node,'tufte-figure');
    }
   }
   if(!(figure instanceof FigureNode))return reject('INVALID_FIGURE_SELECTION','그림 안에서만 너비를 변경할 수 있습니다.');
   if(figure.getWidth()===width)return true;
   $addUpdateTag(HISTORY_PUSH_TAG);figure.setWidth(width);return true;
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(dispose=>dispose());
}
