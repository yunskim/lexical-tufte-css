# ADR-0004 — Should canonical and recovery storage use different contracts?

Status: **Proposed conclusion: unify storage primitives; keep domain policies separate** (2026-10-23). Static code comparison only; no tests or implementation.

## Sources inspected

- `packages/document/src/revisionStore.ts`
- `packages/document/src/sqliteRevisionStore.ts`
- `packages/blog/src/recovery.ts`
- `packages/blog/src/recoveryHost.ts`
- `packages/blog/src/publication.ts`

## Comparison

| Property | Canonical post | Recovery slot | Does it require a distinct generic storage contract? |
| --- | --- | --- | --- |
| Key | post ID; slug checked on write | (postId, sessionId) | **No**. Generic key type or composite key. |
| Value | validated `PostRecordV2` | JSON payload + metadata + checksum | **No**. Typed payload + validator. |
| Version | revision >=1; next = expected+1 | sequence >=1; next = expected+1, initial expected=0 | **No**. CAS with version policy. |
| Atomicity | SQLite conditional UPDATE | BEGIN IMMEDIATE, SELECT then INSERT/UPDATE | **No**. Both implement atomic CAS, with different database drivers. |
| Create | `insert`, revision=1 | first `save` with expectedSequence=0 | **No**. Explicit create-if-absent. |
| Read | Not exposed by `PostRevisionStoreV2`; publication reads drafts internally | `read` | **No**. An incomplete interface is not a semantic prohibition. |
| List | Not in inspected revision store | list recovery sessions by post | **No**. Optional query capability. |
| Delete | Not in inspected revision store | conditional remove | **No**. Optional operation or policy gate. |
| Authorization | not built into revision store | `AuthorizedRecoveryService` wraps store | **No**. Host/service policy, not storage primitive. |
| Integrity | strict post validation | checksum on read + raw JSON | **No**. Validator/checksum policy. |
| Retention | canonical history and publication separately | ephemeral sessions | **No**. Lifecycle policy. |
| Publishability | validated canonical record can enter publication | raw recovery payload cannot publish directly | **No**. Domain gate, not CAS contract. |

## What actually justifies differences?

There **are** good reasons for distinct **domain-facing APIs**:
1. Canonical post operations must enforce `slug`, `createdAt`, `updatedAt`, schema, and monotonic revision.
2. Recovery operations must enforce session ownership, payload size, checksum, session-scoped sequence, and recovery lifecycle.
3. Publication must preserve independent `generation`, transactional snapshot invariants and render preflight. It is not just another CAS value.

These do **not** justify two unrelated low-level versioned-store abstractions. In particular, both current implementations already use a `Result<T>` with diagnostics and version CAS. The earlier assertion that distinct purposes entail distinct storage contracts was too strong.

## Proposed minimal shared primitive (illustrative, not frozen API)

```ts
type Versioned<T> = {value:T; version:number};
interface VersionedStore<K,T> {
  read(key:K):Promise<Result<Versioned<T>|null>>;
  create(key:K,value:T):Promise<Result<Versioned<T>>>;
  compareAndSwap(key:K,expectedVersion:number,next:T):Promise<Result<Versioned<T>>>;
  delete(key:K,expectedVersion:number):Promise<Result<boolean>>;
}
```

Design cautions:
- **Do not make `delete` mandatory** if a host cannot or must not delete canonical posts. Optional capability or domain adapter is preferable.
- `list` is a separate query/index capability, not necessarily part of every store.
- CAS version is the stored record's concurrency token; don't conflate recovery `baseRevision` with recovery `sequence`, or publication `generation` with post revision.
- A generic store must not silently accept an arbitrary next version: domain adapters validate the record and control the increment.
- Existing post SQLite adapter uses async D1-like `prepare().bind().run()`; recovery and publication use synchronous `exec/prepare().get().run()` transactions. A common **logical contract** does not require one physical SQL driver or one shared implementation.
- Retry ambiguity remains: read-back reconciliation or idempotency is still needed for unreliable transport.
- `read` and `delete` must not be bolted onto existing APIs without checking all callers and security constraints.

## Decision / burden of proof

**Reject the claim that separate basic storage contracts are required.** Keep current APIs stable for now; prefer a shared storage primitive if/when CMS adapters or refactoring demonstrate actual duplication. Retain distinct domain services for validation, authorization, publication and recovery policy.

The burden of proof is on a future proposal for separate primitives: it must demonstrate an invariant impossible or materially unsafe to express via the shared interface, with a failing fixture. Differences in table name, payload, key type, retention or UI do not meet that bar.

## Next steps

- [x] Compare code-level CAS, create/read/delete, validation, authorization and publication.
- [x] Document reasons that justify domain policy differences, not separate primitives.
- [ ] Add contract fixtures covering create conflict, CAS success/conflict, conditional delete, session isolation, recovery baseRevision and post revision independence, read-back after unknown outcome.
- [ ] Compare API feasibility on D1-style async SQLite and synchronous SQLite; no forced shared driver.
- [ ] Only then consider a shared adapter/prototype, without breaking existing public APIs.

No code or tests were changed or run.
