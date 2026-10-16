import {$applyNodeReplacement,ElementNode,type EditorConfig,type NodeKey,type SerializedElementNode} from 'lexical';

export type TufteSpanKind='sans'|'newthought'|'numeral'|'danger';
export type SerializedTufteSpan=SerializedElementNode&{type:'tufte-span';version:1;kind:TufteSpanKind};
const kinds:readonly string[]=['sans','newthought','numeral','danger'];
export class TufteSpanNode extends ElementNode{
 __kind:TufteSpanKind;
 static getType():string{return 'tufte-span';}
 static clone(n:TufteSpanNode):TufteSpanNode{return new TufteSpanNode(n.__kind,n.__key);}
 constructor(kind:TufteSpanKind='sans',key?:NodeKey){super(key);this.__kind=kind;}
 isInline():true{return true;}
 getKind():TufteSpanKind{return this.getLatest().__kind;}
 setKind(kind:TufteSpanKind):this{if(!kinds.includes(kind))throw Error('Invalid Tufte span kind');this.getWritable().__kind=kind;return this;}
 createDOM(_config:EditorConfig):HTMLElement{const e=document.createElement('span');e.className=this.__kind;return e;}
 updateDOM(previous:TufteSpanNode,dom:HTMLElement):false{if(previous.__kind!==this.__kind)dom.className=this.__kind;return false;}
 exportJSON():SerializedTufteSpan{return {...super.exportJSON(),type:'tufte-span',version:1,kind:this.getKind()};}
 static importJSON(s:SerializedTufteSpan):TufteSpanNode{
  if(s.version!==1||!kinds.includes(s.kind))throw Error('Unsupported Tufte span');
  return $createTufteSpanNode(s.kind).updateFromJSON(s);
 }
}
export function $createTufteSpanNode(kind:TufteSpanKind='sans'):TufteSpanNode{
 if(!kinds.includes(kind))throw Error('Invalid Tufte span kind');
 return $applyNodeReplacement(new TufteSpanNode(kind));
}
