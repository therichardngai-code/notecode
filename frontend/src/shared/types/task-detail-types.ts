/**
 * Shared types for Task Detail components
 * Used by both FullView (tasks.$taskId.tsx) and FloatingTaskDetailPanel
 */

// Tool command displayed in chat messages
export interface ToolCommand {
  cmd: string;
  status: 'success' | 'running' | 'pending';
  input?: Record<string, unknown>;
}

// Chat message for UI display
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: { name: string; additions?: number; deletions?: number }[];
  commands?: ToolCommand[];
  todos?: { text: string; checked: boolean }[]; // Optional todos from assistant
}

// Diff line type
export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  lineNum: number;
  content: string;
}

// Diff chunk/hunk
export interface DiffChunk {
  header: string;
  lines: DiffLine[];
}

// UI-formatted diff for display
export interface UIDiff {
  id: string;
  filename: string;
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
}
