# @lexical-tufte/blog — publication lifecycle

R11 reference SQLite publication adapter. It uses the existing v2 draft records and a separate snapshotVersion 1 publication model. It does not add publication fields to the existing document or PostMetadata schema.

Apply `@lexical-tufte/document/sql/001_posts_v2.sql`, then `@lexical-tufte/blog/sql/001_publications_v1.sql` through the host migration system. Both are exported package subpaths readable via `import.meta.resolve`. Supply a dedicated synchronous SQLite connection, such as Node's `DatabaseSync`; this adapter is not a D1 implementation. Keep foreign keys enabled on every connection.

```ts
import {SqlitePublicationStore} from '@lexical-tufte/blog';
const publications = new SqlitePublicationStore(db);
const result = await publications.publish(postId, {
  expectedRevision: 3,
  expectedGeneration: 0, // readState(postId) gives the current generation
  publishedAt: new Date().toISOString(),
  assetExists: async src => hostAssetStore.exists(src),
});
if (!result.ok) return result.diagnostics;
const publicPage = await publications.readPublic(postId);
```

The host must create drafts using the existing revision adapter, validate actual assets, authenticate administrative requests, and serve only `readPublic` snapshots. Draft metadata status is not the public visibility flag. Asset checks happen before a short `BEGIN IMMEDIATE` transaction; the adapter then rechecks the entire selected draft and publication generation, inserts an immutable snapshot, and switches its pointer in that transaction. No asynchronous work runs inside the transaction.

Snapshots include the detached document/metadata, source revision, publication generation, first/current publication timestamps, renderer profile, HTML, asset metadata and referenced image source manifest. SHA-256 verifies stored snapshot bytes on reads. It detects corruption, not an attacker who controls the database and can recompute hashes. Read operations use a single joined SELECT before checksum verification, so an in-flight read may finish with the coherent snapshot it selected before a concurrent unpublish.

`unpublish(id, expectedGeneration)` removes public visibility while retaining draft, history, first publication time, source revision and snapshots. Republish may reuse the same draft revision with a later publication time and a new generation. Slug changes after any publication are rejected until a separate redirect transaction is implemented. Snapshot update/delete triggers protect historical data. Hosts must retain all assets referenced by historical snapshots, including private posts; no asset deletion API is provided here.

Do not nest calls in a host transaction. Keep transactions on a dedicated connection. Before-commit insertion/pointer failures are rolled back. For an ambiguous connection/storage failure around commit, reread publication state before retrying; a failure response never claims a successful publication. Filesystem repository, redirects, SSG/feed/listing, authentication, asset GC and deploy integration remain P5 work.

Local evidence: `test/publication.test.mjs` uses actual SQLite, separate connections, close/reopen, draft changes during asset checks, competing publishers, insert/pointer fault injection and checksum damage. No CI.
