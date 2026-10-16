# Dependency baseline

Checked against npm registry on 2026-10-16.

- lexical and direct @lexical packages: 0.52.0, exact versions.
- @lexical/react peer requirements: React/React DOM >=18.x, TypeScript >=5.2, Yjs >=13.5.37.
- React/React DOM 19.2.0, TypeScript 6.0.2 and Yjs 13.6.27 are pinned compatible baselines, not claims of latest releases.
- Tufte CSS: 1.9.0; upstream source commit is in PLAN.ko.md.
- pnpm 11.25.0; Node >=22.

Run `pnpm install --frozen-lockfile`, then `pnpm check`. CI is intentionally omitted.
