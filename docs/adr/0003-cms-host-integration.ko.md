# ADR-0003 — CMS host boundary and staged integration

Status: **Proposed; not adopted** (2026-10-23). No code/schema changes.
Basis: [crosswalk](../CMS_INTEGRATION_CROSSWALK_2026-10-23.ko.md), [review](../CMS_INTEGRATION_REVIEW_2026-10-23.ko.md), actual source inspections.

## Context: verified implementation

- Document v2 is already present: `TufteDocumentV2` is v1 content plus `editorFormat`; `validateDocumentV2` projects content to strict v1 validation. A future semantic-reference change therefore needs **v3 or another explicit, versioned extension**, not an informal 'v2' addition.
- `PostRevisionStoreV2` provides atomic compare-and-swap; `SqlitePostRevisionStoreV2.insert` and `compareAndSwap` exist. `InMemoryPostRevisionStoreV2` is test/single-process only.
- `SqlitePublicationStore` already manages draft revision + publication generation, renders, checks asset existence, and writes content-addressed immutable publication snapshots. Do not replace its ownership with a weaker generic publish API.
- `loadMigratedDocumentIntoEditor` and `exportEditorToDocumentV2` enforce strict, loss-detecting Lexical round trips.
- `INSERT_TUFTE_FIGURE_COMMAND` takes `src,alt,assetId` and optional dimensions; the validator requires a managed image node's src to equal `AssetRef.src`.
- The recursive repository tree has `packages/document`, `packages/lexical`, `packages/render`, `packages/blog`; **no `packages/adapter-fs` directory exists at this revision**. Previous roadmap language describing that package as implemented was incorrect.

## Decision direction (conditional)

1. **Keep existing core as authority.** Host discovery is optional and must not replace document revision, recovery, or publication storage.
2. **Use host-qualified references.** A future internal document link identifies `{namespace,id}`, not a bare URL/title. The namespace denotes a stable logical authority (not necessarily an origin URL). Decide namespace migration and portability before schema adoption.
3. **Separate link identity from label policy.** Support an automatic resolved title and a deliberate user-supplied label; neither title nor slug is identity.
4. **Separate asset identity from delivery.** Asset catalog may provide preview URLs; these must not be stored as durable identity. Existing v1/v2 `src` documents remain supported. For managed external assets, choose between a durable logical locator or versioned node plus render-time materialization; no change to v1/v2 validator by accident.
5. **Two-stage export.** Host-aware async resolution produces a bounded immutable manifest (including failure diagnostics); the existing pure synchronous renderer consumes a validated prepared document or mapping. No network in `renderArticle`.
6. **Publication remains host-owned.** A host adapter may invoke the existing `SqlitePublicationStore` for its SQLite host; other hosts must match its concurrency and immutable-snapshot invariants. A generic interface must not collapse revision and generation into one token.
7. **File attachments are separate from image nodes.** The asset picker may browse files, but inserting non-images needs a new explicitly validated node or link representation.
8. **Reuse existing diagnostics.** Avoid a competing generic Result/error contract until actual adapter implementations require one.

## Alternatives to resolve before adoption

- Internal links: new semantic node (clear validator/renderer rules, migration cost) versus metadata on standard `link` (less node code, risks compatibility and silent URL fallback).
- External images: durable host path with snapshot materialization versus reference-only image node (requires explicit schema change and editing preview strategy).
- Namespace: embedded qualified ID versus document-level namespace plus local ID (tradeoff portability/verbosity).
- Export: fail closed on unresolved assets versus placeholder with diagnostic (recommend fail for publication, warn for editor preview).

## Constraints / migration gates

- Do not retrofit new fields into v1/v2 without version bump: strict unknown-field rejection.
- Preserve official Tufte DOM parity fixtures, existing v2 migration and JSON loss-detection.
- Keep no-fetch-by-default security, no permission disclosure, and signed URL expiry handling.
- Publication snapshots must preserve source revision, renderer profile, resolved reference manifest, and asset delivery guarantees appropriate to the host.
- Treat retries/unknown outcomes explicitly; do not imply that existing stores already provide end-to-end idempotency.

## Next checklist

- [x] Verify repository tree and locate actual storage/revision/publication implementation.
- [x] Inspect strict v2 validation and Lexical editor bridge.
- [x] Inspect figure insertion and image serialization.
- [ ] Inspect remaining recovery API and application-specific UI/link insertion.
- [ ] Resolve alternatives above with fixture-backed ADR amendments.
- [ ] Draft schema v3 proposal, migration, render preparation manifest and contract fixtures.
- [ ] Prototype mock adapter without affecting current public APIs.
- [ ] Run tests at verification gate; no CI without explicit request.

Adoption gate: alternatives selected, backwards compatibility demonstrated, fixtures pass, and user accepts the expanded contract. Until then, this ADR is a design recommendation.
