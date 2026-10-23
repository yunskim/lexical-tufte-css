# CMS integration — schema v3 and reference-resolution proposal

Status: **Design proposal only**, 2026-10-23. No implementation or tests run.
References: [ADR-0003](adr/0003-cms-host-integration.ko.md), [crosswalk](CMS_INTEGRATION_CROSSWALK_2026-10-23.ko.md).

## Verified constraints
- v1 strict schema has URL-based `link`, `tufte-inline-image` and `AssetRef {id,src,mimeType}`; managed image src equals asset src.
- v2 adds `editorFormat` but validates the same v1 content, so semantic changes require a new schema version.
- Lexical `LinkNode` is registered; example editor has no `TOGGLE_LINK_COMMAND` or `LinkPlugin` use found by direct source inspection. No document-picker integration is present in the inspected example.
- Figure insertion accepts URL + optional assetId, and does not accept a host-qualified reference.
- Editor example keeps localStorage recovery slots; separate `SqliteEditorRecoveryStore` stores raw Lexical JSON with sequence CAS/checksum. Neither is a canonical publishable document.
- `SqlitePostRevisionStoreV2` provides insert and revision CAS; `SqlitePublicationStore` uses a separate publication generation. Preserve all three distinct concepts.

## Decision candidates (not adopted)

### Qualified identity
```ts
type ReferenceKey = {namespace: string; id: string};
type LinkLabel = {mode: 'auto'} | {mode: 'custom'; text: string};
type InternalDocumentReference = {
  type: 'tufte-document-reference'; version: 1;
  target: ReferenceKey; label: LinkLabel;
};
type ManagedAssetReference = {
  type: 'tufte-managed-image'; version: 1;
  target: ReferenceKey; alt: string;
  width?: number; height?: number;
};
```
These are **conceptual DTOs, not valid current Lexical serialized nodes**. Lexical serialization requires its own class/element rules and versioned schema. An inline document reference must preserve text selection, copy/paste, accessibility and editing semantics. Compare a dedicated inline element with an extended LinkNode before committing.

Prefer embedding qualified identity per reference (portability across multiple hosts) rather than relying only on a document-level namespace. Namespace is a logical authority stable across domain changes; its uniqueness, lifecycle and remapping must be documented.

### Managed assets
For existing v1/v2 images keep `src` and `assetId` behavior unchanged. New managed references store qualified identity and semantic alt text, **not signed URLs**. The host may provide a temporary preview URL for editor display; export preparation must materialize or pin a stable publication URL and, where required, immutable bytes/version/hash. Do not claim the current publication store already pins asset bytes.

### Two-stage export
```ts
type ResolutionManifest = {
  documentRevision: number;
  entries: Array<
    | {kind:'document'; target:ReferenceKey; title:string; href:string}
    | {kind:'asset'; target:ReferenceKey; publicationUrl:string;
       contentHash?:string; sourceRevision?:string}
  >;
  diagnostics: Array<{code:string;path:string;message:string}>;
};
```
1. Validate canonical document.
2. Extract and deduplicate qualified reference keys; enforce count, timeout and concurrency limits.
3. Host authorizes and resolves references asynchronously; never fetch arbitrary document-provided URLs by default.
4. Produce a validated immutable prepared document/manifest and fail publication if required assets remain unresolved.
5. Render synchronously and purely from prepared inputs; snapshot HTML, manifest, renderer profile and source revision atomically according to host capabilities.
6. A snapshot is not guaranteed immutable with respect to remote bytes unless the host pins or materializes those bytes.

### Error policy
- Editor: missing/forbidden/offline references show privacy-preserving fallback and diagnostics.
- Publication: unresolved required managed images are fatal; broken document links are fatal by default, with an explicit host policy to downgrade to warning.
- Markdown portable profile: resolve to URL with loss diagnostic; host-aware profile may carry qualified identity metadata, but is not canonical.
- Retry after unknown save outcome: read back revision/content hash; do not blindly retry a mutation.

## Adversarial fixture specifications (not implemented)

| Fixture | Input | Required result |
|---|---|---|
| F01 namespace collision | two hosts, both ID `123` | references stay distinct |
| F02 signed URL expiry | preview URL expires before reopen | canonical reference remains resolvable |
| F03 rename | target title changes | auto label refreshes, custom label unchanged |
| F04 permission revoked | previously searchable target becomes forbidden | no cached title/preview disclosure |
| F05 offline | catalog unavailable | editor retains reference and reports unavailable |
| F06 save response lost | CAS committed, client sees timeout | read-back reconciliation, no overwrite |
| F07 publish race | draft revision/generation changes | fail transaction, no stale publication |
| F08 external URL | pasted URL resolves to private network | no server fetch by default |
| F09 old documents | v1/v2 sample fixtures | unchanged validation/render behavior |
| F10 missing managed image | publication resolver cannot materialize | publication fails without partial commit |
| F11 generic PDF asset | selected via browser | cannot be inserted as image node |
| F12 export loss | internal ref → portable Markdown | explicit loss diagnostic |
| F13 recovery payload | raw recovery JSON | never accepted as publishable document without validation |
| F14 asset mutation | source bytes change after publication | pinned/materialized snapshot unaffected, or capability explicitly unsupported |

## Implementation checklist
- [x] Confirm recovery store and editor example recovery boundary.
- [x] Confirm link registry, figure command and current schema restrictions.
- [x] Specify conceptual v3 reference DTOs and export manifest.
- [x] Specify adversarial contract fixture cases F01–F14.
- [ ] Choose Lexical node implementation with selection/copy/paste experiments.
- [ ] Define v2→v3 migration, v3→older export downgrade and namespace remapping.
- [ ] Decide publication asset materialization and immutable delivery strategy per host.
- [ ] Implement fixture-backed mock resolver and run tests at verification gate.
- [ ] Amend ADR-0003 and freeze public API only after evidence.

No CI run; no test execution.
