# Sidenote / Marginnote: core model and parity plan

Status: design decision; implementation incomplete. Do not treat the current branch as build-verified.

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
| Legacy `tufte-note` | migration input only | new node representation | lossless migration |

## Required invariants

1. A note node has one fixed type, an immutable semantic category and a stable valid noteId; changing categories requires explicit replacement.
2. Its children are rich phrasing, but cannot themselves be notes. All container restrictions are enforced in the schema and editor commands.
3. The publisher must never rely on `kind` for new note types; type-specific serialization and rendering must agree.
4. Publishing does not mutate the Lexical state. Unsupported shapes produce diagnostics, not silently repaired HTML.
5. The sibling `newthought` pairing is a rendering rule, not a parent-child constraint or a permanent association to a text range.
6. DOM parity comparisons may normalize generated ID namespaces only when explicitly documented; no node-order or tag normalization.

## Implementation sequence

- [ ] Resolve base-class and JSON type compatibility; register and export both concrete node classes.
- [ ] Extend schema, document types, validation and render profile to the two types.
- [ ] Migrate legacy `tufte-note` by `kind`, preserving IDs, children and position; disallow legacy form in newly written documents.
- [ ] Replace old constructors in note operations, composition, clipboard, figures and commands.
- [ ] Generalize inline-sequence rendering for both types, including newthought label placement.
- [ ] Rewrite DOM parity and editor regression tests for each row of the matrix.
- [ ] Run build/typecheck and batched tests when requested; no CI unless requested.

## Current known integration risks

The first two concrete subclasses were introduced before the complete schema/renderer migration. Existing `NoteNode` still has a `kind` field, and its `exportJSON` contract does not yet cleanly model subclass-specific type literals. Do not assume these classes compile or round-trip until the migration and tests are complete.
