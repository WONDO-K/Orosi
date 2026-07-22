CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  document_json TEXT NOT NULL,
  derived_text TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  base_revision INTEGER NOT NULL DEFAULT 0,
  sync_state TEXT NOT NULL CHECK (sync_state IN ('pending', 'synced', 'error')),
  deleted_at TEXT,
  purge_after TEXT
);

CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_deleted_at_idx ON notes(deleted_at);
PRAGMA user_version = 1;
