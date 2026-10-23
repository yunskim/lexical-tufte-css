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
export type AssetSummary={id:string;title:string;mediaType:string;size?:number;currentRevision?:string};
export type AssetRevision={id:string;assetId:string;createdAt?:string;checksum?:string};
export type AssetLocator={assetId:string;revisionId?:string};
export type ResolvedAsset={assetId:string;revisionId:string;mediaType:string;url:string;expiresAt?:string};
export interface AssetProvider{
 search(query:{text:string;mediaTypes?:string[];limit?:number;cursor?:string},signal?:AbortSignal):Promise<SearchPage<AssetSummary>>;
 revisions(assetId:string,query?:{limit?:number;cursor?:string},signal?:AbortSignal):Promise<SearchPage<AssetRevision>>;
 resolve(locator:AssetLocator,signal?:AbortSignal):Promise<ResolvedAsset|null>;
}
export type EditorCapabilities={references?:ReferenceProvider;assets?:AssetProvider};

export {ReferenceSelection} from './referenceSelection.js';

export {mountReferencePicker,type ReferencePickerOptions} from './referencePicker.js';
