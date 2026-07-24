-- Add cover photo URL to meetings table
ALTER TABLE meetings ADD COLUMN cover_photo_url TEXT;

-- Create meeting photos table for the photo gallery
CREATE TABLE IF NOT EXISTS meeting_photos (
  id         TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_meeting_photos_meeting ON meeting_photos(meeting_id);
