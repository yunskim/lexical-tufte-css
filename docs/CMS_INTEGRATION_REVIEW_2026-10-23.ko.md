# CMS integration plan — independent multi-pass review (2026-10-23)

Scope: review of [draft v0.1](CMS_INTEGRATION_CONTRACT.ko.md) against [document schema v1](DOCUMENT_SCHEMA_V1.ko.md), [ADR-0002](adr/0002-document-and-rendering.ko.md), and [project plan](PLAN.ko.md). This is a design review, not implementation or executed tests.

## Verdict

**Revise before implementation.** The host-adapter boundary is appropriate, but v0.1 is not yet a safe implementable API. In particular, document identity, asset URL persistence, async rendering, and publication ownership have unresolved contradictions with the current v1 contract. Do not freeze its types.

## Pass 1 — Model and schema compatibility

- **Critical:** v1 `AssetRef` requires `src`, and managed images require matching `src`. The draft says not to persist expiring URLs, yet its `ResolvedAsset.src` can be a short-lived URL. These requirements cannot be satisfied simultaneously by merely adding a catalog. **Decision:** keep v1 unchanged; first distinguish canonical asset locator (stable host-managed URL where allowed) from ephemeral preview/delivery URL in a proposed v2, or use an explicitly materialized publication snapshot. No silent v1 schema weakening.
- **High:** existing `link` node has only `url`; storing stable document ID requires a new node or versioned metadata. **Decision:** propose a versioned `internal-link` semantic node, with display-label policy (auto-title vs custom label), migration, and export diagnostics; compare against extending `link` in an ADR.
- **High:** `ResourceId` is host-scoped; if documents cross hosts, IDs collide. **Decision:** reference identity is `{namespace, id}` or an opaque globally qualified identifier. Namespace binding is part of the host configuration and persisted representation.
- **Medium:** v1 `TufteDocument.id` and `PostMetadata.revision` are already defined; avoid a second conflicting revision authority.

## Pass 2 — Responsibility and package boundaries

- **Critical:** `PublicationTarget.publish(id, expectedRevision)` omits who performs pure rendering, resolves references, validates output, and writes immutable snapshots. **Decision:** the library supplies a pure, deterministic export pipeline; the host orchestrates authorization, resolution, snapshot storage and publishing. Specify explicit publication input/output and provenance, not a magical publish method.
- **High:** `DocumentStore` overlaps `PostRepository`, while `AssetCatalog` overlaps `AssetStore`. **Decision:** first create an API crosswalk; use optional extension interfaces or adapters rather than a second competing persistence stack.
- **High:** rendering is synchronous/pure today (ADR-0002), whereas host resolution is asynchronous. **Decision:** split `prepareExport(document, resolver)` (async, bounded, host-aware) from `renderPreparedArticle(prepared)` (sync, pure), or pass an immutable resolved reference map to the existing renderer. Keep network calls out of the pure renderer.
- **Medium:** keep link and asset pickers optional; a filesystem editor must still run without catalogs.

## Pass 3 — Workflow and failure semantics

- **High:** `save(document, expectedRevision: string)` cannot express creation, initial absence, or force/no-force conflict resolution. **Decision:** define explicit create/save semantics and an opaque revision token; do not silently overwrite.
- **High:** a save may succeed server-side while its response is lost; retry can create ambiguity. **Decision:** use idempotency keys for mutating host operations and a read-back reconciliation path.
- **High:** publication should bind an immutable exact document revision, resolved references, export profile/version, and asset versions where supported; title/asset changes after publishing must not silently mutate the published snapshot.
- **Medium:** pagination cursor semantics and search results must handle stale results and permission changes.

## Pass 4 — Security, privacy and trust

- **Critical:** resolving arbitrary external URLs during server export risks SSRF and information leaks. **Decision:** adapters must not fetch user-provided URLs by default; separate URL validation from content retrieval and enforce allowlists/proxy policies where fetching is necessary.
- **High:** never expose forbidden target title, preview URL, or cached metadata. Handle NOT_FOUND/FORBIDDEN with a privacy-preserving UI fallback.
- **High:** ephemeral signed asset URLs must not leak into canonical JSON, permanent Markdown, public HTML, logs, or caches beyond their expiry; publication needs stable delivery URLs or materialized immutable bytes.
- **Medium:** capability availability does not equal authorization. Require authorization at operation time.

## Pass 5 — Portability and exports

- **High:** Markdown export loses internal-link semantics if only a resolved URL is emitted. **Decision:** define explicit export profiles: portable Markdown (resolved links with loss diagnostics) and optionally host-aware Markdown (reference markers/frontmatter). Neither is canonical.
- **High:** HTML export must specify unresolved-reference behavior: fail publication by default for required assets, configurable warning for optional links; never silently omit.
- **Medium:** cross-host document import must explicitly remap qualified document and asset IDs and report unresolved references; simple JSON copy is not enough.

## Pass 6 — UX, accessibility and operations

- **Medium:** link picker needs IME-safe `[[` detection, keyboard/ARIA combobox semantics, request cancellation, stale-result suppression, and context-aware insertion.
- **Medium:** asset browser needs keyboard navigation, alt text editing, preview error states, filters and pagination.
- **Medium:** define request limits, timeouts, offline behavior, abort semantics, and bounded concurrency; avoid repeated per-node N+1 resolution during export.

## Repeated adversarial review — counterexamples

1. A signed image URL expires after save/reopen → v1 document can no longer render. **Fail until asset identity/delivery are separated.**
2. Two hosts both return document ID `123` → an imported internal link points to the wrong document. **Fail until qualified IDs.**
3. Rename linked document after publishing → published output changes on rebuild without a new snapshot. **Fail until reference snapshot policy.**
4. Save succeeds but HTTP response is lost → retry creates conflict or duplicate. **Fail until idempotency/reconciliation.**
5. A user loses permission after a search result was cached → stale picker reveals title or asset preview. **Fail until permission-aware invalidation.**
6. A reference resolver is async but renderer is pure sync → calling resolver during rendering breaks architecture. **Fail until two-stage export.**
7. A user pastes a remote URL pointing to a private IP → server fetch could reach internal services. **Fail until explicit no-fetch default.**

## Revised sequencing and checklists

### R0 — mandatory architectural decisions (block implementation)
- [ ] Produce actual interface crosswalk for `PostRepository`, `AssetStore`, `packages/adapter-fs`, renderer, and current image/link nodes.
- [ ] ADR: qualified identity, stable references, auto-title/custom-label behavior, and schema v2 migration/backward compatibility.
- [ ] ADR: stable asset locator vs expiring delivery URL; decide whether v1 stays limited to stable URLs.
- [ ] ADR: pure sync render vs async reference resolution and immutable export snapshot.
- [ ] ADR: publication ownership, revision token mapping, create/update, conflict and idempotency semantics.
- [ ] Agree on required/optional capabilities and security policy before freezing API.

### R1 — contract fixtures and proof of feasibility
- [ ] Write contract fixtures for the seven adversarial cases above.
- [ ] Prototype mock adapters and an async resolution-to-pure-render boundary without changing existing canonical JSON.
- [ ] Validate compatibility with existing v1 fixtures and official Tufte sample; do not change current gates.

### R2 — optional catalogs and pickers
- [ ] Implement optional document catalog, internal links, and accessibility/IME-safe picker.
- [ ] Implement optional asset catalog and browser; reuse existing image nodes when possible.
- [ ] Add permissions, offline, pagination, cancellation, and missing-reference tests.

### R3 — storage, publishing and external hosts
- [ ] Adapt existing filesystem/blog APIs first, preserving published snapshot behavior.
- [ ] Add portable/host-aware Markdown export policy and explicit loss diagnostics.
- [ ] Validate second host with mock Magnolia-shaped adapter (no Magnolia dependency).
- [ ] Run full regression and record commands/results; no CI unless separately requested.

## Review gates

The plan is ready for implementation only when all R0 ADRs are decided, interface crosswalk is complete, and R1 proof fixtures pass. Until then the v0.1 TypeScript snippet is illustrative and not a stable public API.

Priority remains deferred behind official Tufte CSS parity, round-trip integrity and editor stabilization.
