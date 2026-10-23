# AI agent document API and revision history plan

Status: DESIGN ONLY / DEFERRED. Do not implement agent-specific features until the core editor, document format, Tufte publication parity and existing features are complete and the plan has passed repeated design reviews. The GUI remains primary; agents will eventually use the same validated document model.

## Goals
- Read document structure, text, annotations, assets and revision metadata without relying on transient Lexical NodeKey.
- Propose and apply spelling/grammar fixes and substantive editorial reviews; distinguish suggestions from accepted edits.
- Insert, replace, reference and remove image assets, including SVG, with alt text, provenance and safe rendering.
- Record who changed what and when; inspect semantic and text diffs, and restore prior versions safely.
- Preserve Tufte CSS publication parity, including distinct sidenote and marginnote types.

## Architecture decisions
1. Canonical document envelope and schema validation are shared by GUI and agent adapters. Agent writes go through semantic operations, not arbitrary raw Lexical mutations.
2. Give editable blocks and addressable inline objects persistent IDs, independent of Lexical NodeKey. Assign IDs on creation and preserve them across serialization; copying generates new IDs.
3. Use optimistic concurrency: every write supplies expected document revision and operation IDs; stale revisions reject with conflict details, never silently overwrite.
4. Keep actor identity explicit (human, agent, system), authenticated by the host. Never trust a caller-supplied display name as proof of authorship.
5. Store immutable revision events with actor, UTC timestamp, base revision, operation summary and resulting content hash. Distinguish agent suggestion, human approval and applied change.
6. Store binary assets separately from document JSON, referenced by stable asset ID and immutable content digest. Validate MIME and dimensions; sanitize SVG and prohibit executable scripts, event handlers, external resource references and unsafe embedded content before preview or publication. Never treat raw SVG as trusted HTML.
7. Make history and diffs read-only projections over revisions. Support text-range and structural node changes, asset additions/removals, and note edits; provide an exact old/new snapshot fallback when semantic diff is ambiguous.
8. Maintain explicit permissions: read, suggest, edit, asset-write, approve, history-read and restore. Default agent to suggest-only unless explicitly granted edit privileges.
9. Keep API transport independent: in-process TypeScript API first; optional HTTP/MCP adapter later. Do not tie core model to one agent provider.

## Proposed operations (interfaces to refine)
- `readDocument({revision?})`, `listNodes({sectionId?,cursor?})`, `readNode({id,revision?})`
- `reviewSpelling({scope,locale})`, `reviewContent({scope,criteria})`, `listSuggestions()`, `acceptSuggestion({id,expectedRevision})`, `rejectSuggestion({id})`
- `applyOperations({expectedRevision,operationId,changes})` with replace text, insert/remove/move block, insert/update note, set attributes and asset references
- `uploadAsset({bytes,mimeType,filename,alt,source})`, `insertAsset({assetId,anchor,layout})`, `replaceAsset({nodeId,assetId})`
- `listRevisions({cursor?})`, `getRevision({id})`, `diffRevisions({from,to})`, `restoreRevision({id,expectedRevision})`
These are proposed contracts, not existing APIs.

## Delivery gate and staged design reviews

- **Now:** planning and repeated review only. No agent API, revision store, suggestion UI, new dependencies, or migrations in the current implementation phase.
- **Review 1 — model boundaries:** compare proposed operations with existing schema, Lexical state, validation, renderer and asset ownership; identify coupling and missing invariants.
- **Review 2 — adversarial scenarios:** examine concurrent edits, stale anchors, malformed documents, partial asset failures, unsafe SVG, impersonation, undo/redo and lost updates.
- **Review 3 — usability and interoperability:** evaluate GUI-first workflows, provider-neutral agent access, permission boundaries, diff readability and portability of stored documents.
- **Review 4 — implementation readiness:** resolve open decisions, define contracts and acceptance tests, assess migrations and costs, then explicitly request approval before implementation.
- Gate: core product functionality complete, its batch tests passing, design reviews recorded and user explicitly authorizes implementation. Until then, checklist items below remain deferred.

## Low-cost extensibility rules for current core work

- Keep document parsing/validation/rendering independent of GUI commands, network transports and agent SDKs.
- Do not expose transient Lexical NodeKey as a persistent external identifier or bake it into stored cross-document references.
- Centralize mutation invariants and diagnostics where practical; avoid a second undocumented document format for future agents.
- Maintain asset references as logical IDs rather than editor DOM URLs, and keep raw asset ingestion separate from HTML publication.
- Avoid hardcoding a single actor, storage backend, review provider or transport into core types. Do not introduce speculative abstraction layers before a real second implementation exists.
- Preserve deterministic serialization and rendering to support future revision diffs and auditability.
- Record any current design decision that would make later stable IDs, optimistic concurrency or provenance prohibitively expensive; prefer a small seam now over a premature subsystem.

## Open design questions (do not prematurely settle)

- Whether revisions live in the document envelope, an append-only sidecar, or a separate host store.
- Whether stable IDs are assigned to blocks only or also inline spans and text ranges, and how anchors survive edits.
- How agent proposals interact with GUI undo history, approval, and multi-step transactions.
- Whether SVG is preserved as sanitized SVG, rasterized for display, or both, and what the threat model permits.
- How identity and timestamp provenance are verified across offline, local-first and remote workflows.
- Whether HTTP, MCP, or another transport is justified once the in-process contracts stabilize.

## Implementation phases
- [ ] A0. Inventory existing document schema, asset storage, editor commands, export/import, and validation boundaries; document gaps.
- [ ] A1. Design persistent IDs, revision envelope, actor model, operation IDs and conflict semantics. Decide migration policy for existing pre-release documents explicitly.
- [ ] A2. Implement read-only structured inspection and stable addressing with tests.
- [ ] A3. Implement validated transactional write operations and optimistic concurrency; prevent partial application.
- [ ] A4. Implement suggestion workflow for spelling, grammar and content review, with preview, acceptance and rejection.
- [ ] A5. Implement image/SVG asset ingestion, safety checks, references, preview and publication parity tests.
- [ ] A6. Implement append-only audit/revision history, actor/timestamp display, semantic and text diffs, and restoration.
- [ ] A7. Expose agent adapter(s), authorization, quotas and structured diagnostics.
- [ ] A8. Run batch typecheck, unit, browser, security and round-trip tests; do not run CI unless requested.

## Acceptance criteria
- Every applied edit is attributable to an actor and timestamp, with before/after revision and inspectable diff.
- Two concurrent edits based on one revision cannot silently overwrite each other.
- Agent suggestions never change published content until accepted or explicitly applied.
- Rich sidenote/marginnote, newthought adjacency, links and inline images survive agent operations and export/import.
- Unsafe SVG payloads are rejected or sanitized without executing active content.
- Asset references and audit events remain consistent on rejected or failed transactions.
- GUI and agent changes produce the same schema-valid, deterministic published HTML for equivalent documents.
