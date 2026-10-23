# ADR-0006 — Publish establishes an immutable public revision

Status: **Proposed after independent review**, 2026-10-23. Design only; no schema or runtime change.
Supersedes the preferred explicit-checkpoint workflow in ADR-0005 for the default blog/editor UX. Does not supersede ADR-0004 shared storage primitives.

## Chosen UX semantics

- Draft editing and autosave are durable working-state updates, **not user-visible published revisions**.
- User explicitly selects **Publish** to validate, render, freeze and expose a public revision.
- There is no separate user-facing Checkpoint command in the default workflow.
- The existing published snapshot is the immutable content anchor; subsequent edits cannot change it.
- **Unpublish** changes public visibility, not the historical snapshot.
- Keep draft CAS version, public revision ordinal, and publication generation conceptually distinct.

## Verified current code / compatibility hazards

1. `PostRecordV2.metadata.revision` increases on each canonical save (`preparePostRevisionV2`); this is a **draft CAS counter**, not a publish ordinal.
2. `PublicationSnapshot.publishedRevision` is assigned `expectedRevision` from the draft, not a count of publications.
3. `PublicationState.generation` increments on publish **and unpublish**; cannot be used directly as a published revision number.
4. `publication_snapshots_v1` is content-addressed and immutable; `publication_heads_v1` points to the active snapshot. Existing code records `lastSnapshotId` and a publication generation.
5. `PostMetadata.status` is a separate draft/published/archived enum. The public serving path uses publication head, so metadata status must not independently determine public visibility.
6. `publish()` preflights assets, renders HTML, and rechecks draft revision + generation inside `BEGIN IMMEDIATE`. Keep this protection.
7. Existing `readSnapshot(snapshotId)` can retrieve snapshots by ID, but there is no inspected API that enumerates immutable public revisions by a simple user-visible ordinal.
8. The current asset existence callback does not guarantee immutable remote bytes. A frozen HTML snapshot is not by itself a frozen media snapshot.
9. Current `SqlitePublicationStore` requires synchronous SQLite; `SqlitePostRevisionStoreV2` uses an async SQLite/D1 style. Do not claim one adapter works on both without tests.

## State model

```text
DRAFT (draftVersion d1, d2, d3 ...; recoverySequence s1, s2 ...)
   |
   | user Publish; validate + render + CAS(draftVersion, publicationGeneration)
   v
PUBLIC REVISION P1 (immutable snapshot, current public head -> P1)
   |
   +-- edit draft d4,d5; public head still P1
   |
   +-- Publish -> P2 (immutable; head -> P2)
   |
   +-- Unpublish -> head null; P1/P2 retained
   |
   +-- Republish -> explicit policy below
```

### Revision numbering policy (recommended)

Introduce `publicRevisionNumber` as a **monotonic per-document publish ordinal** only when the feature needs a human-readable number. Do not derive it from draft revision or generation. Increment on successful publication creating a new public revision. Do **not** increment on unpublish. Preserve the old `publishedRevision` field as the source draft revision for compatibility; consider a future rename to `sourceDraftVersion` only with migration.

**Republish without content changes:** two reasonable semantics exist:
- **Reactivate** a retained immutable snapshot (no new P-number), but requires an explicit safe activation operation and concurrency checks.
- **Create a new publication event** (new P-number), even if the payload is identical; simpler to audit, but not a new content state.

Recommendation: for default UX, make an unchanged Publish a **no-op if already public**, and require an explicit **Restore/Re-publish** action for an unpublished document. The latter should revalidate current authorization/assets; decide whether it creates a new ordinal after fixture experiments. Avoid silently manufacturing P2 for a click on unchanged P1.

## Repeated independent reviews

### Review A — semantics and UX
- PASS: Publish is a clear user-intent boundary and avoids exposing autosave revisions.
- ISSUE: A user may want named private milestones without publishing; this is **not** supported by default. Optional private checkpoints can be a later host capability, not part of baseline.
- ISSUE: Publication of unchanged content must not accidentally create meaningless revisions. Define no-op/restore policy.

### Review B — data model and migration
- PASS: existing immutable snapshots are a strong foundation.
- BLOCKER: `publishedRevision` and `generation` cannot be relabeled as public revision ordinal.
- BLOCKER: `metadata.status` may conflict with publication head. Head must be authority for public visibility; migrate/derive status safely.
- BLOCKER: user-visible P-number needs a new monotonic field and indexed lookup/listing, or omit ordinal from initial API.
- PASS: v1/v2 document schemas need not change just to implement publish semantics; changes may be confined to publication storage/API.

### Review C — concurrency, failure and security
- PASS: existing draft CAS + generation checks protect against stale publishes.
- ISSUE: preflight asset existence is weaker than immutable asset pinning.
- ISSUE: unknown commit outcome needs read-back/idempotency reconciliation.
- ISSUE: restore/unpublish/re-publish must check generation and avoid re-exposing stale or unauthorized content.
- ISSUE: content hash dedup alone must not merge distinct publication events/authorization contexts.

### Review D — compatibility and alternatives
- Alternative 1: every save = revision. Simple, but user-visible history is noisy; not preferred.
- Alternative 2: explicit private Checkpoint + Publish. More flexible but unnecessary baseline UI and extra semantics; defer.
- Alternative 3: **Publish = immutable public revision**. Preferred for blog/document publishing; aligns with current snapshot architecture and user intent.
- Compatibility: preserve existing `publishedRevision` as draft source version and `generation` as head concurrency token. Add public ordinal only as a versioned extension, never by reinterpretation.
- Host boundary: do not embed Magnolia Works Task/Asset/Checkin semantics or require a Magnolia dependency.

## Acceptance fixtures before implementation

- [ ] Draft autosaves d1→d7 leave current public P1 unchanged.
- [ ] Publish d7 creates P2 only after complete validation and atomic pointer switch.
- [ ] Two clients publishing with the same generation: exactly one wins.
- [ ] Unpublish increments generation, does not delete P1/P2 or increment public revision ordinal.
- [ ] Publish unchanged while already public is a no-op, with documented timestamp policy.
- [ ] Republish after unpublish: explicit revalidation, no silent stale resurrection; ordinal policy decided.
- [ ] Failed asset preflight preserves previous public P1.
- [ ] Draft metadata `status` and head disagree: public reads follow head, editor reports or reconciles mismatch.
- [ ] Legacy snapshots remain readable and have a defined display ordinal or no ordinal.
- [ ] Publish succeeds but response lost: read-back identifies committed snapshot without duplicating revision.
- [ ] Publishing two different drafts with identical HTML preserves appropriate source/identity semantics.
- [ ] Remote asset mutates or signed URL expires: delivery guarantee explicitly tested/declared.

## Decision and rollout

1. **Adopt as design direction, not code contract:** Publish freezes a public revision; autosave remains draft-only; no default Checkpoint UI.
2. Preserve existing draft revision and publication generation invariants.
3. First write fixture-backed state machine for publish/unpublish/no-op/restore and metadata disagreement.
4. Decide ordinal and republish policy, then introduce versioned publication API/storage migration if needed.
5. Defer private checkpoints, asset pinning implementation and CMS host integration to separately scoped work.

No tests or CI run.