-- Migration: Add git integration for task branch management and commit approvals

-- Tasks table: Add git config fields
ALTER TABLE tasks ADD COLUMN auto_branch INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN auto_commit INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN branch_name TEXT;
ALTER TABLE tasks ADD COLUMN base_branch TEXT;

-- Git commit approvals table
CREATE TABLE git_commit_approvals (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  commit_message TEXT,
  files_changed TEXT,
  diff_summary TEXT,
  commit_sha TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_git_approvals_project_status ON git_commit_approvals(project_id, status);
CREATE INDEX idx_git_approvals_task ON git_commit_approvals(task_id);
