# AI agent document API and revision history plan

Status: planned, not implemented. Begin after the current note-model parity phase and its batched tests. The GUI remains primary; agents use the same validated document model.

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
