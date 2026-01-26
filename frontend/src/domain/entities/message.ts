import type { ApprovalStatus } from './approval';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface CodeBlock {
  type: 'code';
  language: string;
  content: string;
  filename?: string;
}

export interface FileBlock {
  type: 'file';
  path: string;
  action: 'read' | 'write' | 'edit';
  preview?: string;
}

export interface DiffBlock {
  type: 'diff';
  filePath: string;
  hunks: DiffHunk[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface CommandBlock {
  type: 'command';
  command: string;
  output?: string;
  exitCode?: number;
}

export interface ThinkingBlock {
  type: 'thinking';
  content: string;
  collapsed: boolean;
}

export interface ImageBlock {
  type: 'image';
  src: string;
  alt?: string;
}

export interface ListBlock {
  type: 'list';
  style: 'bullet' | 'numbered' | 'todo';
  items: Array<{
    content: string;
    checked?: boolean;
  }>;
}

export interface ApprovalBlock {
  type: 'approval';
  approvalId: string;
  toolName: string;
  toolCategory: 'safe' | 'requires-approval' | 'dangerous';
  summary: string;
  status: ApprovalStatus;
  timeoutAt: Date;
}

export type Block =
  | TextBlock
  | CodeBlock
  | FileBlock
  | DiffBlock
  | CommandBlock
  | ThinkingBlock
  | ImageBlock
  | ListBlock
  | ApprovalBlock;

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  blocks: Block[];
  timestamp: Date;
  tokenCount?: number;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
}
