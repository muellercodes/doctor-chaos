-- total money earned (for the money leaderboard)
ALTER TABLE users ADD COLUMN earned INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_earned ON users(earned DESC);
