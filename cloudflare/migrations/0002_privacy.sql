ALTER TABLE users ADD COLUMN friend_request_policy TEXT NOT NULL DEFAULT 'everyone' CHECK (friend_request_policy IN ('everyone', 'mutuals', 'nobody'));

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
