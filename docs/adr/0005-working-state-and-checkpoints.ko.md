# ADR-0005 — Working state, stash, checkpoint and revision

Status: **Proposed**, 2026-10-23. Magnolia Works concepts are inspiration, not a dependency. No code changes.

## Motivation

ADR-0004 found no need for distinct low-level CAS contracts for canonical posts and recovery slots. A more useful question is whether **durable working state** and **meaningful immutable revisions** should be separate concepts.

The current code has:
- `PostRecordV2.metadata.revision` incremented by `preparePostRevisionV2` and `SqlitePostRevisionStoreV2.compareAndSwap` on every canonical update.
- `RecoverySlot {postId,sessionId,sequence,baseRevision,savedAt,payload,checksum}`, storing raw editor JSON via `SqliteEditorRecoveryStore`.
- A separate publication `generation` and immutable snapshot in `SqlitePublicationStore`.
These are three concurrency/history dimensions, not a single revision model.

## Analogy with Magnolia Works (not imported terminology or entities)

| Idea | Potential lexical-tufte-css meaning | Existing approximation |
| --- | --- | --- |
| Working state | mutable editing buffer for a document/session | Lexical editor |
| Save | persist current working state without claiming meaningful history | recovery save |
| Stash | retain a recoverable stable state, potentially multiple sessions | recovery slots |
| Checkpoint | validate and intentionally establish a durable document revision | canonical post CAS |
| Revision | immutable document state addressed by a stable version | **not fully implemented as such**: `posts_v2` stores the latest payload; published snapshots are separately immutable |
| Publish | render and atomically expose a verified immutable output | existing publication snapshot/generation |

**Important correction:** Existing `PostRecordV2.metadata.revision` is a monotonic optimistic-concurrency counter for canonical draft updates. It is not evidence that all prior draft revision payloads remain retrievable. Therefore do not rename it 'immutable revision history' without introducing retention/storage.

## Proposed lifecycle

```text
Open canonical revision R5
       |
       v
Edit in Lexical (working state)
       |
       +-- autosave -> recovery stash S1, S2, S3 (base R5)
       |
       +-- checkpoint -> validate + CAS against R5 -> canonical R6
       |                  (only if explicit checkpoint semantics are adopted)
       |
       +-- publish -> preflight + render + publication generation Gk
```

A host may choose 'save immediately creates a canonical revision' for compatibility; the **explicit checkpoint** mode is an optional workflow policy, not an automatic migration. If explicit checkpoint is selected, autosave must not increment canonical revision. Stash sequence remains independent from canonical revision.

## Design alternatives

**A. Keep existing behavior.** Canonical save increments revision; recovery autosaves separate. Lowest migration risk; revision means 'successful canonical save', not necessarily user-intended checkpoint.

**B. Explicit checkpoint.** Working saves go to versioned working-state store, checkpoint validates and creates canonical revision. Better separation of mechanical persistence from meaningful history; requires defining close/reopen, stale base revision, multi-session reconciliation, and whether historical revisions are retained.

**C. Unified append-only history for every save.** All saves are immutable revisions. Simpler single log, but excessive history and confusion between autosaves and meaningful milestones; not recommended as default.

**Recommendation:** Prefer B as a *future optional document workflow*, while first implementing the common CAS primitive from ADR-0004 and preserving existing A behavior. Do not add Magnolia Task, Asset, Checkin, or provenance concepts to this library.

## Critical invariants

1. Autosave success does not imply checkpoint success or publication.
2. A stash is not a validated canonical document; recovery must revalidate.
3. A checkpoint must compare its base revision and fail or reconcile on conflict; never silently overwrite.
4. Multiple sessions may have independent stash sequences anchored to the same canonical revision.
5. A revision identifier must state whether it is a CAS generation or an immutable retrievable history item; do not use the same word ambiguously.
6. A publication generation is independent from both canonical revision and stash sequence.
7. An immutable revision needs actual immutable retained content; a counter alone is insufficient.
8. Existing v1/v2 documents and publish/recovery APIs remain compatible until a separately reviewed migration.

## Decision questions and fixtures

- [ ] Decide whether users want explicit checkpoints or 'save=revision' for this editor's primary documentation use.
- [ ] Define whether immutable historical draft revisions are in scope; if yes, storage, retention and restore behavior.
- [ ] Specify editor crash after autosave but before checkpoint.
- [ ] Specify two sessions checkpointing from the same base revision.
- [ ] Specify recovery after another session has checkpointed.
- [ ] Specify same content checkpoint twice (no-op vs new revision).
- [ ] Specify checkpoint succeeded but client timed out (read-back reconciliation).
- [ ] Verify published snapshot remains unchanged when working state changes.
- [ ] Compare A/B via minimal mock state-machine fixtures before changing production schema.

No tests or CI run.
