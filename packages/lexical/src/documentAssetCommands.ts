import {
 $addUpdateTag,$getNodeByKey,createCommand,COMMAND_PRIORITY_EDITOR,
 HISTORY_PUSH_TAG,type LexicalCommand,type LexicalEditor
} from 'lexical';
import {isIdentifier,isSafeURL,type AssetRef} from '@lexical-tufte/document';
import {InlineImageNode} from './InlineImageNode.js';
import {$getContainingNote} from './noteOperations.js';

export type ConnectTufteDocumentAsset={
 /** Exact image and note captured when a chooser opened, not DOM focus. */
 imageKey:string;
 noteId:string;
 /** Optional full image properties snapshot; rejects stale modal choices. */
 expectedImage?:string;
 assetId:string;
 /** Omit to retain existing alt; explicit empty alt marks a decorative image. */
 alt?:string;
 /** Synchronous result only; command return value means handled, not success. */
 onResult?:(applied:boolean)=>void;
};
export const CONNECT_TUFTE_DOCUMENT_ASSET_COMMAND:LexicalCommand<ConnectTufteDocumentAsset>=
 createCommand('CONNECT_TUFTE_DOCUMENT_ASSET');

function validAsset(asset:AssetRef):boolean{
 const validDimension=(value:unknown)=>value===undefined||
  (Number.isSafeInteger(value)&&(value as number)>0);
 return isIdentifier(asset.id)&&isSafeURL(asset.src,'image')&&
  typeof asset.mimeType==='string'&&/^image\/[a-zA-Z0-9.+-]+$/.test(asset.mimeType)&&
  validDimension(asset.width)&&validDimension(asset.height);
}

/**
 * The host supplies its current canonical document-local asset catalog.
 * The command never searches an AssetProvider, uploads, or edits the catalog.
 * Register once per editor; the callback reads the latest controlled value.
 */
export function registerDocumentAssetCommands(
 editor:LexicalEditor,
 getAssets:()=>readonly AssetRef[],
 onNotice?:(message:string)=>void
):()=>void{
 if(!editor.hasNodes([InlineImageNode]))throw Error('Document asset commands require TUFTE_NODES');
 return editor.registerCommand(CONNECT_TUFTE_DOCUMENT_ASSET_COMMAND,payload=>{
  const finish=(message:string,success=false)=>{
   onNotice?.(message);
   payload?.onResult?.(success);
   return true;
  };
  if(!editor.isEditable())return finish('읽기 전용 문서는 변경할 수 없습니다.');
  if(editor.isComposing())return finish('조합 입력 중에는 문서 자산을 연결할 수 없습니다.');
  if(!payload||typeof payload.assetId!=='string'||typeof payload.imageKey!=='string'||
   typeof payload.noteId!=='string'||(payload.expectedImage!==undefined&&typeof payload.expectedImage!=='string')||
   (payload.alt!==undefined&&typeof payload.alt!=='string'))
   return finish('잘못된 문서 이미지 연결 요청입니다.');
  let asset:AssetRef|undefined;
  try{asset=getAssets().find(item=>item.id===payload.assetId);}catch{
   return finish('문서 자산 목록을 읽을 수 없습니다.');
  }
  if(!asset||!validAsset(asset))return finish('문서에 등록된 유효한 이미지 자산이 없습니다.');
  const image=$getNodeByKey(payload.imageKey);
  if(!(image instanceof InlineImageNode))return finish('연결 대상 이미지가 변경되었습니다. 다시 선택하세요.');
  const note=$getContainingNote(image);
  if(!note||note.getNoteId()!==payload.noteId)
   return finish('연결 대상 이미지가 변경되었습니다. 다시 선택하세요.');
  const previous=image.getImageProperties();
  if(payload.expectedImage!==undefined&&payload.expectedImage!==JSON.stringify(previous))
   return finish('연결 대상 이미지가 변경되었습니다. 다시 선택하세요.');
  const alt=payload.alt??previous.alt;
  // InlineImageNode validates the asset and presentation before mutation.
  $addUpdateTag(HISTORY_PUSH_TAG);
  image.setDocumentAsset({id:asset.id,src:asset.src,width:asset.width,height:asset.height})
   .setImagePresentation(alt,asset.width,asset.height);
  return finish('선택한 노트 이미지에 문서 자산을 연결했습니다.',true);
 },COMMAND_PRIORITY_EDITOR);
}
