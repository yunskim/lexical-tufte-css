/** Host-neutral editor discovery contracts. No database, HTTP, or Lexical runtime imports. */
export type ReferenceKind='document'|'note'|'task'|'asset'|'external';
export type Reference={namespace:string;id:string;kind:ReferenceKind;title:string;description?:string};
export type SearchPage<T>={items:T[];nextCursor:string|null};
export type ReferenceQuery={text:string;kinds?:ReferenceKind[];limit?:number;cursor?:string};
export interface ReferenceProvider{
 search(query:ReferenceQuery,signal?:AbortSignal):Promise<SearchPage<Reference>>;
 resolve(reference:{namespace:string;kind:ReferenceKind;id:string},signal?:AbortSignal):Promise<Reference|null>;
 backlinks(reference:{namespace:string;kind:ReferenceKind;id:string},query?:{limit?:number;cursor?:string},signal?:AbortSignal):Promise<SearchPage<Reference>>;
}
/**
 * Stable, host-qualified asset identity. Never use a title, file path,
 * downloaded URL or revision number as the asset ID.
 * Structurally compatible with document.HostAssetLocator.
 */
export type AssetIdentity={namespace:string;assetId:string};
export type AssetLocator=AssetIdentity&{revisionId?:string};
export type AssetSummary=AssetIdentity&{
 title:string;
 mediaType:string;
 /** File length in bytes, if known. */
 size?:number;
 /** Host-selected current revision. Metadata only, not a saved pin. */
 currentRevision?:string;
};
export type AssetRevision=AssetIdentity&{
 /** Immutable host revision identifier, opaque to the editor. */
 id:string;
 createdAt?:string;
 checksum?:string;
};
/** A transient, authorized preview/download location, not document identity. */
export type ResolvedAsset=AssetIdentity&{
 /** Concrete revision, including when the input locator was floating. */
 revisionId:string;
 mediaType:string;
 url:string;
 /** ISO-8601 expiry for a temporary/signed URL, if any. */
 expiresAt?:string;
};
/**
 * Optional host-owned asset catalog. Search and revision lists are UI data,
 * never authorization grants. The host rechecks access on every resolve.
 *
 * resolve(null): missing or not authorized. Offline/transient failures reject;
 * AbortSignal cancellation must be respected by the implementation.
 * Never serialize ResolvedAsset.url as the canonical document reference.
 *
 * Publishing is NOT a responsibility of this interface: a host publication
 * process must pin floating locators to immutable bytes/revisions atomically.
 */
export interface AssetProvider{
 search(query:{text:string;mediaTypes?:string[];limit?:number;cursor?:string},signal?:AbortSignal):Promise<SearchPage<AssetSummary>>;
 revisions(asset:AssetIdentity,query?:{limit?:number;cursor?:string},signal?:AbortSignal):Promise<SearchPage<AssetRevision>>;
 resolve(locator:AssetLocator,signal?:AbortSignal):Promise<ResolvedAsset|null>;
}
export type EditorCapabilities={references?:ReferenceProvider;assets?:AssetProvider};

export {ReferenceSelection} from './referenceSelection.js';

export {mountReferencePicker,type ReferencePickerOptions} from './referencePicker.js';
