// Property config for task panels (single source of truth)

import {
  Sparkles,
  Folder,
  Bot,
  Zap,
  Wrench,
  FolderOpen,
  Search,
  FileCode,
  Terminal,
  GitBranch,
  FileText,
  Clock,
} from 'lucide-react';

// Property type definitions for "Add property" dropdown
export const propertyTypes = [
  { id: 'project', label: 'Project', icon: Folder, description: 'Select project workspace' },
  { id: 'agent', label: 'Agent', icon: Bot, description: 'Select an AI agent' },
  { id: 'provider', label: 'Provider', icon: Sparkles, description: 'Select AI provider' },
  { id: 'model', label: 'Model', icon: Zap, description: 'Select AI model' },
  { id: 'priority', label: 'Priority', icon: Zap, description: 'Set task priority' },
  { id: 'skills', label: 'Skills', icon: Zap, description: 'Add required skills' },
  { id: 'tools', label: 'Tools', icon: Wrench, description: 'Select available tools' },
  { id: 'context', label: 'Context', icon: FolderOpen, description: 'Add context files' },
] as const;

// Status property type (for task detail edit mode)
export const statusPropertyType = { id: 'status', label: 'Status', icon: Clock, description: 'Set task status' };

// Project options for dropdowns
export const projectOptions = [
  { id: 'notecode', label: 'notecode' },
  { id: 'gemkit-cli', label: 'gemkit-cli' },
  { id: 'ai-dashboard', label: 'ai-dashboard' },
];

// Mock projects with favorites/recent for project search
export const mockProjects = {
  favorites: [
    { id: 'notecode', label: 'notecode', path: '/projects/notecode' },
    { id: 'gemkit-cli', label: 'gemkit-cli', path: '/projects/gemkit-cli' },
    { id: 'ai-dashboard', label: 'ai-dashboard', path: '/projects/ai-dashboard' },
  ],
  recent: [
    { id: 'testing-0.4', label: 'testing-0.4', path: '/projects/testing-0.4' },
    { id: 'gemkit-ecosystem', label: 'gemkit-ecosystem', path: '/projects/gemkit-ecosystem' },
    { id: 'docs-portal', label: 'docs-portal', path: '/projects/docs-portal' },
  ],
  all: [
    { id: 'notecode', label: 'notecode', path: '/projects/notecode' },
    { id: 'gemkit-cli', label: 'gemkit-cli', path: '/projects/gemkit-cli' },
    { id: 'ai-dashboard', label: 'ai-dashboard', path: '/projects/ai-dashboard' },
    { id: 'testing-0.4', label: 'testing-0.4', path: '/projects/testing-0.4' },
    { id: 'gemkit-ecosystem', label: 'gemkit-ecosystem', path: '/projects/gemkit-ecosystem' },
    { id: 'docs-portal', label: 'docs-portal', path: '/projects/docs-portal' },
    { id: 'api-gateway', label: 'api-gateway', path: '/projects/api-gateway' },
    { id: 'mobile-app', label: 'mobile-app', path: '/projects/mobile-app' },
  ],
};

// Agent options (single selection)
export const agentOptions = [
  { id: 'researcher', label: 'Researcher', icon: Search },
  { id: 'planner', label: 'Planner', icon: FileText },
  { id: 'coder', label: 'Coder', icon: FileCode },
  { id: 'reviewer', label: 'Reviewer', icon: GitBranch },
  { id: 'tester', label: 'Tester', icon: Bot },
];

// Provider options (single selection)
export const providerOptions = [
  { id: 'anthropic', label: 'Claude (Anthropic)' },
  { id: 'google', label: 'Gemini (Google)' },
  { id: 'openai', label: 'Codex (OpenAI)' },
];

// Model options (single selection)
export const modelOptions = [
  { id: 'claude-opus', label: 'Claude Opus 4' },
  { id: 'claude-sonnet', label: 'Claude Sonnet 4' },
  { id: 'claude-haiku', label: 'Claude Haiku 4' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-3-pro', label: 'Gemini 3 Pro' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { id: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
  { id: 'gpt-5-turbo', label: 'GPT-5 Turbo' },
];

// Priority options (single selection with colors)
export const priorityOptions = [
  { id: 'high', label: 'High', color: '#C15746' },
  { id: 'medium', label: 'Medium', color: '#C69F3A' },
  { id: 'low', label: 'Low', color: '#447FC1' },
];

// Status options with colors
export const statusOptions = [
  { id: 'not-started', label: 'Not Started', color: '#787774' },
  { id: 'in-progress', label: 'In Progress', color: '#447FC1' },
  { id: 'review', label: 'Review', color: '#C69F3A' },
  { id: 'done', label: 'Done', color: '#4B9064' },
  { id: 'cancelled', label: 'Cancelled', color: '#C15746' },
  { id: 'archived', label: 'Archived', color: '#55534E' },
];

// Skills options (multi-select)
export const skillsOptions = [
  { id: 'research', label: 'Research' },
  { id: 'planning', label: 'Planning' },
  { id: 'coding', label: 'Coding' },
  { id: 'debugging', label: 'Debugging' },
  { id: 'testing', label: 'Testing' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'code-review', label: 'Code Review' },
];

// Tools options (multi-select)
export const toolsOptions = [
  { id: 'all', label: 'All Tools', icon: Zap },
  { id: 'bash', label: 'Bash', icon: Terminal },
  { id: 'grep', label: 'Grep', icon: Search },
  { id: 'read', label: 'Read', icon: FileText },
  { id: 'write', label: 'Write', icon: FileCode },
  { id: 'glob', label: 'Glob', icon: FolderOpen },
  { id: 'git', label: 'Git', icon: GitBranch },
];

// Mock file system for context search
export const mockFileSystem = [
  { id: 'src-app', label: 'src/App.tsx', path: '/src/App.tsx' },
  { id: 'src-main', label: 'src/main.tsx', path: '/src/main.tsx' },
  { id: 'src-index-css', label: 'src/index.css', path: '/src/index.css' },
  { id: 'src-components-button', label: 'src/components/Button.tsx', path: '/src/components/Button.tsx' },
  { id: 'src-components-input', label: 'src/components/Input.tsx', path: '/src/components/Input.tsx' },
  { id: 'src-components-modal', label: 'src/components/Modal.tsx', path: '/src/components/Modal.tsx' },
  { id: 'src-hooks-useAuth', label: 'src/hooks/useAuth.ts', path: '/src/hooks/useAuth.ts' },
  { id: 'src-hooks-useApi', label: 'src/hooks/useApi.ts', path: '/src/hooks/useApi.ts' },
  { id: 'src-utils-helpers', label: 'src/utils/helpers.ts', path: '/src/utils/helpers.ts' },
  { id: 'src-lib-utils', label: 'src/lib/utils.ts', path: '/src/lib/utils.ts' },
  { id: 'src-types-index', label: 'src/types/index.ts', path: '/src/types/index.ts' },
  { id: 'package-json', label: 'package.json', path: '/package.json' },
  { id: 'readme', label: 'README.md', path: '/README.md' },
  { id: 'tsconfig', label: 'tsconfig.json', path: '/tsconfig.json' },
  { id: 'vite-config', label: 'vite.config.ts', path: '/vite.config.ts' },
];

// Label mappings for display
export const agentLabels: Record<string, string> = {
  researcher: 'Researcher',
  planner: 'Planner',
  coder: 'Coder',
  reviewer: 'Reviewer',
  tester: 'Tester',
};

export const providerLabels: Record<string, string> = {
  anthropic: 'Claude (Anthropic)',
  google: 'Gemini (Google)',
  openai: 'Codex (OpenAI)',
};

export const modelLabels: Record<string, string> = {
  'claude-opus': 'Claude Opus 4',
  'claude-sonnet': 'Claude Sonnet 4',
  'claude-haiku': 'Claude Haiku 4',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-3-pro': 'Gemini 3 Pro',
  'gemini-3-flash': 'Gemini 3 Flash',
  'gpt-5.2-codex': 'GPT-5.2 Codex',
  'gpt-5-turbo': 'GPT-5 Turbo',
};

// Type for property IDs
export type PropertyTypeId = (typeof propertyTypes)[number]['id'];
