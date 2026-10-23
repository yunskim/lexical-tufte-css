import {DOCUMENT_LIMITS,isIdentifier,isSafeURL} from './schema.js';
import type {AssetRef} from './types.js';

export type ImageAssetRegistration={
 id:string;src:string;mimeType:string;alt?:string;width?:number;height?:number;
};
export type ImageCatalogResult=
 | {ok:true;assets:AssetRef[]}
 | {ok:false;code:'INVALID_ASSET'|'DUPLICATE_ASSET'|'ASSET_LIMIT';message:string};

const reject=(code:ImageCatalogResult extends never?never:'INVALID_ASSET'|'DUPLICATE_ASSET'|'ASSET_LIMIT',message:string):ImageCatalogResult=>
 ({ok:false,code,message});
const dimensions=(value:unknown)=>value===undefined||(Number.isSafeInteger(value)&&(value as number)>0);

/** A document-local image catalog entry, not an upload or host-asset mutation.
 * Reject first, then construct a fresh array: callers keep their previous
 * catalog and Lexical document unchanged on every failed registration.
 */
export function registerImageAsset(existing:readonly AssetRef[],input:unknown):ImageCatalogResult{
 if(!Array.isArray(existing)||!existing.every(asset=>asset!==null&&typeof asset==='object'&&typeof asset.id==='string'))
  return reject('INVALID_ASSET','기존 자산 목록이 올바르지 않습니다.');
 if(existing.length>=DOCUMENT_LIMITS.assets)
  return reject('ASSET_LIMIT','문서 이미지 자산 최대 개수에 도달했습니다.');
 if(input===null||typeof input!=='object'||Array.isArray(input)||
  (Object.getPrototypeOf(input)!==Object.prototype&&Object.getPrototypeOf(input)!==null))
  return reject('INVALID_ASSET','등록할 이미지 자산 정보가 올바르지 않습니다.');
 const descriptors=Object.getOwnPropertyDescriptors(input);
 if(Reflect.ownKeys(input).some(key=>typeof key!=='string'||!['id','src','mimeType','alt','width','height'].includes(key)||
  !Object.hasOwn(descriptors[key],'value')))
  return reject('INVALID_ASSET','등록할 이미지 자산의 속성이 올바르지 않습니다.');
 const record=input as Record<string,unknown>;
 if(!isIdentifier(record.id)||!isSafeURL(record.src,'image')||
  typeof record.mimeType!=='string'||!/^image\/[A-Za-z0-9.+-]+$/.test(record.mimeType)||
  (record.alt!==undefined&&typeof record.alt!=='string')||
  !dimensions(record.width)||!dimensions(record.height))
  return reject('INVALID_ASSET','이미지 ID, 경로, MIME 타입 또는 크기를 확인하세요.');
 if(existing.some(asset=>asset.id===record.id))
  return reject('DUPLICATE_ASSET','같은 ID의 이미지 자산이 이미 등록되어 있습니다.');
 const asset:AssetRef={id:record.id,src:record.src,mimeType:record.mimeType,
  ...(record.alt===undefined?{}:{alt:record.alt as string}),
  ...(record.width===undefined?{}:{width:record.width as number}),
  ...(record.height===undefined?{}:{height:record.height as number})};
 return {ok:true,assets:[...existing.map(asset=>({...asset})),asset]};
}
