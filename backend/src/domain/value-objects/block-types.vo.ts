/**
 * Block Types Value Object
 * Defines message content block types for chat rendering
 */

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface CodeBlock {
  type: 'code';
  language: string;
  content: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  content: string;
}

export interface CommandBlock {
  type: 'command';
  command: string;
  output: string;
  exitCode: number;
}

export interface FileBlock {
  type: 'file';
  path: string;
  action: 'read' | 'create' | 'delete';
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface DiffBlock {
  type: 'diff';
  id: string;
  toolUseId: string;
  approvalId: string | null;
  filePath: string;
  operation: 'edit' | 'write' | 'delete';
  oldContent: string | null;
  newContent: string | null;
  fullContent: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  hunks: DiffHunk[];
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  appliedAt: Date | null;
}

export interface ApprovalBlock {
  type: 'approval';
  approvalId: string;
  diffId: string;
  toolName: string;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  decidedAt: Date | null;
}

export type Block =
  | TextBlock
  | CodeBlock
  | DiffBlock
  | ApprovalBlock
  | FileBlock
  | CommandBlock
  | ThinkingBlock;

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
