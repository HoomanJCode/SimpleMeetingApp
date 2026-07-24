-- Add password_hash column for userpass auth mode.
-- NULL for Google OAuth users; populated for email/password users.
ALTER TABLE users ADD COLUMN password_hash TEXT;
