/**
 * Database Connection
 * SQLite database initialization and connection management
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

function getDataDir(): string {
  const dataDir = join(homedir(), '.notecode', 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

function getDbPath(): string {
  return join(getDataDir(), 'app.db');
}

export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  if (db) {
    return;
  }

  const dbPath = getDbPath();
  console.log(`Initializing database at: ${dbPath}`);

  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });

  // Run migrations (create tables if not exist)
  await runMigrations();
}

async function runMigrations(): Promise<void> {
  if (!sqlite) {
    throw new Error('SQLite connection not established');
  }

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT UNIQUE NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      last_accessed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      description TEXT,
      focus_areas TEXT,
      default_skills TEXT,
      default_tools TEXT,
      inject_previous_summaries INTEGER DEFAULT 1,
      max_summaries_to_inject INTEGER DEFAULT 5,
      total_sessions INTEGER DEFAULT 0,
      total_tokens_used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_summaries (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      key_decisions TEXT,
      files_modified TEXT,
      token_count INTEGER DEFAULT 0,
      extracted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'not-started',
      priority TEXT DEFAULT 'medium',
      assignee TEXT,
      due_date TEXT,
      agent_role TEXT,
      provider TEXT,
      model TEXT,
      skills TEXT,
      tools TEXT,
      context_files TEXT,
      workflow_stage TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      provider_session_id TEXT,
      name TEXT,
      status TEXT DEFAULT 'queued',
      provider TEXT,
      process_id INTEGER,
      working_dir TEXT,
      started_at TEXT,
      ended_at TEXT,
      duration_ms INTEGER,
      token_input INTEGER DEFAULT 0,
      token_output INTEGER DEFAULT 0,
      token_cache_read INTEGER DEFAULT 0,
      token_cache_creation INTEGER DEFAULT 0,
      token_total INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0,
      model_usage TEXT,
      tool_stats TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      blocks TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      token_count INTEGER,
      tool_name TEXT,
      tool_input TEXT,
      tool_result TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT 'global',
      user_name TEXT,
      theme TEXT DEFAULT 'system',
      default_provider TEXT,
      default_model TEXT,
      api_keys TEXT,
      yolo_mode INTEGER DEFAULT 0,
      approval_gate TEXT,
      auto_extract_summary INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      tool_category TEXT DEFAULT 'requires-approval',
      matched_pattern TEXT,
      status TEXT DEFAULT 'pending',
      timeout_at TEXT NOT NULL,
      auto_action TEXT DEFAULT 'deny',
      decided_at TEXT,
      decided_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS diffs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
      tool_use_id TEXT NOT NULL,
      approval_id TEXT REFERENCES approvals(id) ON DELETE SET NULL,
      file_path TEXT NOT NULL,
      operation TEXT NOT NULL,
      old_content TEXT,
      new_content TEXT,
      full_content TEXT,
      line_start INTEGER,
      line_end INTEGER,
      hunks TEXT,
      status TEXT DEFAULT 'pending',
      applied_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cli_provider_hooks (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      name TEXT NOT NULL,
      hook_type TEXT NOT NULL,
      script TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      scope TEXT DEFAULT 'project',
      synced_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cli_provider_settings (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      settings TEXT NOT NULL,
      scope TEXT DEFAULT 'project',
      synced_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id);
    CREATE INDEX IF NOT EXISTS idx_agent_summaries_agent_id ON agent_summaries(agent_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_session_id ON approvals(session_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
    CREATE INDEX IF NOT EXISTS idx_diffs_session_id ON diffs(session_id);
    CREATE INDEX IF NOT EXISTS idx_diffs_approval_id ON diffs(approval_id);
    CREATE INDEX IF NOT EXISTS idx_diffs_tool_use_id ON diffs(tool_use_id);
  `);

  // Run schema migrations for new columns (ALTER TABLE)
  runSchemaMigrations();

  console.log('Database migrations completed');
}

/**
 * Run schema migrations to add new columns to existing tables
 * Uses try-catch to handle "column already exists" errors gracefully
 */
function runSchemaMigrations(): void {
  if (!sqlite) return;

  // Helper to safely add column (ignores "duplicate column" error)
  const addColumnIfNotExists = (table: string, column: string, type: string) => {
    try {
      sqlite!.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (error: unknown) {
      // Ignore "duplicate column name" error (column already exists)
      const msg = error instanceof Error ? error.message : '';
      if (!msg.includes('duplicate column name')) {
        console.warn(`Migration warning: ${msg}`);
      }
    }
  };

  // Sessions table migrations
  addColumnIfNotExists('sessions', 'parent_session_id', 'TEXT');
  addColumnIfNotExists('sessions', 'resume_mode', 'TEXT');
  addColumnIfNotExists('sessions', 'attempt_number', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('sessions', 'resumed_from_session_id', 'TEXT');
  addColumnIfNotExists('sessions', 'initial_prompt', 'TEXT');
  addColumnIfNotExists('sessions', 'included_context_files', 'TEXT');
  addColumnIfNotExists('sessions', 'included_skills', 'TEXT');
  addColumnIfNotExists('sessions', 'context_window_data', 'TEXT');

  // Projects table migrations
  addColumnIfNotExists('projects', 'system_prompt', 'TEXT');
  addColumnIfNotExists('projects', 'approval_gate', 'TEXT');

  // Tasks table migrations
  addColumnIfNotExists('tasks', 'parent_id', 'TEXT');
  addColumnIfNotExists('tasks', 'dependencies', 'TEXT');
  addColumnIfNotExists('tasks', 'subagent_delegates', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('tasks', 'auto_branch', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('tasks', 'auto_commit', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('tasks', 'branch_name', 'TEXT');
  addColumnIfNotExists('tasks', 'base_branch', 'TEXT');
  addColumnIfNotExists('tasks', 'branch_created_at', 'TEXT');
  addColumnIfNotExists('tasks', 'permission_mode', 'TEXT');
  addColumnIfNotExists('tasks', 'total_attempts', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('tasks', 'renew_count', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('tasks', 'retry_count', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('tasks', 'fork_count', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('tasks', 'last_attempt_at', 'TEXT');
  addColumnIfNotExists('tasks', 'last_provider_session_id', 'TEXT');

  // Settings table migrations
  addColumnIfNotExists('settings', 'fallback_model', 'TEXT');
  addColumnIfNotExists('settings', 'system_prompt', 'TEXT');
  addColumnIfNotExists('settings', 'current_active_project_id', 'TEXT');
  addColumnIfNotExists('settings', 'data_retention_enabled', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('settings', 'data_retention_days', 'INTEGER DEFAULT 90');
  addColumnIfNotExists('settings', 'user_email', 'TEXT');

  // Messages table migrations
  addColumnIfNotExists('messages', 'approval_id', 'TEXT');
  addColumnIfNotExists('messages', 'status', "TEXT DEFAULT 'complete'");
  addColumnIfNotExists('messages', 'stream_offset', 'INTEGER DEFAULT 0');

  // CLI provider hooks table migrations
  addColumnIfNotExists('cli_provider_hooks', 'matcher', 'TEXT');
  addColumnIfNotExists('cli_provider_hooks', 'timeout', 'INTEGER');
}

export async function closeDatabase(): Promise<void> {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
    console.log('Database connection closed');
  }
}
