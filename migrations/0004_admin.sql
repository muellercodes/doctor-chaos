-- rank on the leaderboard, hiding players from the boards, admin actions, and game-wide events
ALTER TABLE users ADD COLUMN rank INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gifts ADD COLUMN action TEXT;
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_rank ON users(rank DESC);
