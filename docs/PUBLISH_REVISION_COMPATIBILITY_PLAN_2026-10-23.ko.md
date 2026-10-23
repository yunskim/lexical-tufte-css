# Publish-as-revision: minimal compatibility change plan

Date: 2026-10-23. Status: proposed. Follow ADR-0006.

## Real-store characterization

Added `packages/blog/test/publish-revision-contract.test.mjs` to exercise actual `SqlitePublicationStore` and `SqlitePostRevisionStoreV2` on SQLite. Tests intentionally describe current behavior, including the *undesired* creation of a second snapshot on unchanged Publish. They have **not been executed**. Run only in the next requested test batch after building packages.

## Findings from current implementation

- No change needed to `PostRecordV2.metadata.revision` for the initial feature. Keep as draft CAS token.
- No change needed to `PublicationState.generation`. Keep as public-head CAS token, including unpublish.
- No reinterpretation of `PublicationSnapshot.publishedRevision`: it is the source draft revision.
- Existing `publication_snapshots_v1` retention triggers and content hashes already supply immutable historical snapshots.
- Existing `publish()` always generates a new snapshot and timestamp; even unchanged content creates another snapshot.
- Existing `unpublish()` retains `lastSnapshotId`, and `readPublic()` checks the active head.
- `metadata.status` is validated but not synchronized with publication head. Public visibility must be derived from the head.

## Smallest safe implementation sequence

1. **Document content equivalence**: compare canonicalized, publish-relevant content and renderer profile, not merely `sourceRevision`, timestamps or HTML. Determine whether metadata changes count as content. Never equate distinct assets solely because the HTML string matches.
2. **No-op Publish**: if current head is active and immutable snapshot is semantically identical to the validated current draft, return the existing snapshot without incrementing generation or updating timestamps. Still validate request expected draft revision and generation, and recheck within the transaction to prevent races. Define asset preflight policy explicitly.
3. **Restore**: introduce a distinct `restorePublishedSnapshot(id,snapshotId,expectedGeneration,...)` service operation with authorization and asset revalidation; do not conflate restore with publish. Restore moves head, increments generation, does not manufacture a new immutable content revision.
4. **Optional ordinal**: defer `publicRevisionNumber` until listing/history UX needs it. If introduced, migrate publication tables/API with explicit backfill, and preserve `publishedRevision` as source draft revision. Historical snapshot IDs remain valid.
5. **Status cleanup**: keep old `metadata.status` field valid for v1/v2. For new host API derive `isPublic` from head, and avoid writing `published` into drafts as the visibility authority. Provide a consistency warning/migration for conflicting legacy values.
6. **Recovery**: no change to recovery CAS, checksum or raw Lexical payload. Its `baseRevision` continues to reference draft CAS, not public revision.
7. **Shared CAS**: ADR-0004 can be implemented independently. Do not make generic store refactor a prerequisite for publish UX.

## Tests required before implementation is complete

- [x] Add actual SQLite characterization tests (not executed).
- [ ] Run existing publication tests and new characterization tests in one requested test batch.
- [ ] Add tests for unchanged Publish no-op and idempotent retries after new API exists.
- [ ] Add restore tests for authorization, generation conflict, immutable history, missing assets.
- [ ] Test changed metadata, changed asset bytes/identity, renderer profile changes and expired URLs.
- [ ] Test stale draft update between async preflight and transaction.
- [ ] Test legacy snapshot read after migration and cross-connection concurrency.
- [ ] Test that no-op publish never rewrites the firstPublishedAt/lastPublishedAt values.

## Compatibility boundary

Prefer additive methods and fields. Avoid changing current `publish()` return shape, public snapshot JSON schema, SQL constraints or old API semantics in the first implementation patch without versioned migration. If new no-op behavior must alter `publish()`, document and test that intentional semantic change first.

No CI or tests executed.