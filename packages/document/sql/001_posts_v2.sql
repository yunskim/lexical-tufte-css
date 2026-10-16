-- Lexical Tufte v2 posts: apply before using SqlitePostRevisionStoreV2.
-- Run schema migrations through the host's migration mechanism.
CREATE TABLE IF NOT EXISTS posts_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  CHECK (json_extract(payload, '$.document.id') = id),
  CHECK (json_extract(payload, '$.metadata.slug') = slug),
  CHECK (json_extract(payload, '$.metadata.revision') = revision),
  CHECK (json_extract(payload, '$.document.schemaVersion') = 2)
);
CREATE INDEX IF NOT EXISTS posts_v2_revision_idx ON posts_v2 (revision);
