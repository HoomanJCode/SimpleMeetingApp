-- Tags for categorizing meetings (predefined set, admin-managed).
CREATE TABLE IF NOT EXISTS tags (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

-- Many-to-many junction between meetings and tags.
CREATE TABLE IF NOT EXISTS meeting_tags (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_tags_meeting ON meeting_tags(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_tags_tag ON meeting_tags(tag_id);

-- Seed the default tag palette. INSERT OR IGNORE keeps this idempotent.
INSERT OR IGNORE INTO tags (id, name, color) VALUES
  ('tag-workshop',   'Workshop',   '#f59e0b'),
  ('tag-social',     'Social',     '#ec4899'),
  ('tag-tech',       'Tech Talk',  '#3b82f6'),
  ('tag-networking', 'Networking', '#10b981'),
  ('tag-online',     'Online',     '#8b5cf6'),
  ('tag-urgent',     'Urgent',     '#ef4444');
