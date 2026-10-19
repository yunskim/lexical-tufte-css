# Sidenote / Marginnote: core model and parity plan

Status: implementation and regression-fixture migration in progress. Work verification on 2026-10-19 confirmed build and typecheck, but the full suite did not pass; subsequent fixture edits are not yet rerun.

## Decisions

- Use distinct Lexical node types `tufte-sidenote` and `tufte-marginnote`. Do not use a `kind` discriminator in their final serialized representation.
- Share editing behavior via a common internal base or utilities, not by merging the public node identities.
- Each note is an inline **anchor at a point in the surrounding text flow** and owns its rich phrasing payload. It is not attached to the entire paragraph or automatically to a substring range.
- A note may contain text, links, emphasis, inline images, and combinations of these. Image metadata belongs to the image node. Block images/figures require a separate explicit decision, not silent acceptance.
- A note can appear at supported inline positions in paragraphs and other compatible containers. Never infer its position from paragraph boundaries.
- `newthought` and a note are logical siblings. Publishing may place a note's label inside the preceding `newthought` span, with checkbox and note payload outside, solely to match upstream HTML.
- Publishing and clipboard HTML are different outputs. Published HTML targets pinned Tufte CSS DOM parity; clipboard content must preserve logical note identity and rich payload on round-trip.
- IDs must remain unique on paste, split and clone. A move retains identity; a copy generates a new identity.

## Coverage matrix

| Case | Logical structure | Publication | Editor tests |
| --- | --- | --- | --- |
| Sidenote mid-sentence | text / sidenote / text | numbered label + checkbox + sidenote | insertion, deletion, caret |
| Marginnote mid-sentence | text / marginnote / text | ⊕ label + checkbox + marginnote | insertion, deletion, caret |
| Note after newthought | newthought / note | upstream split-parent layout | split, unwrap, move |
| Rich text and links | note(children) | nested phrasing | selection, clipboard |
| Image-only note | note(image) | img in margin span | asset persistence, alt |
| Mixed image and caption text | note(text,image,text) | stable child order | reorder, copy/paste |
| Notes in lists/quotes | container > note | valid in-flow markup | nesting, keyboard |
| Figure-attached margin annotation | figure > marginnote | figure placement | figure operations |
| Multiple adjacent notes | note / note | distinct controls and IDs | split, merge, copy |
| Empty note | invalid or editor placeholder | never silently publish | empty-state recovery |
| Notes in links or inside another note | prohibited | explicit validation error | paste normalization |

## Required invariants

1. A note node has one fixed type, an immutable semantic category and a stable valid noteId; changing categories requires explicit replacement.
2. Its children are rich phrasing, but cannot themselves be notes. All container restrictions are enforced in the schema and editor commands.
3. The publisher must never rely on `kind` for new note types; type-specific serialization and rendering must agree.
4. Publishing does not mutate the Lexical state. Unsupported shapes produce diagnostics, not silently repaired HTML.
5. The sibling `newthought` pairing is a rendering rule, not a parent-child constraint or a permanent association to a text range.
6. DOM parity comparisons may normalize generated ID namespaces only when explicitly documented; no node-order or tag normalization.

## Implementation sequence

- [x] Resolve base-class and JSON type compatibility; register and export both concrete node classes (build/typecheck verified in Work baseline).
- [x] Extend schema, document types, validation and render profile to the two types (build/typecheck verified; regression suite incomplete).
- [x] Remove legacy `tufte-note` from schema, renderer and Lexical registry; no migration or backward compatibility.
- [x] Audit runnable source, tests, serialized fixtures and golden for old note constructors and wire types; migrate known consumers. Dedicated negative tests intentionally keep legacy literals. Execution verification remains pending.
- [x] Render both concrete note types in source order, including newthought label split-parent placement (focused browser comparison passed at baseline; full post-migration suite pending).
- [ ] Rewrite DOM parity and editor regression tests for each row of the matrix.
- [ ] Run build/typecheck and batched tests when requested; no CI unless requested.

## Work verification and follow-up (2026-10-19)

- Work baseline commit `c0a29b0` built and typechecked but reported 65 passing / 85 failing JS runner items, 16 passing / 5 failing browser files. See `docs/VERIFICATION_FULL_BASELINE_2026-10-19.ko.md`.
- Following that report, converted `packages/lexical/test/golden/lexical-0.52.0-all-nodes.json` (all four note IDs preserved), its generator and assertion suite, plus the ten Lexical test files listed as import-blocked. The shared fixture now uses the registered Tufte heading factory as well.
- The former mutable `note.setKind(...)` expectation is replaced by an explicit concrete-node replacement contract; `kind` remains valid on `tufte-span`, not on note nodes.
- Do **not** add legacy `tufte-note` wire-format compatibility or migration: that is a deliberate user decision. The separate storage-envelope v1→v2 migration tests remain applicable to otherwise valid documents.
- No post-migration build/tests were run in this editing pass. Import resolution, golden runtime fidelity and the remaining failures must be confirmed at the next Work test batch.

## Server fixture completion (after the first Work baseline)

- Both `fixtures/tufte/server-document.json` and `server-document-v2.json` now encode the same concrete-note `lexicalState`, preserving `server-note`/`server-margin`, original rich link/image payload, and all assets.
- `packages/lexical/test/create-server-document.mjs` generates these concrete note types. The shared all-node generator, golden, and test expectations also use fixed concrete wire identities.
- Server-comparison, document-validation, upstream-demo, all-nodes browser, text-format browser and upstream DOM comparison expectations have been aligned to the two types. `packages/document/test/note-fixture-contract.test.mjs` explicitly guards v1/v2 parity.
- Existing `tufte-note` stored documents are intentionally rejected; **no** compatibility shim or node migration is planned. The separate storage envelope v1/v2 validation/migration remains supported for valid current nodes.
- Post-edit `pnpm build`, package unit tests, browser tests and packed consumer checks are **not yet rerun**. Do not mark this phase complete before those results are collected.

### Follow-up audit after fixture conversion

- Audited product source (`document`, `render`, `lexical`, `blog`, editor), unit/browser tests and fixed v1/v2 fixture/golden paths for legacy note constructors, wire type, wrappers, and removed methods. The obsolete note payload remains only in explicit rejection assertions or historical documentation.
- Fixed `tests/note-browser.mjs`: the prior `querySelectorAll('[data-tufte-note]').every(...)` passed vacuously when the wrapper was removed. The test now requires both sidenotes and checks actual sibling controls.
- Removed the stale `getKind()` assertion on a concrete marginnote and aligned the future-version error assertion to `SidenoteNode.importJSON`.
- `figureCommands.ts` now keeps the insertion order of consecutive `after-image` margin notes; tests cover two before-image and two after-image insertions with caption preserved.
- Changed the node-type replacement test to use Lexical `replace(replacement, true)` to transfer children atomically rather than emptying a `canBeEmpty=false` note.
- Documentation: `docs/ERROR_LOG.md` E111/E112 and `docs/ERROR_PREVENTION.md` M102/M103. Changes **not yet run**; the 2026-10-19 Work baseline test counts are still the last known actual results.

## Current known integration risks

The shared `NoteNode` is now abstract and has no `kind` field. Concrete classes own the serialized type. Existing fixtures and call sites may still refer to the removed legacy constructor or serialized node. Do not assume build or round-trip success until the full reference audit and batched tests are complete.

## CSS-first logical model review (2026-10-19)

### Principle: CSS contract vs semantic ownership

Tufte CSS positions a note through the `sidenote`/`marginnote` class and a margin-toggle control. It does **not** require an image and its annotation to have a particular parent-child relationship. The renderer must emit an adjacent `input.margin-toggle + span.marginnote` pair for responsive behavior; this is an **output DOM contract**, not a requirement to store three nodes in the document. The preceding label references the input ID. Float position depends on the emitted order, so order is preserved rather than inferred from a presumed association.

A `marginnote` containing an image means the **image is in the margin**. A `marginnote` next to an image inside a `figure` means the **note is in the margin and the image remains in the figure flow**. These are distinct compositions, not separate note types.

### Proposed minimal hierarchy

- `section` contains blocks, including paragraphs and figures.
- A paragraph's phrasing sequence may contain `sidenote` or `marginnote` at any valid text position.
- A `figure` is a semantic group for image, optional caption and zero or more margin annotations. Their source order is meaningful, but **neither first-image nor first-note is mandated by CSS**. The figure invariant is one image, at most one caption, with the caption after the image; revisit the last rule if upstream examples demand otherwise.
- Notes contain rich inline phrasing, including inline images, but no nested notes. Image dimensions and asset identity belong to the image.
- The publisher emits label/input/span for each note without storing those HTML controls as logical nodes. For `newthought` adjacency it may move only the rendered label into the preceding span to reproduce the reference DOM.

### Current code audit

| Area | Current implementation | Assessment / follow-up |
| --- | --- | --- |
| `document/schema.ts` | Separate note types; figure allows image, caption, marginnote | Correct compositional basis; figure is still a domain-level grouping |
| `document/validate.ts` | Exactly one image, at most one caption after image, margin notes in any order | No CSS-motivated image-first restriction; keep semantic image count |
| `render/index.ts` | Figure renders children in source order; note emits label/input/span | Good; add parity tests for both figure child orders and image-inside-note |
| `render/profile.ts` | Figure margin notes no longer blocked | Good; confirm with batched tests |
| `lexical/figureCommands.ts` | Figure note insertion supports `placement: before-image / after-image`, default after-image | CSS does not mandate note-first; preserve source order and verify repeated insertions in final batch |
| `render/index.ts` newthought special case | Pairing only when newthought and sidenote are adjacent in a paragraph | Targeted DOM parity rule; retain and test boundary cases |

### Follow-up sequence (no test execution until batch)

1. [implemented, unverified in full batch] Allow caller-selected figure note placement without creating extra structural nodes.
2. [implemented, unverified in full batch] Cover figure `note,image,caption` and `image,note,caption`, plus `paragraph > marginnote > image,text`.
3. [partially verified 2026-10-19] Compare note control adjacency and responsive CSS behavior against pinned upstream; browser note DOM/mobile toggles and newthought split-parent were verified before subsequent fixture edits.
4. Review schema/renderer/editor parity again before declaring the note phase ready for user-run batch tests.

This review does not authorize the deferred agent API implementation.
