-- Migration: Add hooks table for extensible event hooks system
-- Allows users to run custom shell commands, HTTP webhooks, or WebSocket notifications

CREATE TABLE hooks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT NOT NULL,
  filters TEXT,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hooks_project ON hooks(project_id);
CREATE INDEX idx_hooks_event ON hooks(event);
CREATE INDEX idx_hooks_enabled ON hooks(enabled);
