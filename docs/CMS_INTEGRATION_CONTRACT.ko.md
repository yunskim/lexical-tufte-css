# CMS Integration Contract — draft v0.1

Status: DESIGN ONLY; no runtime implementation or schema migration.
Purpose: connect lexical-tufte-css to filesystem, Magnolia Works, or third-party CMS hosts without coupling Lexical nodes to storage, network, or authorization.
Related: [Document schema](DOCUMENT_SCHEMA_V1.ko.md), [Plan](PLAN.ko.md), [Discovery/asset roadmap](document-discovery-and-asset-browser-roadmap.md).

## 1. Boundary and authority

- The existing TufteDocument envelope and its `lexicalState` are the canonical editable document; HTML and Markdown are derived exports.
- The host owns persistence, access control, document/asset catalogs, asset bytes, publication destinations, and revision/concurrency semantics.
- The library owns document validation, Lexical editing, reference UX, deterministic transformations, and render/export diagnostics.
- Do not make HTTP, Wagtail, Magnolia, or a database a required runtime dependency. TypeScript interfaces are the portable contract; host-specific HTTP APIs are optional implementations.
- Adapter methods return only authorized records. Search results are not authorization grants. Recheck permissions on read, save, asset delivery, and publish.
- No editor-side asset revision model. Asset identity/revision and URL expiry are host responsibilities.

## 2. Proposed interfaces (not yet implemented)

```ts
type ResourceId = string; // host-scoped, stable; not a slug, path, or title
type Cursor = string;
type Page<T> = { items: T[]; nextCursor?: Cursor };
type FailureCode =
  | "NOT_FOUND" | "FORBIDDEN" | "UNAVAILABLE" | "CONFLICT"
  | "INVALID" | "UNSUPPORTED" | "ABORTED";
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: FailureCode; message?: string };

type DocumentSummary = {
  id: ResourceId; title: string; description?: string;
  locale?: string; updatedAt?: string;
};
type AssetSummary = {
  id: ResourceId; name: string; mimeType: string;
  byteLength?: number; width?: number; height?: number;
  alt?: string;
};
type ResolvedLink = {
  id: ResourceId; title: string; href: string;
};
type ResolvedAsset = {
  id: ResourceId; src: string; mimeType: string;
  alt?: string; width?: number; height?: number;
};
type Query = { text?: string; cursor?: Cursor; limit?: number };

interface DocumentCatalog {
  search(query: Query, signal?: AbortSignal): Promise<Result<Page<DocumentSummary>>>;
  resolve(id: ResourceId, signal?: AbortSignal): Promise<Result<ResolvedLink>>;
}
interface AssetCatalog {
  search(query: Query & { mimeTypePrefix?: string }, signal?: AbortSignal):
    Promise<Result<Page<AssetSummary>>>;
  resolve(id: ResourceId, signal?: AbortSignal): Promise<Result<ResolvedAsset>>;
  // Asset upload/import is a separate optional capability, not part of browsing.
}
interface DocumentStore {
  load(id: ResourceId, signal?: AbortSignal):
    Promise<Result<{ document: TufteDocument; revision: string }>>;
  save(document: TufteDocument, expectedRevision: string, signal?: AbortSignal):
    Promise<Result<{ revision: string }>>;
}
interface PublicationTarget {
  publish(id: ResourceId, expectedRevision: string, signal?: AbortSignal):
    Promise<Result<{ publicationId: string; revision: string; url?: string }>>;
}
type HostCapabilities = {
  documents?: DocumentCatalog;
  assets?: AssetCatalog;
  storage?: DocumentStore;
  publication?: PublicationTarget;
};
```

`TufteDocument` above refers to the existing validated contract, not a new duplicate type. `revision: string` is an opaque concurrency token; adapters may translate to the current PostMetadata numeric revision or an ETag. This draft does not replace `PostRepository`, `AssetStore`, or `packages/adapter-fs`. Before implementation, reconcile their signatures and error types.

## 3. Reference semantics

- An internal document reference identifies a host document by stable ID; its label is display text, never the lookup key.
- Existing `link` node only stores URL; adding internal references requires an explicit versioned node/metadata proposal, validator, migration, import/export, and golden fixtures. Do not silently reinterpret arbitrary URLs as internal references.
- The current document envelope has `assets: AssetRef[]` with `id, src, mimeType` and optional metadata; managed image nodes use `assetId`. Preserve existing invariants until an explicitly versioned migration is approved.
- A host adapter may return a short-lived signed URL, but it must not become a permanent identity. Decide at integration time whether resolved URLs belong in the saved envelope, render context, or an export snapshot; never persist expiring URLs as the only way to recover assets.
- Missing, forbidden, or offline references must produce distinct diagnostics and a visible editor fallback. Never leak titles or preview bytes for forbidden items.
- Exports: HTML resolves authorized links/assets at publication time; Markdown uses resolved URLs or an explicit unresolved-reference marker with diagnostics. Never claim a Markdown round-trip can restore all Lexical semantics.

## 4. UX and data flows

Document link picker: user enters `[[` or opens link menu → debounced catalog search → keyboard selection → store stable reference → editor renders label → save canonical JSON. At display/export, resolve by ID. Title changes do not break identity.

Asset browser: open picker → catalog search/pagination/filter → optional preview through authorized host resolution → choose asset → insert supported Lexical image/file representation → save. Upload is a separate optional host action.

Saving: editor validates canonical document → store.save with expectedRevision → success updates revision; CONFLICT preserves unsaved editor state and surfaces a user decision. No silent last-write-wins.

Publishing: publication target validates the selected revision and emits an immutable output snapshot according to the host policy. Editing a draft must not mutate an already published snapshot.

## 5. Compatibility and security requirements

- Adapters must not mutate documents during reads or validation.
- Define stable pagination ordering and cursor expiry per host.
- Treat host titles/metadata as untrusted text; escape in UI and exports.
- URL validation, SSRF-safe fetching, MIME/content inspection, size limits, and signed URL handling are host/renderer security boundaries, not waived by a successful catalog lookup.
- AbortSignal cancellation, offline behavior, retries, and idempotent save/publish handling need adapter-specific tests.
- Keep the official Tufte CSS sample DOM parity and existing JSON round-trip fixtures unchanged unless a separately approved migration requires updates.
- Maintain compatibility with existing post publication lifecycle and asset schema; no second source of truth.

## 6. Implementation checklist

### C0 — Contract alignment (before implementation)
- [ ] Inventory actual PostRepository, AssetStore, adapter-fs, editor and render APIs and compare against this draft.
- [ ] Decide reference node encoding and document schema migration strategy; write an ADR.
- [ ] Decide saved versus transient resolved asset URLs and export snapshot rules.
- [ ] Define failure/diagnostic mapping and revision token adapter compatibility.
- [ ] Freeze v1 TypeScript API after review and add contract fixtures.

### C1 — Host capability layer
- [ ] Implement opt-in host interfaces in a runtime-independent package or existing shared package.
- [ ] Provide in-memory/mock adapters for tests and examples.
- [ ] Add cancellation, pagination, error, permissions and offline contract tests.
- [ ] Ensure existing filesystem/blog adapters still work without the new capabilities.

### C2 — Document discovery and links
- [ ] Implement DocumentCatalog adapter and picker with `[[` suggestions.
- [ ] Add stable internal reference representation, migration, validator and golden fixtures.
- [ ] Test rename, deletion, denial, offline, save/reopen and HTML/Markdown export.

### C3 — Asset discovery
- [ ] Implement AssetCatalog adapter and browser with preview/filter/pagination.
- [ ] Reuse existing image/asset schema where possible; version changes explicitly.
- [ ] Test reuse, missing asset, access denial, URL expiry, accessibility and export.

### C4 — Storage/publication integration
- [ ] Adapt existing PostRepository and AssetStore instead of replacing them.
- [ ] Test optimistic concurrency, draft/published snapshot isolation, and conflict UX.
- [ ] Provide a filesystem example and optional Magnolia host example without Magnolia dependency.
- [ ] Run complete schema, browser, render and upstream Tufte parity regression suite.

## 7. Acceptance gates

1. The same editor works with mock and filesystem hosts without changing Lexical JSON.
2. Stable document references survive rename and reopen; inaccessible references do not disclose content.
3. Managed assets remain resolvable without relying on expiring URLs saved as identities.
4. Revision conflicts cannot silently overwrite edits; publication is snapshot-safe.
5. HTML/Markdown exports report unsupported or unresolved references explicitly.
6. Existing Tufte sample parity and canonical JSON tests remain green.

Priority: deferred until current Tufte CSS parity and editor stabilization gates. No implementation or test execution is implied by this document.
