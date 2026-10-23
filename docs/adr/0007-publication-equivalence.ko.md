# ADR-0007 — Published-content equivalence and no-op Publish

Status: **Proposed contract**, 2026-10-23. No production behavior change, no tests executed.
Follows ADR-0006 and STORAGE_PUBLICATION_CONTRACT_LAYERS_2026-10-23.ko.md.

## Decision

An already-public document may treat Publish as a no-op **only** when the publishable semantic input and its render dependencies are demonstrably equivalent to the active immutable snapshot. If equivalence is unknown, **do not silently return no-op**: publish a new snapshot or return a clearly diagnosed inability to compare, depending on host policy.

The comparison is performed **after authorization, draft/head CAS checks, document validation, asset/reference resolution, and render preflight**, and must be rechecked inside the publication transaction. A no-op must not advance publication generation, change publication timestamps, create a snapshot, or alter public revision numbering.

## Proposed semantic comparison key

Canonicalized semantic input includes:
- document identity and **all render-relevant document fields**, including Lexical node tree, annotations, links, layout, figure fields, and document title;
- **public-facing** metadata such as slug, summary, tags, authors (policy must explicitly define which metadata is published);
- resolved reference targets and asset **stable identities/versions or immutable content digests**, where available;
- renderer profile, document schema version and publication transform/resolution policy version.

Excluded as operational metadata:
- `PostMetadata.revision` (draft CAS version), `updatedAt` (save time);
- `publicationGeneration`, `publishedAt`, `firstPublishedAt`, snapshot ID, recovery sequence/session.

`createdAt` remains an identity invariant checked separately; do not let it drift just because it is not a semantic-content field. `metadata.status` is not the public visibility authority, but its published representation must be explicitly defined before it can be excluded.

## Do not equate these cases

1. Same HTML but different source references/assets: **not necessarily equivalent**.
2. Same URL but mutable bytes behind it: **not provably equivalent**; host must supply pinned asset identity/digest or choose conservative behavior.
3. Same Lexical JSON but different renderer profile or resolved references: **not equivalent**.
4. Same content, changed public summary/tags/authors: **not equivalent** when these fields are publicly exposed.
5. Same content, only draft CAS revision/updatedAt changed: **equivalent**, assuming all other conditions are met.
6. Legacy snapshot missing a comparable equivalence key: **unknown**; preserve legacy read compatibility, do not infer equality from HTML alone.
7. Unpublished head with lastSnapshotId: **not a no-op**; only explicit Restore/Re-publish may re-expose content.
8. Renderer produces equivalent HTML but a different publication manifest or security policy: **not necessarily equivalent**.

## API boundary

Prefer a **new opt-in workflow method** or explicit option before changing the existing `SqlitePublicationStore.publish` semantics. Existing callers may depend on every successful publish creating a new snapshot. Preserve current `publishedRevision` (source draft CAS) and `generation` (head CAS) meanings.

A publication fingerprint is a *domain-derived, versioned semantic key*, not the SHA-256 ID of the full snapshot envelope. Compute from a canonical representation with deterministic object ordering and explicit normalizations. Avoid lossy normalization of user content, URL, whitespace, array order or Lexical nodes.

An initial implementation may use **exact structural equality of a whitelisted semantic projection** (conservative false negatives acceptable) rather than inventing a general equivalence algorithm. False positives are unacceptable: they suppress a needed publish.

## Transaction algorithm

1. Authenticate/authorize; load draft and head with expected versions.
2. Validate draft, resolve references/assets, render; compute comparable semantic projection.
3. If active snapshot exists, compare its projection and current dependency policy; if equal, candidate no-op.
4. Begin write transaction; re-read draft/head and confirm both expected versions and unchanged draft content.
5. If candidate no-op, revalidate active snapshot pointer and comparison preconditions, then commit/return existing snapshot **without mutation**.
6. Otherwise insert immutable snapshot and atomically update publication head. Commit before exposing result.
7. On uncertain response, read back current head and snapshot; do not retry blindly.

## Required tests (design checklist)

- [ ] Only `updatedAt` and draft revision changed -> no-op.
- [ ] Summary/tags/authors changed -> new snapshot when public metadata is included.
- [ ] Same HTML with different asset identities -> new snapshot.
- [ ] Mutable asset URL with no immutable identity -> conservative new snapshot or explicit refusal.
- [ ] Renderer profile or resolution manifest version changed -> new snapshot.
- [ ] Same source input but different resolved link target -> new snapshot.
- [ ] Concurrent draft save between preflight and transaction -> conflict, no-op not returned.
- [ ] Concurrent Unpublish between preflight and transaction -> conflict, no-op not returned.
- [ ] No-op preserves generation, firstPublishedAt, publishedAt and snapshot count.
- [ ] Legacy snapshot without fingerprint remains readable and is not automatically considered equivalent.
- [ ] Unpublished state never returns no-op or silently resurrects old content.

## Remaining decision

**Host asset immutability policy** is not currently available in the existing `assetExists(src)` callback. This contract cannot safely claim media-complete equality until a stable asset manifest/identity contract exists. The conservative first iteration may intentionally produce more snapshots than ideal.

No tests or CI run.
