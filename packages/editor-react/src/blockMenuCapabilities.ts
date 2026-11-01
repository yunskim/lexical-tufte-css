import {$isElementNode,type LexicalNode} from 'lexical';
import {canonicalBlockType,NoteNode} from '@lexical-tufte/lexical';
import {NODE_SCHEMA} from '@lexical-tufte/document';

export function canOpenBlockMenu(node:LexicalNode):boolean{
 let hasEditableBlock=false;
 for(let current:LexicalNode|null=node;current;current=current.getParent()){
  if(current instanceof NoteNode)return false;
  const type=canonicalBlockType(current.getType());
  if(['table','tablerow','tablecell','figure','image'].includes(type))return false;
  if(['paragraph','heading','quote'].includes(type))hasEditableBlock=true;
  if(type==='root')break;
 }
 return hasEditableBlock;
}
export type BlockMenuCapabilities={paragraph:boolean;heading:boolean;insert:boolean};
export const NO_BLOCK_MENU_ACTIONS:BlockMenuCapabilities={paragraph:false,heading:false,insert:false};
/** Match the structural preconditions of section/list/quotation commands before showing actions. */
export function blockMenuCapabilities(node:LexicalNode):BlockMenuCapabilities{
 if(!canOpenBlockMenu(node))return NO_BLOCK_MENU_ACTIONS;
 let selected:LexicalNode|null=node;
 while(selected&&!['paragraph','heading','quote'].includes(canonicalBlockType(selected.getType())))selected=selected.getParent();
 if(!selected)return NO_BLOCK_MENU_ACTIONS;
 const selectedBlock=selected;
 const parent=selectedBlock.getParent();
 const children=$isElementNode(selectedBlock)?selectedBlock.getChildren():[];
 const canConvert=(target:'paragraph'|'heading')=>
  (canonicalBlockType(selectedBlock.getType())==='paragraph'||canonicalBlockType(selectedBlock.getType())==='heading')&&
  Boolean(parent&&NODE_SCHEMA[canonicalBlockType(parent.getType())]?.children?.includes(target))&&
  children.every(child=>NODE_SCHEMA[target]?.children?.includes(canonicalBlockType(child.getType())));
 let section:LexicalNode|null=node;
 while(section&&canonicalBlockType(section.getType())!=='tufte-section')section=section.getParent();
 let direct:LexicalNode=node;
 if(section){
  while(direct.getParent()&&!direct.getParent()!.is(section))direct=direct.getParent()!;
 }
 const insert=Boolean(section&&section.getParent()?.getType()==='root'&&
  direct.getParent()?.is(section)&&NODE_SCHEMA['tufte-section']?.children?.includes(canonicalBlockType(direct.getType())));
 return {paragraph:canConvert('paragraph'),heading:canConvert('heading'),insert};
}
