# Dependency baseline

Checked against npm registry on 2026-10-16.

- lexical and direct @lexical packages: 0.52.0, exact versions.
- @lexical/react peer requirements: React/React DOM >=18.x, TypeScript >=5.2, Yjs >=13.5.37.
- React/React DOM 19.2.0, TypeScript 6.0.2 and Yjs 13.6.27 are pinned compatible baselines, not claims of latest releases.
- Tufte CSS: 1.9.0; upstream source commit is in PLAN.ko.md.
- pnpm 11.25.0; Node >=22.

Run `pnpm install --frozen-lockfile`, then `pnpm check`. CI is intentionally omitted.

## P1 prototype additions

- Vite 8.3.4, @types/react and @types/react-dom 19.2.2.
- Playwright 1.51.1 is the local regression harness baseline; Chromium 134 headless shell was used. This is a tested baseline, not a latest-version claim. Browser binaries are installed separately and are not committed.
- `pnpm check` now also executes the headless regression tests. `pnpm test:browser` builds first, then checks actual browser interaction.
