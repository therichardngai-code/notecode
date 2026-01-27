-- Migration: Add permission_mode to tasks
ALTER TABLE tasks ADD COLUMN permission_mode TEXT;
