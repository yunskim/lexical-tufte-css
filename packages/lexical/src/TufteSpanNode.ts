import {$applyNodeReplacement,ElementNode,isHTMLElement,type DOMConversionMap,type DOMExportOutput,type EditorConfig,type ElementFormatType,type LexicalEditor,type NodeKey,type SerializedElementNode} from 'lexical';

export type TufteSpanKind='sans'|'newthought'|'numeral'|'danger';
export type SerializedTufteSpan=SerializedElementNode&{type:'tufte-span';version:1;kind:TufteSpanKind};
const kinds:readonly string[]=['sans','newthought','numeral','danger'];
const alignments:readonly string[]=['left','start','center','right','end','justify'];
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
 exportDOM(editor:LexicalEditor):DOMExportOutput{
  const result=super.exportDOM(editor),format=this.getFormatType();
  if(isHTMLElement(result.element)&&format)result.element.classList.add(`tufte-align-${format}`);
  return result;
 }
 exportJSON():SerializedTufteSpan{return {...super.exportJSON(),type:'tufte-span',version:1,kind:this.getKind()};}
 /** Recognized Tufte spans in our publication/clipboard HTML. A full HTML
  * document still needs the strict importer boundary planned in P2.4. */
 static importDOM():DOMConversionMap{
  return {span:element=>{
   if(![...element.classList].some(name=>kinds.includes(name)))return null;
   return {priority:2,conversion:dom=>{
    const classes=[...dom.classList],matched=classes.filter(name=>kinds.includes(name));
    const alignment=classes.filter(name=>name.startsWith('tufte-align-')).map(name=>name.slice(12));
    if(matched.length!==1||alignment.length>1||
     classes.some(name=>!kinds.includes(name)&&!name.startsWith('tufte-align-'))||
     alignment.some(value=>!alignments.includes(value))||
     [...dom.attributes].some(attr=>!['class','dir','style'].includes(attr.name)))
     throw Error('Unsupported Tufte span HTML attributes');
    const direction=dom.getAttribute('dir');
    if(direction!==null&&direction!=='ltr'&&direction!=='rtl')throw Error('Invalid Tufte span HTML direction');
    // Our exporters use a scoped alignment class. Accept the equivalent
    // single CSS declaration from clipboard HTML without arbitrary CSS.
    const style=dom.style;
    const rawStyle=dom.getAttribute('style');
    if((rawStyle?.trim()&&!/^\s*text-align\s*:\s*(left|start|center|right|end|justify)\s*;?\s*$/i.test(rawStyle))||
     [...style].some(name=>name!=='text-align')||
     (style.textAlign&&!alignments.includes(style.textAlign))||
     style.getPropertyPriority('text-align')||
     (alignment.length&&style.textAlign&&alignment[0]!==style.textAlign))
     throw Error('Unsupported Tufte span HTML style');
    const node=$createTufteSpanNode(matched[0] as TufteSpanKind);
    node.setDirection(direction).setFormat((alignment[0]??style.textAlign??'') as ElementFormatType);
    return {node};
   }};
  }};
 }
 static importJSON(s:SerializedTufteSpan):TufteSpanNode{
  if(s.version!==1||!kinds.includes(s.kind))throw Error('Unsupported Tufte span');
  return $createTufteSpanNode(s.kind).updateFromJSON(s);
 }
}
export function $createTufteSpanNode(kind:TufteSpanKind='sans'):TufteSpanNode{
 if(!kinds.includes(kind))throw Error('Invalid Tufte span kind');
 return $applyNodeReplacement(new TufteSpanNode(kind));
}
