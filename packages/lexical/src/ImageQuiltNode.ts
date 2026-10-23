import {isSafeURL,isIdentifier,type HostAssetLocator} from '@lexical-tufte/document';
import {$applyNodeReplacement,DecoratorNode,type NodeKey,type SerializedLexicalNode,type DOMExportOutput} from 'lexical';

export type SerializedImageQuilt=SerializedLexicalNode&{type:'tufte-imagequilt';version:1;src:string;alt:string;assetId?:string;hostAsset?:HostAssetLocator;width:number;height:number};
function validate(src:unknown,alt:unknown,assetId:unknown,width:unknown,height:unknown,hostAsset?:HostAssetLocator):void{
 if(!isSafeURL(src,'image')||typeof alt!=='string'||width===undefined||height===undefined
  ||(assetId!==undefined&&!isIdentifier(assetId))
  ||(width!==undefined&&(!Number.isSafeInteger(width)||(width as number)<=0))
  ||(height!==undefined&&(!Number.isSafeInteger(height)||(height as number)<=0)))throw Error('Invalid ImageQuilt properties');
 if(hostAsset!==undefined&&(assetId!==undefined||typeof hostAsset.namespace!=='string'||!hostAsset.namespace.trim()||typeof hostAsset.assetId!=='string'||!hostAsset.assetId.trim()||(hostAsset.revisionId!==undefined&&(typeof hostAsset.revisionId!=='string'||!hostAsset.revisionId.trim()))||Object.keys(hostAsset).some(k=>!['namespace','assetId','revisionId'].includes(k))))throw Error('Invalid host asset locator');
}
/** Inserts an already composed ImageQuilt asset; not an image-composition editor. */
export class ImageQuiltNode extends DecoratorNode<null>{
 __src:string;__alt:string;__assetId?:string;__hostAsset?:HostAssetLocator;__width:number;__height:number;
 static getType():string{return 'tufte-imagequilt';}
 static clone(node:ImageQuiltNode):ImageQuiltNode{return new ImageQuiltNode(node.__src,node.__alt,node.__assetId,node.__width,node.__height,node.__key,node.__hostAsset);}
 constructor(src:string,alt:string,assetId?:string,width:number=0,height:number=0,key?:NodeKey,hostAsset?:HostAssetLocator){
  super(key);this.__src=src;this.__alt=alt;this.__assetId=assetId;this.__hostAsset=hostAsset===undefined?undefined:{...hostAsset};this.__width=width;this.__height=height;
 }
 decorate():null{return null;}
 isInline():false{return false;}
 private image():HTMLImageElement{
  const n=this.getLatest();const img=document.createElement('img');
  img.src=n.__src;img.alt=n.__alt;img.className='imagequilt';
  if(n.__width!==undefined)img.width=n.__width;
  if(n.__height!==undefined)img.height=n.__height;
  return img;
 }
 createDOM():HTMLElement{const img=this.image();img.contentEditable='false';return img;}
 updateDOM(previous:ImageQuiltNode):boolean{
  return previous.__src!==this.__src||previous.__alt!==this.__alt||previous.__width!==this.__width||previous.__height!==this.__height;
 }
 exportDOM():DOMExportOutput{return {element:this.image()};}
 exportJSON():SerializedImageQuilt{
  const n=this.getLatest();
  return {...super.exportJSON(),type:'tufte-imagequilt',version:1,src:n.__src,alt:n.__alt,
   ...(n.__assetId===undefined?{}:{assetId:n.__assetId}),
   ...(n.__hostAsset===undefined?{}:{hostAsset:{...n.__hostAsset}}),
   width:n.__width,height:n.__height};
 }
 static importJSON(value:SerializedImageQuilt):ImageQuiltNode{
  if(value.version!==1)throw Error('Unsupported ImageQuilt version');
  validate(value.src,value.alt,value.assetId,value.width,value.height,value.hostAsset);
  return $createImageQuiltNode(value.src,value.alt,value.assetId,value.width,value.height,value.hostAsset);
 }
}
export function $createImageQuiltNode(src:string,alt:string,assetId?:string,width:number=0,height:number=0,hostAsset?:HostAssetLocator):ImageQuiltNode{
 validate(src,alt,assetId,width,height,hostAsset);
 return $applyNodeReplacement(new ImageQuiltNode(src,alt,assetId,width,height,undefined,hostAsset));
}
