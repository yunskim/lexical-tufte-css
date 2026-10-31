import {isSafeURL,isIdentifier,type HostAssetLocator} from '@lexical-tufte/document';
import {$applyNodeReplacement, DecoratorNode, type NodeKey, type SerializedLexicalNode, type DOMExportOutput} from 'lexical';
function assertImageProperties(src: unknown, alt: unknown, assetId: unknown, width: unknown, height: unknown, hostAsset?: HostAssetLocator): void {
  if (!isSafeURL(src,'image') || typeof alt!=='string'
    || (assetId!==undefined && !isIdentifier(assetId))
    || (width!==undefined && (!Number.isSafeInteger(width) || (width as number)<=0))
    || (height!==undefined && (!Number.isSafeInteger(height) || (height as number)<=0))) {
    throw Error('Invalid image properties');
  }
  if(hostAsset!==undefined&&(
    assetId!==undefined||typeof hostAsset.namespace!=='string'||!hostAsset.namespace.trim()||
    typeof hostAsset.assetId!=='string'||!hostAsset.assetId.trim()||
    (hostAsset.revisionId!==undefined&&(typeof hostAsset.revisionId!=='string'||!hostAsset.revisionId.trim()))||
    Object.keys(hostAsset).some(k=>!['namespace','assetId','revisionId'].includes(k))
  ))throw Error('Invalid host asset locator');
}
export type SerializedInlineImage = SerializedLexicalNode & {type: 'tufte-inline-image'; version: 1; src: string; alt: string; assetId?: string; hostAsset?: HostAssetLocator; width?: number; height?: number};
export class InlineImageNode extends DecoratorNode<null> {
  __src: string; __alt: string; __assetId?: string; __hostAsset?: HostAssetLocator; __width?: number; __height?: number;
  static getType(): string { return 'tufte-inline-image'; }
  static clone(node: InlineImageNode): InlineImageNode { return new InlineImageNode(node.__src,node.__alt,node.__key,node.__assetId,node.__width,node.__height,node.__hostAsset); }
  constructor(src = '', alt = '', key?: NodeKey, assetId?: string, width?: number, height?: number, hostAsset?: HostAssetLocator) { super(key); this.__src=src; this.__alt=alt; this.__assetId=assetId; this.__hostAsset=hostAsset===undefined?undefined:{...hostAsset}; this.__width=width; this.__height=height; }
  /** Read-only image properties for host/editor inspectors; never return live metadata. */
  getImageProperties(): Omit<SerializedInlineImage,'type'|'version'> {
    const node=this.getLatest();
    return {src:node.__src,alt:node.__alt,
      ...(node.__assetId===undefined?{}:{assetId:node.__assetId}),
      ...(node.__hostAsset===undefined?{}:{hostAsset:{...node.__hostAsset}}),
      ...(node.__width===undefined?{}:{width:node.__width}),
      ...(node.__height===undefined?{}:{height:node.__height})};
  }
  /** Validate both fields before mutation, preserving any asset/host identity. */
  setImagePresentation(alt:string,width?:number,height?:number):this {
    const current=this.getLatest();
    assertImageProperties(current.__src,alt,current.__assetId,width,height,current.__hostAsset);
    const writable=this.getWritable();
    writable.__alt=alt;writable.__width=width;writable.__height=height;
    return this;
  }
  /** Atomically bind a local catalog asset while retaining the image's alt text. */
  setDocumentAsset(asset:{id:string;src:string;width?:number;height?:number}):this {
    const current=this.getLatest();
    assertImageProperties(asset.src,current.__alt,asset.id,asset.width,asset.height);
    const writable=this.getWritable();
    writable.__src=asset.src;
    writable.__assetId=asset.id;
    writable.__hostAsset=undefined;
    writable.__width=asset.width;
    writable.__height=asset.height;
    return this;
  }
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
  updateDOM(previous: InlineImageNode): boolean { return previous.__src!==this.__src || previous.__alt!==this.__alt || previous.__width!==this.__width || previous.__height!==this.__height || previous.__assetId!==this.__assetId || JSON.stringify(previous.__hostAsset)!==JSON.stringify(this.__hostAsset); }
  exportDOM(): DOMExportOutput { return {element:this.createImageElement()}; }
  exportJSON(): SerializedInlineImage {
    const node=this.getLatest();
    return {...super.exportJSON(),type:'tufte-inline-image',version:1,src:node.__src,alt:node.__alt,
      ...(node.__assetId===undefined?{}:{assetId:node.__assetId}),
      ...(node.__hostAsset===undefined?{}:{hostAsset:{...node.__hostAsset}}),
      ...(node.__width===undefined?{}:{width:node.__width}),
      ...(node.__height===undefined?{}:{height:node.__height})};
  }
  static importJSON(value: SerializedInlineImage): InlineImageNode {
    if(value.version!==1) throw Error('Unsupported image version');
    assertImageProperties(value.src,value.alt,value.assetId,value.width,value.height,value.hostAsset);
    return $createInlineImageNode(value.src,value.alt,value.assetId,value.width,value.height,value.hostAsset);
  }
}
export function $createInlineImageNode(src: string, alt: string, assetId?: string, width?: number, height?: number, hostAsset?: HostAssetLocator): InlineImageNode { assertImageProperties(src,alt,assetId,width,height,hostAsset); return $applyNodeReplacement(new InlineImageNode(src,alt,undefined,assetId,width,height,hostAsset)); }
