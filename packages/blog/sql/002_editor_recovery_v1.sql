-- Recovery-only storage. Never use this table as a publishable post source.
-- Apply after posts_v2; do not cascade-delete recoveries without a retention policy.
CREATE TABLE IF NOT EXISTS editor_recovery_v1 (
 post_id TEXT NOT NULL,
 session_id TEXT NOT NULL,
 sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 9007199254740991),
 base_revision INTEGER NOT NULL CHECK(base_revision >= 0),
 saved_at TEXT NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 checksum TEXT NOT NULL CHECK(length(checksum)=64 AND checksum NOT GLOB '*[^0-9a-f]*'),
 PRIMARY KEY(post_id,session_id)
);
CREATE INDEX IF NOT EXISTS editor_recovery_v1_saved_at_idx ON editor_recovery_v1(saved_at);
