ALTER TABLE notes ADD COLUMN assets_json TEXT NOT NULL DEFAULT '[]';
PRAGMA user_version = 3;
