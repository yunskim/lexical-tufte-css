-- Apply after document/sql/001_posts_v2.sql. Requires SQLite JSON support.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS publication_snapshots_v1 (
 snapshot_id TEXT PRIMARY KEY NOT NULL CHECK(length(snapshot_id)=64 AND snapshot_id NOT GLOB '*[^0-9a-f]*'),
 post_id TEXT NOT NULL REFERENCES posts_v2(id),
 source_revision INTEGER NOT NULL CHECK(source_revision>=1),
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 UNIQUE(snapshot_id,post_id),
 CHECK(json_extract(payload,'$.snapshotVersion')=1),
 CHECK(json_extract(payload,'$.post.document.id')=post_id),
 CHECK(json_extract(payload,'$.publishedRevision')=source_revision),
 CHECK(json_extract(payload,'$.post.metadata.revision')=source_revision),
 CHECK(json_type(payload,'$.html')='text')
);
CREATE TABLE IF NOT EXISTS publication_heads_v1 (
 post_id TEXT PRIMARY KEY NOT NULL REFERENCES posts_v2(id),
 generation INTEGER NOT NULL CHECK(generation BETWEEN 1 AND 9007199254740991),
 snapshot_id TEXT,
 last_snapshot_id TEXT NOT NULL,
 first_published_at TEXT NOT NULL,
 last_published_at TEXT NOT NULL,
 published_revision INTEGER NOT NULL CHECK(published_revision>=1),
 FOREIGN KEY(snapshot_id,post_id) REFERENCES publication_snapshots_v1(snapshot_id,post_id),
 FOREIGN KEY(last_snapshot_id,post_id) REFERENCES publication_snapshots_v1(snapshot_id,post_id)
);
CREATE TRIGGER IF NOT EXISTS publication_snapshot_no_update
 BEFORE UPDATE ON publication_snapshots_v1 BEGIN SELECT RAISE(ABORT,'Publication snapshots are immutable'); END;
CREATE TRIGGER IF NOT EXISTS publication_snapshot_no_delete
 BEFORE DELETE ON publication_snapshots_v1 BEGIN SELECT RAISE(ABORT,'Publication snapshots are retained'); END;
