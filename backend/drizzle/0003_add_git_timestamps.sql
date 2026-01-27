-- Migration: Add git timestamp fields
-- Add branch_created_at to tasks
ALTER TABLE tasks ADD COLUMN branch_created_at TEXT;

-- Add pushed_at to git_commit_approvals
ALTER TABLE git_commit_approvals ADD COLUMN pushed_at TEXT;
