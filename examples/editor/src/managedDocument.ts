import {validateDocument,type AssetRef,type TufteDocument,type ValidationResult} from '@lexical-tufte/document';

/** The prototype uses a stable envelope, separate from its legacy raw Lexical slot. */
export const MANAGED_DOCUMENT_KEY='lexical-tufte-p1-document';
export const LEGACY_LEXICAL_KEY='lexical-tufte-p1';

export function validateManagedSnapshot(lexicalState:unknown,assets:readonly AssetRef[]):ValidationResult{
 const candidate={
  schemaVersion:1,
  id:'prototype-notes',
  locale:'ko-KR',
  title:'노트 편집 프로토타입',
  lexicalState,
  assets:structuredClone(assets)
 };
 return validateDocument(candidate);
}

/** A catalog change is accepted only when the *whole future document* validates. */
export function proposeManagedAsset(
 lexicalState:unknown,
 assets:readonly AssetRef[],
 candidate:AssetRef
):ValidationResult{
 return validateManagedSnapshot(lexicalState,[...assets,candidate]);
}

/** The returned validated snapshot is the exact content saved to the managed slot. */
export function prepareManagedSave(lexicalState:unknown,assets:readonly AssetRef[]):ValidationResult{
 return validateManagedSnapshot(lexicalState,assets);
}

export function inspectManagedRestore(raw:string):ValidationResult{
 let decoded:unknown;
 try{decoded=JSON.parse(raw);}catch{
  return {ok:false,diagnostics:[{code:'INVALID_MANAGED_JSON',path:'$',message:'Saved managed document is not JSON'}]};
 }
 return validateDocument(decoded);
}

export type ManagedSnapshot=TufteDocument;
