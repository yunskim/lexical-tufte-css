# Deferred regression batch (2026-10-24)

Status: **written, not executed**. Do not infer passing results.

## Run after dependencies and build

```sh
pnpm install --frozen-lockfile
pnpm build
node tests/editor-invalid-restore-browser.mjs
pnpm test
pnpm test:browser
pnpm test:upstream-full-page
pnpm test:upstream-sections
pnpm test:note-assets
```

Run locally as one coordinated verification batch; do **not** trigger CI.

## Added regression

- `tests/editor-invalid-restore-browser.mjs`: malformed persisted JSON, invalid Lexical root, unchanged live state, undo/redo, continued editing, save and reopen.
- The test is intentionally not part of `package.json`'s automatic scripts yet. Review failures before wiring it into the regular browser suite.
- The persisted JSON restore boundary is **not** an HTML import boundary.

## HTML import scope

As of this branch, `examples/editor/src/main.tsx` exposes a read-only JSON/HTML inspection panel, not an HTML import action. Do not invent a UI selector for HTML import. Once an actual HTML import API/UI is implemented, add a separate test for rejected markup, preservation of the canonical Lexical document, undo/redo history, and valid HTML recovery.

## Review criteria

1. A rejected import must not silently replace or delete the current canonical document.
2. Preserve damaged raw recovery material until explicitly cleaned up.
3. Verify history behavior with the actual editor; distinguish an implementation failure from an overstrict test assumption.
4. Record any failures and corrective changes before declaring the batch green.
