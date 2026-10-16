import {isSafeURL,isIdentifier} from '@lexical-tufte/document';
import {$applyNodeReplacement, DecoratorNode, type NodeKey, type SerializedLexicalNode, type DOMExportOutput} from 'lexical';
function assertImageProperties(src: unknown, alt: unknown, assetId: unknown, width: unknown, height: unknown): void {
  if (!isSafeURL(src,'image') || typeof alt!=='string'
    || (assetId!==undefined && !isIdentifier(assetId))
    || (width!==undefined && (!Number.isSafeInteger(width) || (width as number)<=0))
    || (height!==undefined && (!Number.isSafeInteger(height) || (height as number)<=0))) {
    throw Error('Invalid image properties');
  }
}
export type SerializedInlineImage = SerializedLexicalNode & {type: 'tufte-inline-image'; version: 1; src: string; alt: string; assetId?: string; width?: number; height?: number};
export class InlineImageNode extends DecoratorNode<null> {
  __src: string; __alt: string; __assetId?: string; __width?: number; __height?: number;
  static getType(): string { return 'tufte-inline-image'; }
  static clone(node: InlineImageNode): InlineImageNode { return new InlineImageNode(node.__src,node.__alt,node.__key,node.__assetId,node.__width,node.__height); }
  constructor(src = '', alt = '', key?: NodeKey, assetId?: string, width?: number, height?: number) { super(key); this.__src=src; this.__alt=alt; this.__assetId=assetId; this.__width=width; this.__height=height; }
  isInline(): true { return true; }
  decorate(): null { return null; }
  private createImageElement(): HTMLImageElement {
    const img=document.createElement('img');
    const src=this.getLatest().__src;
    if (!isSafeURL(src,'image')) throw Error('Unsupported image URL');
    img.src=src; img.alt=this.getLatest().__alt; if(this.getLatest().__width!==undefined) img.width=this.getLatest().__width!; if(this.getLatest().__height!==undefined) img.height=this.getLatest().__height!;
    return img;
  }
  createDOM(): HTMLElement {
    const img=this.createImageElement();img.contentEditable='false';return img;
  }
  updateDOM(previous: InlineImageNode): boolean { return previous.__src!==this.__src || previous.__alt!==this.__alt || previous.__width!==this.__width || previous.__height!==this.__height; }
  exportDOM(): DOMExportOutput { return {element:this.createImageElement()}; }
  exportJSON(): SerializedInlineImage { return {...super.exportJSON(),type:'tufte-inline-image',version:1,src:this.getLatest().__src,alt:this.getLatest().__alt,...(this.getLatest().__assetId===undefined?{}:{assetId:this.getLatest().__assetId}),...(this.getLatest().__width===undefined?{}:{width:this.getLatest().__width}),...(this.getLatest().__height===undefined?{}:{height:this.getLatest().__height})}; }
  static importJSON(value: SerializedInlineImage): InlineImageNode {
    if(value.version!==1) throw Error('Unsupported image version');
    assertImageProperties(value.src,value.alt,value.assetId,value.width,value.height);
    return $createInlineImageNode(value.src,value.alt,value.assetId,value.width,value.height);
  }
}
export function $createInlineImageNode(src: string, alt: string, assetId?: string, width?: number, height?: number): InlineImageNode { assertImageProperties(src,alt,assetId,width,height); return $applyNodeReplacement(new InlineImageNode(src,alt,undefined,assetId,width,height)); }
