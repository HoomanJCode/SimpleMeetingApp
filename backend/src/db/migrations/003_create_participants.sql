CREATE TABLE IF NOT EXISTS participants (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    meeting_id  TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(meeting_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_meeting_user ON participants(meeting_id, user_id);
CREATE INDEX IF NOT EXISTS idx_participants_meeting_id ON participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
