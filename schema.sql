-- D1 schema for Vectorhelix contact submissions.
-- Apply with:
--   npx wrangler d1 execute vectorhelix-contacts --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  company     TEXT,
  message     TEXT NOT NULL,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts (created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_email      ON contacts (email);
