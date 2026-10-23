# Host reference integration boundary

**Decision:** lexical-tufte-css remains host-neutral. No Magnolia Works feature or adapter is required for this editor milestone.

## Ownership

| lexical-tufte-css | Host application (out of scope) |
| --- | --- |
| Render reference picker and request search results | Index and search documents, notes, tasks, assets |
| Request a fresh resolution before insertion | Enforce access control and decide whether a reference exists |
| Store `{namespace,kind,id}` in the Lexical document | Allocate identifiers and interpret their namespace |
| Publish a non-navigable span with `data-host-*` identity | Decide whether/how to navigate on user interaction |
| Invalidate stale picker selections | Provide data, paging and cancellation-aware responses |

## Public interface

`@lexical-tufte/editor-ports` exports `ReferenceProvider` with `search`, `resolve`, and `backlinks`. `EditorCapabilities.references` optionally supplies it. `EditorCapabilities.assets` is a separate optional `AssetProvider`; its host-qualified identity, transient URL rules, and remaining image-node integration work are documented in [AssetProvider boundary](asset-provider-boundary.md).

The stored `host-link` supports kinds `document | note | task | asset`. `external` may be a discovery result but is not a valid internal-link target. Titles and URLs are **not** persisted as link identity. The provider is not part of the document schema or renderer.

## Scope freeze

- No Magnolia-specific API, database access, indexing, authentication, or URL scheme in this repository.
- No Magnolia Works repository changes as part of the editor work.
- No new host adapter or simulated Magnolia integration to complete the interface.
- Continue with the editor's own editing, Tufte CSS fidelity, document model, accessibility and regression coverage.
- Revisit integration only when a concrete host application integration is separately requested.

## Verification

See [host-reference-test-checklist.md](./host-reference-test-checklist.md). Tests remain queued for an explicitly requested batch run; do not run CI.
