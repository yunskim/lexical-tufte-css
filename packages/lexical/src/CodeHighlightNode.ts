import {CodeHighlightNode} from '@lexical/code';
import {$applyNodeReplacement,type NodeKey,type SerializedTextNode} from 'lexical';
export type SerializedTufteCodeHighlight=SerializedTextNode&{highlightType:string|null};
function assertHighlight(value:unknown):asserts value is string|null{
 if(value!==null&&(typeof value!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value)))throw Error('Invalid code highlight type');
}
/** Keep explicit null distinct from an omitted field at the strict storage boundary. */
export class TufteCodeHighlightNode extends CodeHighlightNode {
 static getType():string{return 'code-highlight';}
 static clone(node:TufteCodeHighlightNode):TufteCodeHighlightNode{return new TufteCodeHighlightNode(node.__text,node.__highlightType??null,node.__key);}
 constructor(text='',highlightType:string|null=null,key?:NodeKey){super(text,highlightType,key);}
 setHighlightType(value?:string|null):this{
  const highlight=value??null;assertHighlight(highlight);this.getWritable().__highlightType=highlight;return this;
 }
 static importJSON(value:SerializedTufteCodeHighlight):TufteCodeHighlightNode{
  if(value.version!==1)throw Error('Unsupported code highlight version');assertHighlight(value.highlightType);
  return $createTufteCodeHighlightNode(value.text,value.highlightType).updateFromJSON(value);
 }
}
export function $createTufteCodeHighlightNode(text:string,highlightType:string|null=null):TufteCodeHighlightNode{
 assertHighlight(highlightType);return $applyNodeReplacement(new TufteCodeHighlightNode(text,highlightType));
}
