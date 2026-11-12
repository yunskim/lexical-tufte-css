import type {AssetProvider,AssetRevision,AssetSummary} from '@lexical-tufte/editor-ports';

export const HOST_IMAGE_MEDIA_TYPES=['image/png','image/jpeg','image/webp','image/svg+xml'] as const;

/** Shared image-only DAM query contract. The host supplies the adapter. */
export async function searchHostImages(
 adapter:AssetProvider,query:string,signal?:AbortSignal
):Promise<AssetSummary[]>{
 const page=await adapter.search({text:query,mediaTypes:[...HOST_IMAGE_MEDIA_TYPES],limit:40},signal);
 return page.items.filter(asset=>typeof asset.mediaType==='string'&&asset.mediaType.startsWith('image/'));
}

/** Discard revisions which do not belong to the selected image asset. */
export async function listHostImageRevisions(
 adapter:AssetProvider,assetId:string,signal?:AbortSignal
):Promise<AssetRevision[]>{
 const page=await adapter.revisions(assetId,{limit:40},signal);
 return page.items.filter(item=>item.assetId===assetId);
}
