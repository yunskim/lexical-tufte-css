import {$getRoot,$getNodeByKey,$isElementNode,type LexicalEditor,type LexicalNode,type NodeKey} from 'lexical';
import {NODE_SCHEMA} from '@lexical-tufte/document';

export type StructureIssue={code:string;key:NodeKey;path:string;message:string};
/** Non-destructive inspection of the layout boundary; not a publication/schema validator. */
export function $inspectEditorStructure():StructureIssue[]{
 const issues:StructureIssue[]=[];
 const add=(node:LexicalNode,path:string,code:string,message:string)=>issues.push({code,key:node.getKey(),path,message});
 function visit(node:LexicalNode,path:string){
  if(!$isElementNode(node))return;
  const type=node.getType(),children=node.getChildren(),types=children.map(child=>child.getType());
  if(['tufte-section','tufte-figure','tufte-table-layout'].includes(type)){
   const allowed=NODE_SCHEMA[type]?.children??[];
   for(const [i,child]of children.entries())if(!allowed.includes(child.getType()))add(node,`${path}.children[${i}]`,'INVALID_CHILD','이 위치에 허용되지 않는 내용이 있습니다.');
   if(children.length===0)add(node,path,'EMPTY_NODE','비어 있는 구조입니다. 내용을 추가하거나 실행 취소하세요.');
  }
  if(type==='tufte-figure'){
   const images=types.filter(t=>t==='tufte-inline-image'||t==='tufte-imagequilt');
   if(images.length!==1||!['tufte-inline-image','tufte-imagequilt'].includes(types[0]??'')||types.filter(t=>t==='tufte-caption').length>1)add(node,path,'INVALID_FIGURE','그림은 이미지 하나로 시작하고 캡션은 하나까지 허용합니다.');
   if(children.some(child=>child.getType()==='tufte-sidenote'))add(node,path,'INVALID_FIGURE_NOTE','그림에 직접 연결하는 주석은 여백 주석이어야 합니다.');
  }
  if(type==='tufte-table-layout'&&(types.length!==1||types[0]!=='table'))add(node,path,'INVALID_TABLE_LAYOUT','표 영역에는 표 하나가 필요합니다.');
  children.forEach((child,i)=>visit(child,`${path}.children[${i}]`));
 }
 visit($getRoot(),'$.lexicalState.root');return issues;
}
export function inspectEditorStructure(editor:LexicalEditor):StructureIssue[]{return editor.getEditorState().read($inspectEditorStructure);}
/** Focus a surviving issue container. Stale keys are harmless and never mutate content. */
export function focusStructureIssue(editor:LexicalEditor,key:NodeKey):boolean{
 let found=false;
 editor.update(()=>{const node=$getNodeByKey(key);if(node&&$isElementNode(node)){node.selectStart();found=true;}},{discrete:true});
 if(found)editor.focus();return found;
}
