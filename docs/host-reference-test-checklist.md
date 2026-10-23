# Host reference: batched verification checklist

Status: **not executed**. This document records checks to run together when testing is authorized. Do not interpret added tests as passing.

## Contract

- [ ] `packages/document`: accept `{namespace,kind,id}` with supported kinds; reject missing, unknown, overlong and malformed fields.
- [ ] `packages/lexical`: insert a reference around selected text, reject collapsed selections and nested links, preserve identity through JSON export/import.
- [ ] `packages/lexical`: editor DOM uses a non-navigable `span`; updates preserve `tufte-host-link` and do not duplicate it.
- [ ] `packages/render`: publish a `span` with all three `data-host-*` attributes; escape attributes and text; never produce a navigation URL.
- [ ] `packages/render`: reject invalid identities and nested links with diagnostics and `html: null`.
- [ ] Cross-package: save → load → publish preserves identity and text; publication does not mutate input and is deterministic.

## Batched execution (only on explicit request)

1. Install dependencies with the repository's pinned pnpm version.
2. Build workspace packages before running Node tests that import `dist` files.
3. Run `pnpm --filter @lexical-tufte/document test`, `pnpm --filter @lexical-tufte/lexical test`, and `pnpm --filter @lexical-tufte/render test`.
4. Run workspace type checking, remaining unit tests and browser tests, including upstream Tufte CSS comparisons.
5. Fix failures and rerun the affected checks. Report pass/fail/skip separately; **do not run CI** unless explicitly requested.

## Integration-test review risks

- The Lexical test imports `../../render/dist/index.js`; the renderer must be built before that test. This is a test-only cross-package import, not a runtime dependency.
- Verify `loadDocumentIntoEditor` strict import does not normalize the saved host-link state.
- Verify the HTML assertions against actual serializer output rather than weakening escaping or schema validation.
- Keep the published reference as an identity, not an `href`; navigation remains a host responsibility.
