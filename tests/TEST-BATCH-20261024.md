# Deferred regression batch (2026-10-24)

Status: **written, not executed**. Do not infer passing results.

## Run after dependencies and build

```sh
pnpm install --frozen-lockfile
pnpm build
node tests/run-editor-recovery-regressions.mjs
pnpm test
pnpm test:browser
pnpm test:upstream-full-page
pnpm test:upstream-sections
pnpm test:note-assets
```

Run locally as one coordinated verification batch; do **not** trigger CI.

## Added regression

- `tests/editor-invalid-restore-browser.mjs`: malformed persisted JSON, invalid Lexical root, unchanged live state, undo/redo, continued editing, save and reopen.
- `tests/editor-invalid-structure-save-browser.mjs`: image-less figure must reach the live structure inspector; manual invalid Save must preserve canonical bytes, create a v2:manual recovery snapshot, expose it immediately, and allow reopening in the same tab.
- `tests/editor-recovery-isolation-browser.mjs`: explicit restore, cancel, selective delete, remaining copy, and corrupted sibling isolation.
- `tests/editor-autosave-isolation-browser.mjs`: debounced automatic recovery does not overwrite manual canonical storage.
- `tests/run-editor-recovery-regressions.mjs`: opt-in runner for all four recovery suites.
- These tests are intentionally not part of `package.json`'s automatic scripts yet. Review failures before wiring it into the regular browser suite.
- The persisted JSON restore boundary is **not** an HTML import boundary.

## HTML import scope

As of this branch, `examples/editor/src/main.tsx` exposes a read-only JSON/HTML inspection panel, not an HTML import action. Do not invent a UI selector for HTML import. Once an actual HTML import API/UI is implemented, add a separate test for rejected markup, preservation of the canonical Lexical document, undo/redo history, and valid HTML recovery.

## Review criteria

1. A rejected import must not silently replace or delete the current canonical document.
2. Preserve damaged raw recovery material until explicitly cleaned up.
3. Verify history behavior with the actual editor; distinguish an implementation failure from an overstrict test assumption.
4. Record any failures and corrective changes before declaring the batch green.

## Known pre-run review risks

- The invalid-structure fixture now inserts an image-less figure in a section and requires the inspector warning. Verify actual Lexical parsing, UI diagnostics, and recovery-only persistence. Import rejection alone does **not** pass this test.
- The recovery isolation test injects a synthetic storage event and selects snapshots by their displayed key suffix, regardless of unrelated automatic session snapshots. Verify browser dialog handling and the storage refresh listener.
- The first recovery cancel path may show a single confirmation or a multi-snapshot prompt. Both cancellation paths must preserve the document.
- The undo/redo assertions in the invalid-restore test may depend on Lexical history grouping. Confirm history boundaries in the real browser before treating a failure as an application defect.
- The auto-save test depends on an 800 ms debounce; wait for the specific saved marker rather than assuming a fixed delay.

On 2026-10-24/25, this chat environment has Node 22 but no pnpm or checkout; GitHub clone failed with DNS resolution error (`Could not resolve host: github.com`). GitHub connector permitted code review and fixes only. **No local build/browser tests or CI were executed**. Current work remains unverified until a checkout with dependencies is available.
