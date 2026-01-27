-- Migration: Add context tracking fields to sessions for delta injection
-- These fields track what contextFiles and skills were included at last message
-- to compute delta (new files only) on subsequent messages

ALTER TABLE sessions ADD COLUMN included_context_files TEXT;  -- JSON array of file paths
ALTER TABLE sessions ADD COLUMN included_skills TEXT;         -- JSON array of skill names

-- Data migration: Set empty arrays for existing sessions
UPDATE sessions
SET included_context_files = '[]',
    included_skills = '[]'
WHERE included_context_files IS NULL
   OR included_skills IS NULL;
