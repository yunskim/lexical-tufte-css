import {isSafeURL} from '@lexical-tufte/document';
import type {AssetLocator,ResolvedAsset} from '@lexical-tufte/editor-ports';

export const HOST_ASSET_REFRESH_MARGIN_MS=60_000;
export const HOST_ASSET_RETRY_BASE_MS=5_000;
export const HOST_ASSET_RETRY_MAX_MS=300_000;

/**
 * Verify every untrusted provider response before modifying canonical Lexical JSON.
 * A missing revision in the locator means "latest", not an unknown fixed revision.
 */
export function isUsableResolvedImage(
 locator:AssetLocator,
 resolved:ResolvedAsset|null,
 now=Date.now()
):resolved is ResolvedAsset{
 return resolved!==null&&
  resolved.assetId===locator.assetId&&
  (!locator.revisionId||resolved.revisionId===locator.revisionId)&&
  typeof resolved.revisionId==='string'&&resolved.revisionId.trim().length>0&&
  typeof resolved.mediaType==='string'&&resolved.mediaType.startsWith('image/')&&
  typeof resolved.url==='string'&&isSafeURL(resolved.url,'image')&&
  (resolved.expiresAt===undefined||
   (typeof resolved.expiresAt==='string'&&
    Number.isFinite(Date.parse(resolved.expiresAt))&&Date.parse(resolved.expiresAt)>now));
}

/** Never schedule a timer for a permanent/unknown expiry; support manual refresh. */
export function nextImageRefreshAt(expiresAt:string|undefined,now=Date.now()):number{
 if(!expiresAt)return Number.POSITIVE_INFINITY;
 const expiry=Date.parse(expiresAt);
 if(!Number.isFinite(expiry)||expiry<=now)return Number.POSITIVE_INFINITY;
 // For short-lived URLs use half the remaining lifetime, rather than
 // re-requesting once per second inside the 60-second expiry margin.
 const remaining=expiry-now;
 const minimum=Math.min(30_000,Math.max(1000,Math.floor(remaining/2)));
 return Math.max(now+minimum,expiry-HOST_ASSET_REFRESH_MARGIN_MS);
}

export function imageRefreshRetryDelay(failures:number):number{
 const attempt=Math.max(1,Math.min(6,Math.trunc(failures)));
 return Math.min(HOST_ASSET_RETRY_MAX_MS,HOST_ASSET_RETRY_BASE_MS*2**(attempt-1));
}
