PRAGMA foreign_keys = OFF;

CREATE TABLE spots_next (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT NOT NULL,
  google_rating REAL NOT NULL DEFAULT 0,
  personal_rating REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'friends', 'public')),
  google_place_id TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO spots_next SELECT * FROM spots;
DROP TABLE spots;
ALTER TABLE spots_next RENAME TO spots;
CREATE INDEX spots_owner_location ON spots(user_id, latitude, longitude);

PRAGMA foreign_keys = ON;
