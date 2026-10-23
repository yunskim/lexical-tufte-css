# CMS R0 — code-level contract crosswalk (2026-10-23)

Status: PARTIAL INVENTORY, no runtime changes, no tests executed.
Reviewed code: `packages/document/src/{types,schema,validate}.ts`, `packages/render/src/index.ts`, `packages/blog/src/{index,publication}.ts`, plus project schema/plan/ADR. `packages/adapter-fs` was referenced by the plan but its package manifest and index were not found at the probed paths. Do not infer it exists.

| v0.1 proposed contract | Actual implementation | Gap / action |
| --- | --- | --- |
| `DocumentCatalog.search/resolve` | No matching contract in inspected files | Optional new discovery capability; must qualify IDs by host namespace. |
| `AssetCatalog.search/resolve` | `AssetRef` in document, no catalog in inspected files | Optional catalog; no assumption that `AssetStore` exists. |
| `DocumentStore.load/save` | `PostRecord` schema, `PostRecordV2` used by publication; no `PostRepository` implementation verified | Locate actual persistence/recovery entrypoints before proposing adapter. Avoid parallel persistence authority. |
| `PublicationTarget.publish` | `SqlitePublicationStore.publish(id,{expectedRevision:number,expectedGeneration:number,publishedAt,assetExists})` | Already has optimistic dual revision/generation checks, immutable snapshot and revalidation; wrap/extend, do not replace. |
| `ResolvedAsset.src` | `AssetRef.src` required, `ImageFields.src` required, validator enforces exact equality when `assetId` set | Ephemeral URL cannot simply be stored. Requires versioned asset resolution design. |
| `ResolvedLink` | `link` node requires `url`; renderer emits `href=n.url` | New semantic reference encoding + migration needed. |
| Async host resolution | `renderArticle(input,{idPrefix?})` synchronous and pure | Async preparation stage with immutable resolved map; preserve pure renderer. |
| `Result<T>` error union | document `Result<T>` uses `diagnostics` array; publication uses same | Prefer diagnostic mapping to duplicating incompatible error unions. |
| `revision:string` | `PostMetadata.revision:number`; publication also `generation:number` | Opaque token may exist only at adapter edge, with explicit mapping; preserve separate generation. |

## Concrete implementation findings

1. `SqlitePublicationStore` stores a snapshot containing `post`, `publishedRevision`, `generation`, `rendererProfile`, `assets`, `assetSources`, and `html`; it computes SHA-256 snapshot ID and rechecks draft revision and publication generation inside `BEGIN IMMEDIATE`. This is stronger than v0.1's simple `publish(id, expectedRevision)` proposal.
2. Publication currently preflights `assetExists(src)` and records source URLs; this proves existence at preflight but **does not prove immutable asset bytes or permanent delivery URLs**. Do not assert complete snapshot asset immutability.
3. Current `renderArticle` validates the document, checks render profile, then renders links from `url` and images from `src` without network calls. It must not become an async network renderer.
4. `validateDocument` rejects unknown fields, unknown nodes and unsupported schema versions. Host-qualified references require explicit schema evolution; merely adding fields to saved JSON will fail.
5. `AssetRef.mimeType` validator only accepts `image/*`, so generic attachments cannot be inserted using the current managed image asset contract. Asset browser may list generic files, but insertion requires a distinct explicit file/attachment node proposal.
6. `isSafeURL` validates URL syntax and protocol, not network reachability or SSRF. No remote fetching should be inferred safe from it.
7. Current `PostRecordV2` and publication storage must be included in any migration review; the v1-only draft was incomplete.

## Revised decisions recommended for ADR (not adopted yet)

- D1: host-qualified `ReferenceKey` = namespace + ID, with migration and display-label semantics.
- D2: asset identity, stable canonical locator, expiring preview/delivery URL, and publication materialization as distinct concepts.
- D3: `resolveForExport` async preparation producing a bounded, immutable manifest; pure synchronous renderer consumes prepared data, not network services.
- D4: existing publication lifecycle is authority; optional host facade must preserve numeric draft revision, generation, immutable snapshots and transactional rechecks.
- D5: separate generic attachment browsing from supported image insertion until a versioned attachment node is approved.
- D6: adapter error handling maps to existing diagnostics; avoid freezing an independent `Result<T>` public shape prematurely.

## Next work checklist

- [x] Inspect core schema, validator, renderer and actual publication implementation.
- [ ] Locate and inspect all active storage/recovery implementations and any filesystem adapter; distinguish planned APIs from code.
- [ ] Inventory editor insertion/link/image APIs and current test fixtures.
- [ ] Write D1–D6 ADR(s) with alternative evaluation and explicit migration strategy.
- [ ] Add mock contract and adversarial fixtures; execute tests only when requested or at planned verification gate.
- [ ] Update the draft TypeScript interfaces only after ADR review.

This crosswalk is evidence-based for the files explicitly inspected; absence of an interface in those files is not proof of absence throughout the repository.
