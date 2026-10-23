# Markdown import/export (P3 — deferred)

Status: Planned only. No implementation or tests in this change.

## Priority and prerequisites

Defer until the official Tufte CSS sample fidelity work and editor stabilization are complete. Before implementation, inspect the current repository for existing Markdown support; reuse it if present.

## Checklist

- [ ] Audit existing Markdown import/export implementation and dependencies.
- [ ] Specify Lexical JSON ↔ Markdown conversion using `@lexical/markdown` where appropriate.
- [ ] Define explicit representations for sidenotes and margin notes, including note identity and placement.
- [ ] Define image/asset paths, math, code, and Magnolia-style internal link conversion, keeping project-specific references optional.
- [ ] Document unsupported constructs and whether they are preserved as HTML extensions, metadata, or reported as lossy.
- [ ] Design round-trip tests (Lexical → Markdown → Lexical and Markdown → Lexical → Markdown) including the upstream Tufte sample, Unicode/Korean, and unknown extensions.
- [ ] Define schema/version compatibility and migration behavior.

## Acceptance criteria (future)

- Common Markdown elements import and export predictably.
- Tufte-specific constructs round-trip without silent data loss, or report documented limitations.
- Conversion does not couple the editor library to Magnolia storage or domain logic.
- Existing editor rendering and browser tests remain unaffected.

Do not implement until this P3 work is explicitly scheduled.
