# Document discovery and asset browsing roadmap

Integration API draft: [CMS Integration Contract](CMS_INTEGRATION_CONTRACT.ko.md).

Status: Planned (not implemented)
Priority: Deferred — after Tufte CSS sample parity, round-trip stability, and core editor stabilization.
Scope: lexical-tufte-css reusable editor integration, not a built-in CMS.

## Architectural decisions
- Lexical JSON remains the canonical document. HTML/Tufte CSS and Markdown are exports.
- Keep editor nodes and UI independent of document/asset storage and hosting.
- Host applications provide document search, asset listing, asset retrieval, and authorization through adapters.
- Store stable target identifiers, not titles or filesystem paths, in internal document references.
- Resolve titles, URLs, permissions, and availability at display/export time.
- Define fallback behavior for missing, renamed, deleted, inaccessible, and offline targets.
- Asset identity and revision policy are host concerns; do not introduce an independent asset revision system into the editor.

## Phase L1 — Existing-document linking
- [ ] Inventory existing link nodes, autocomplete, reference serialization, and export paths; reuse where possible.
- [ ] Define document-search adapter: query, pagination, result ID, title, context, and optional URL.
- [ ] Define internal-reference node/metadata with stable document ID and display text.
- [ ] Add link picker UI with keyboard navigation, filtering, and selection.
- [ ] Add optional `[[` trigger for contextual document suggestions.
- [ ] Resolve references during rendering and export, including renamed/missing/inaccessible targets.
- [ ] Define Markdown export policy (resolved links where available, explicit fallback otherwise).
- [ ] Test insert/edit/remove, save/reopen, title rename, missing target, permissions, and export.

## Phase A1 — Asset browsing
- [ ] Inventory existing image/file nodes, upload paths, and HTML export behavior.
- [ ] Define asset-provider adapter: list, search, paginate, filter, preview, select, resolve, and permission failures.
- [ ] Define stable asset references and optional metadata without embedding host-specific paths.
- [ ] Implement asset browser UI with search, thumbnail/metadata, selection, and reuse.
- [ ] Support insertion into appropriate existing Lexical nodes; introduce new nodes only where required.
- [ ] Handle unavailable/offline/deleted assets and preview errors.
- [ ] Define HTML and Markdown export for assets, including missing-asset fallbacks.
- [ ] Test insert/reuse, save/reopen, accessibility metadata, permission denial, and exports.

## Phase I1 — Integration and acceptance
- [ ] Build a minimal in-memory/mock provider demonstrating both pickers without a CMS.
- [ ] Document host API contracts and lifecycle/error handling.
- [ ] Add browser interaction and regression tests.
- [ ] Verify official Tufte CSS sample parity remains unchanged.
- [ ] Verify Lexical JSON remains the only canonical representation.
- [ ] Evaluate integration with Magnolia Works separately; avoid coupling its Asset model to the editor.

## Exit criteria
- A host can provide existing documents and assets without changing the editor's storage format.
- References survive save/reopen and title changes.
- Exports have documented deterministic behavior.
- Core Tufte CSS rendering and existing regression tests remain intact.
