-- Migration: Add attempt tracking and subagent delegation fields

-- Sessions table: Add resume mode and attempt tracking
ALTER TABLE sessions ADD COLUMN resume_mode TEXT;
ALTER TABLE sessions ADD COLUMN attempt_number INTEGER DEFAULT 1;
ALTER TABLE sessions ADD COLUMN resumed_from_session_id TEXT;

-- Tasks table: Add aggregate attempt counters
ALTER TABLE tasks ADD COLUMN total_attempts INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN renew_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN fork_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN last_attempt_at TEXT;

-- Tasks table: Add subagent delegation toggle
ALTER TABLE tasks ADD COLUMN subagent_delegates INTEGER DEFAULT 0;
