-- gifts sent from the creator's admin panel, claimed by the player's game on its next sync
CREATE TABLE IF NOT EXISTS gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  money INTEGER NOT NULL DEFAULT 0,
  upgrades TEXT,
  from_name TEXT,
  created_at INTEGER NOT NULL,
  claimed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_gifts_user ON gifts(user_id, claimed_at);
ALTER TABLE users ADD COLUMN gifted INTEGER NOT NULL DEFAULT 0;
