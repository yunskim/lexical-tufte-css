import {$applyNodeReplacement, DecoratorNode, type NodeKey, type SerializedLexicalNode, type DOMExportOutput} from 'lexical';
export type SerializedInlineImage = SerializedLexicalNode & {type: 'tufte-inline-image'; version: 1; src: string; alt: string};
function safeImageURL(src: string): boolean {
  return /^https?:\/\//i.test(src) || (src.startsWith('/') && !src.startsWith('//') && !src.includes('\\'));
}
export class InlineImageNode extends DecoratorNode<null> {
  __src: string; __alt: string;
  static getType(): string { return 'tufte-inline-image'; }
  static clone(node: InlineImageNode): InlineImageNode { return new InlineImageNode(node.__src,node.__alt,node.__key); }
  constructor(src = '', alt = '', key?: NodeKey) { super(key); this.__src=src; this.__alt=alt; }
  isInline(): true { return true; }
  decorate(): null { return null; }
  createDOM(): HTMLElement {
    const img=document.createElement('img');
    const src=this.getLatest().__src;
    if (!safeImageURL(src)) throw Error('Unsupported image URL');
    img.src=src; img.alt=this.getLatest().__alt; img.contentEditable='false';
    return img;
  }
  updateDOM(previous: InlineImageNode): boolean { return previous.__src!==this.__src || previous.__alt!==this.__alt; }
  exportDOM(): DOMExportOutput { return {element:this.createDOM()}; }
  exportJSON(): SerializedInlineImage { return {...super.exportJSON(),type:'tufte-inline-image',version:1,src:this.getLatest().__src,alt:this.getLatest().__alt}; }
  static importJSON(value: SerializedInlineImage): InlineImageNode {
    if(value.version!==1 || typeof value.src!=='string' || typeof value.alt!=='string' || !safeImageURL(value.src)) throw Error('Unsupported image');
    return $createInlineImageNode(value.src,value.alt);
  }
}
export function $createInlineImageNode(src: string, alt: string): InlineImageNode { return $applyNodeReplacement(new InlineImageNode(src,alt)); }
