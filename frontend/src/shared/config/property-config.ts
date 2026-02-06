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
  { id: 'subagentDelegates', label: 'Subagents', icon: Bot, description: 'Allow spawning subagents', isToggle: true },
  { id: 'autoBranch', label: 'Auto Branch', icon: GitBranch, description: 'Create branch on start', isToggle: true },
  { id: 'autoCommit', label: 'Auto Commit', icon: GitBranch, description: 'Commit on complete', isToggle: true },
  { id: 'permissionMode', label: 'Permissions', icon: Zap, description: 'Agent permission level' },
] as const;

// Permission mode options (single selection)
export const permissionModeOptions = [
  { id: 'default', label: 'Default', description: 'Ask for each action' },
  { id: 'acceptEdits', label: 'Accept Edits', description: 'Auto-approve file edits' },
  { id: 'bypassPermissions', label: 'Bypass All', description: 'Skip all permission prompts' },
];

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

// Model options grouped by provider
export const modelsByProvider: Record<string, { id: string; label: string }[]> = {
  anthropic: [
    { id: 'opus', label: 'Claude Opus' },
    { id: 'sonnet', label: 'Claude Sonnet' },
    { id: 'haiku', label: 'Claude Haiku' },
  ],
  google: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
};

// All model options — Anthropic only for this release
export const modelOptions = [
  ...modelsByProvider.anthropic,
  // ...modelsByProvider.google,   // TODO: Enable when Google provider is supported
  // ...modelsByProvider.openai,   // TODO: Enable when OpenAI provider is supported
];

// Get models filtered by provider (returns all if no provider specified)
export const getModelsForProvider = (provider?: string) =>
  provider && modelsByProvider[provider] ? modelsByProvider[provider] : modelOptions;

// Get provider for a model (reverse lookup)
export const getProviderForModel = (modelId: string): string | undefined => {
  for (const [provider, models] of Object.entries(modelsByProvider)) {
    if (models.some((m) => m.id === modelId)) return provider;
  }
  return undefined;
};

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
  { id: 'All', label: 'All Tools', icon: Zap },
  { id: 'Read', label: 'Read', icon: FileText },
  { id: 'Write', label: 'Write', icon: FileCode },
  { id: 'Edit', label: 'Edit', icon: FileCode },
  { id: 'Bash', label: 'Bash', icon: Terminal },
  { id: 'Glob', label: 'Glob', icon: FolderOpen },
  { id: 'Grep', label: 'Grep', icon: Search },
  { id: 'WebFetch', label: 'WebFetch', icon: Search },
  { id: 'WebSearch', label: 'WebSearch', icon: Search },
  { id: 'TodoWrite', label: 'TodoWrite', icon: FileText },
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
  opus: 'Claude Opus',
  sonnet: 'Claude Sonnet',
  haiku: 'Claude Haiku',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'gemini-3-flash-preview': 'Gemini 3 Flash Preview',
  'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
};

// Type for property IDs
export type PropertyTypeId = (typeof propertyTypes)[number]['id'];
