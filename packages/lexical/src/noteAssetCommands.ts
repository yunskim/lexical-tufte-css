import {$addUpdateTag,createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,
 type LexicalCommand,type LexicalEditor} from 'lexical';
import {DOCUMENT_LIMITS,isIdentifier,isSafeURL,type AssetRef,type Diagnostic} from '@lexical-tufte/document';
import {$createInlineImageNode} from './InlineImageNode.js';
import {$getSelectedTufteNoteImage} from './noteCommands.js';

/**
 * Attach the selected note image to an asset already present in the host's
 * canonical document assets list. The payload is an ID, not caller-supplied
 * metadata. The host must read the same asset catalog when saving/publishing.
 */
export const ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND:LexicalCommand<string>=
 createCommand('ASSIGN_TUFTE_NOTE_IMAGE_ASSET');
/** Detach while retaining the currently visible URL, alternative text and dimensions. */
export const DETACH_TUFTE_NOTE_IMAGE_ASSET_COMMAND:LexicalCommand<void>=
 createCommand('DETACH_TUFTE_NOTE_IMAGE_ASSET');
/** null clears one optional intrinsic dimension; omitted fields stay unchanged. */
export type TufteNoteImageDimensions={width?:number|null;height?:number|null};
export const SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND:LexicalCommand<TufteNoteImageDimensions>=
 createCommand('SET_TUFTE_NOTE_IMAGE_DIMENSIONS');

const validDimension=(value:unknown):value is number=>
 typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const validAsset=(value:unknown):value is AssetRef=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)return false;
 const a=value as Record<string,unknown>;
 const fields=['id','src','mimeType','alt','width','height','byteLength','sha256'];
 return Object.keys(a).every(key=>fields.includes(key))&&
  isIdentifier(a.id)&&isSafeURL(a.src,'image')&&
  typeof a.mimeType==='string'&&/^image\/[a-zA-Z0-9.+-]+$/.test(a.mimeType)&&
  (a.alt===undefined||typeof a.alt==='string')&&
  (a.width===undefined||validDimension(a.width))&&
  (a.height===undefined||validDimension(a.height))&&
  (a.byteLength===undefined||validDimension(a.byteLength))&&
  (a.sha256===undefined||typeof a.sha256==='string'&&/^[0-9a-f]{64}$/.test(a.sha256));
};

/** All asset metadata must come from the containing document, not from UI forms. */
export function registerNoteAssetCommands(
 editor:LexicalEditor,
 getAssets:()=>readonly AssetRef[],
 onDiagnostic?:(diagnostic:Diagnostic)=>void
):()=>void{
 if(typeof getAssets!=='function')throw Error('Note asset commands require document asset catalog');
 const reject=(code:string,message:string)=>{
  onDiagnostic?.({code,path:'$.selection',message});return true;
 };
 const selected=()=>{
  if(editor.isComposing())return null;
  return $getSelectedTufteNoteImage();
 };
 const catalog=():readonly AssetRef[]|null=>{
  try{
   const entries=getAssets();
   if(!Array.isArray(entries)||entries.length>DOCUMENT_LIMITS.assets)return null;
   const ids=new Set<string>();
   for(const asset of entries){
    if(!validAsset(asset)||ids.has(asset.id))return null;
    ids.add(asset.id);
   }
   return entries;
  }catch{return null;}
 };
 const registrations=[
  editor.registerCommand(ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND,assetId=>{
   if(!isIdentifier(assetId))
    return reject('INVALID_NOTE_ASSET_ID','관리 자산 ID가 올바르지 않습니다.');
   const target=selected();
   if(!target)return reject('INVALID_NOTE_IMAGE_SELECTION',
    '수정할 노트 이미지를 명확히 선택하세요.');
   const entries=catalog();
   if(!entries)return reject('INVALID_NOTE_ASSET_CATALOG',
    '문서 자산 목록을 읽거나 검증할 수 없습니다.');
   const asset=entries.find(item=>item.id===assetId);
   if(!asset)return reject('MISSING_NOTE_ASSET',
    '현재 문서 자산 목록에 해당 ID가 없습니다.');
   const old=target.image.exportJSON();
   if(old.assetId===asset.id&&old.src===asset.src&&
      old.width===asset.width&&old.height===asset.height)return true;
   $addUpdateTag(HISTORY_PUSH_TAG);
   // Atomic replacement. Never leave the old assetId with a new URL.
   target.image.replace($createInlineImageNode(
    asset.src,old.alt,asset.id,asset.width,asset.height
   ));
   target.note.selectEnd();
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(DETACH_TUFTE_NOTE_IMAGE_ASSET_COMMAND,()=>{
   const target=selected();
   if(!target)return reject('INVALID_NOTE_IMAGE_SELECTION',
    '수정할 노트 이미지를 명확히 선택하세요.');
   const old=target.image.exportJSON();
   if(old.assetId===undefined)return true;
   $addUpdateTag(HISTORY_PUSH_TAG);
   target.image.replace($createInlineImageNode(
    old.src,old.alt,undefined,old.width,old.height
   ));
   target.note.selectEnd();
   return true;
  },COMMAND_PRIORITY_EDITOR),
  editor.registerCommand(SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND,payload=>{
   if(!payload||typeof payload!=='object'||Array.isArray(payload)||
      Object.keys(payload).some(key=>key!=='width'&&key!=='height')||
      !Object.hasOwn(payload,'width')&&!Object.hasOwn(payload,'height')||
      Object.hasOwn(payload,'width')&&payload.width!==null&&!validDimension(payload.width)||
      Object.hasOwn(payload,'height')&&payload.height!==null&&!validDimension(payload.height))
    return reject('INVALID_NOTE_IMAGE_DIMENSIONS',
     '이미지 크기는 양의 정수 또는 값 해제를 위한 null이어야 합니다.');
   const target=selected();
   if(!target)return reject('INVALID_NOTE_IMAGE_SELECTION',
    '수정할 노트 이미지를 명확히 선택하세요.');
   const old=target.image.exportJSON();
   const width=Object.hasOwn(payload,'width')?payload.width??undefined:old.width;
   const height=Object.hasOwn(payload,'height')?payload.height??undefined:old.height;
   if(old.assetId!==undefined){
    const entries=catalog();
    if(!entries)return reject('INVALID_NOTE_ASSET_CATALOG',
     '문서 자산 목록을 읽거나 검증할 수 없습니다.');
    const asset=entries.find(item=>item.id===old.assetId);
    if(!asset)return reject('MISSING_NOTE_ASSET',
     '현재 문서 자산 목록에 해당 ID가 없습니다.');
    if(asset.src!==old.src||
       width!==undefined&&asset.width!==undefined&&width!==asset.width||
       height!==undefined&&asset.height!==undefined&&height!==asset.height)
     return reject('NOTE_ASSET_MISMATCH',
      '이미지 URL 또는 크기가 문서의 관리 자산과 일치하지 않습니다.');
   }
   if(width===old.width&&height===old.height)return true;
   $addUpdateTag(HISTORY_PUSH_TAG);
   target.image.replace($createInlineImageNode(
    old.src,old.alt,old.assetId,width,height
   ));
   target.note.selectEnd();
   return true;
  },COMMAND_PRIORITY_EDITOR)
 ];
 return ()=>registrations.forEach(dispose=>dispose());
}
