import {$applyNodeReplacement,ElementNode,type EditorConfig,type NodeKey,type SerializedElementNode} from 'lexical';

export type CodeWidth='body'|'fullwidth';
export type SerializedTufteCode=SerializedElementNode&{type:'tufte-code';version:1;width:CodeWidth;language:string|null};
/** Structural pre/code wrapper; text, tab, linebreak and code-highlight are children. */
export class TufteCodeNode extends ElementNode {
 __width:CodeWidth;
 __language:string|null;
 static getType():string{return 'tufte-code';}
 static clone(node:TufteCodeNode):TufteCodeNode{return new TufteCodeNode(node.__width,node.__language,node.__key);}
 constructor(width:CodeWidth='body',language:string|null=null,key?:NodeKey){super(key);this.__width=width;this.__language=language;}
 getWidth():CodeWidth{return this.getLatest().__width;}
 getLanguage():string|null{return this.getLatest().__language;}
 setWidth(width:CodeWidth):this{if(width!=='body'&&width!=='fullwidth')throw Error('Invalid code width');this.getWritable().__width=width;return this;}
 setLanguage(language:string|null):this{if(language!==null&&(!/^[A-Za-z0-9_+-]{1,64}$/.test(language)))throw Error('Invalid code language');this.getWritable().__language=language;return this;}
 createDOM(_config:EditorConfig):HTMLElement{
  const pre=document.createElement('pre');
  if(this.__width==='fullwidth')pre.className='fullwidth';
  if(this.__language!==null)pre.dataset.language=this.__language;
  return pre;
 }
 updateDOM(previous:TufteCodeNode,dom:HTMLElement):false{
  if(previous.__width!==this.__width)dom.classList.toggle('fullwidth',this.__width==='fullwidth');
  if(previous.__language!==this.__language){
   if(this.__language===null)delete dom.dataset.language;
   else dom.dataset.language=this.__language;
  }
  return false;
 }
 exportJSON():SerializedTufteCode{return {...super.exportJSON(),type:'tufte-code',version:1,width:this.getWidth(),language:this.getLanguage()};}
 static importJSON(value:SerializedTufteCode):TufteCodeNode{
  if(value.version!==1||!['body','fullwidth'].includes(value.width)||!(value.language===null||typeof value.language==='string'&&/^[A-Za-z0-9_+-]{1,64}$/.test(value.language)))throw Error('Unsupported code block');
  return $createTufteCodeNode(value.width,value.language).updateFromJSON(value);
 }
}
export function $createTufteCodeNode(width:CodeWidth='body',language:string|null=null):TufteCodeNode{
 if(width!=='body'&&width!=='fullwidth')throw Error('Invalid code width');
 if(language!==null&&!/^[A-Za-z0-9_+-]{1,64}$/.test(language))throw Error('Invalid code language');
 return $applyNodeReplacement(new TufteCodeNode(width,language));
}
