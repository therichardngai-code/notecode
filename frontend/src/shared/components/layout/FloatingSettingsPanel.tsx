/**
 * Floating Settings Panel
 * Modal dialog with sidebar navigation (Notion-style)
 * Connected to real Settings API
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  SlidersHorizontal,
  // Key,  // TODO: Enable when multi-provider supported
  Settings,
  Sparkles,
  Shield,
  Maximize2,
  ChevronDown,
  Loader2,
  FolderOpen,
  Plus,
  Terminal,
  FileWarning,
  Wrench,
  Lock,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useSettings, useUpdateSettings, useSetApiKey } from '@/shared/hooks/use-settings';
import { useProjects } from '@/shared/hooks/use-projects-query';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/components/ui/collapsible';
import { BUILTIN_PATTERNS, AVAILABLE_TOOLS } from '@/shared/constants/approval-gate-constants';
import { isValidRegex } from '@/shared/lib/regex-utils';
import type { ToolRule } from '@/adapters/api/settings-api';

interface FloatingSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullSettings?: () => void;
}

// Sidebar items
const accountItems = [
  { id: 'profile', label: 'User Profile', icon: User, isUser: true },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

const workspaceItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'ai-settings', label: 'AI Settings', icon: Sparkles },
  // { id: 'api-keys', label: 'API Keys', icon: Key },  // TODO: Enable when multi-provider supported
  { id: 'advanced', label: 'Advanced', icon: Shield },
];

function SidebarItem({ icon: Icon, label, isActive, isUser: _isUser, onClick }: {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isUser?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-all',
        isActive
          ? 'bg-primary/10 dark:bg-white/15 text-primary dark:text-white font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-sm text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={cn(
        'w-11 h-6 rounded-full transition-all relative shrink-0',
        value ? 'bg-primary' : 'bg-black/10 dark:bg-white/15',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'absolute left-0 top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform',
        value ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  );
}

function Select({ value, options, onChange, disabled }: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [open]);

  useEffect(() => {
    const handleClick = () => setOpen(false);
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = options.find(o => o.id === value);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg glass text-foreground hover:bg-white/30 dark:hover:bg-white/15 transition-colors',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span>{selected?.label || value || 'Select...'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && createPortal(
        <div
          className="fixed w-40 glass border border-white/20 dark:border-white/10 rounded-lg shadow-lg py-1 z-[200]"
          style={{ top: pos.top, right: pos.right }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={cn(
                'w-full px-3 py-1.5 text-sm text-left text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors',
                value === opt.id && 'bg-white/20 dark:bg-white/10 text-primary font-medium'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// Save button component
function SaveButton({ onClick, isPending, hasChanges }: { onClick: () => void; isPending: boolean; hasChanges: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-4 mt-4 border-t border-border dark:border-white/10">
      <button
        onClick={onClick}
        disabled={!hasChanges || isPending}
        className="px-4 py-1.5 bg-background text-foreground shadow-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-sm font-medium"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
      </button>
      {!hasChanges && <span className="text-sm text-muted-foreground">No changes</span>}
    </div>
  );
}

// Content sections
function ProfileContent({ settings, updateSettings, isPending }: ContentProps) {
  const [userName, setUserName] = useState(settings?.userName || '');
  const [userEmail, setUserEmail] = useState(settings?.userEmail || '');
  const hasChanges = userName !== (settings?.userName || '') || userEmail !== (settings?.userEmail || '');

  useEffect(() => {
    setUserName(settings?.userName || '');
    setUserEmail(settings?.userEmail || '');
  }, [settings?.userName, settings?.userEmail]);

  return (
    <div>
      <h2 className="text-lg font-medium text-foreground mb-4">User Profile</h2>
      <SettingRow label="Display Name" description="Your name shown in the app">
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          disabled={isPending}
          className="w-40 px-3 py-1.5 text-sm rounded-lg glass text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Enter name"
        />
      </SettingRow>
      <SettingRow label="Email" description="Fallback for git commits when global config not set">
        <input
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          disabled={isPending}
          className="w-40 px-3 py-1.5 text-sm rounded-lg glass text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="your@email.com"
        />
      </SettingRow>
      <SaveButton onClick={() => updateSettings({ userName, userEmail })} isPending={isPending} hasChanges={hasChanges} />
    </div>
  );
}

const validThemes = ['light', 'dark', 'glass-light', 'glass-dark'];
const resolveTheme = (t?: string) => (t && validThemes.includes(t) ? t : 'glass-dark');

function PreferencesContent({ settings, updateSettings, isPending }: ContentProps) {
  const [theme, setTheme] = useState<string>(resolveTheme(settings?.theme));
  const hasChanges = theme !== resolveTheme(settings?.theme);

  useEffect(() => {
    setTheme(resolveTheme(settings?.theme));
  }, [settings?.theme]);

  return (
    <div>
      <h2 className="text-lg font-medium text-foreground mb-4">Preferences</h2>
      <SettingRow label="Appearance" description="Customize how the app looks">
        <Select
          value={theme}
          options={[
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
            { id: 'glass-light', label: 'Glass Light' },
            { id: 'glass-dark', label: 'Glass Dark' },
          ]}
          onChange={(v) => setTheme(v)}
          disabled={isPending}
        />
      </SettingRow>
      <SaveButton onClick={() => updateSettings({ theme: theme as 'light' | 'dark' | 'glass-light' | 'glass-dark' })} isPending={isPending} hasChanges={hasChanges} />
    </div>
  );
}

function GeneralContent({ settings, updateSettings, isPending }: ContentProps) {
  const { data: projects = [] } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState(settings?.currentActiveProjectId || '');
  const hasChanges = activeProjectId !== (settings?.currentActiveProjectId || '');

  useEffect(() => {
    setActiveProjectId(settings?.currentActiveProjectId || '');
  }, [settings?.currentActiveProjectId]);

  return (
    <div>
      <h2 className="text-lg font-medium text-foreground mb-4">General</h2>
      <SettingRow label="Active Project" description="Default project for new tasks">
        <div className="flex items-center gap-2 text-sm">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <Select
            value={activeProjectId}
            options={projects.map(p => ({ id: p.id, label: p.name }))}
            onChange={(v) => setActiveProjectId(v)}
            disabled={isPending}
          />
        </div>
      </SettingRow>
      <SaveButton onClick={() => updateSettings({ currentActiveProjectId: activeProjectId || null })} isPending={isPending} hasChanges={hasChanges} />
    </div>
  );
}

function AISettingsContent({ settings, updateSettings, isPending }: ContentProps) {
  const [provider, setProvider] = useState(settings?.defaultProvider || '');
  const [model, setModel] = useState(settings?.defaultModel || '');
  const [yoloMode, setYoloMode] = useState(settings?.yoloMode || false);

  const hasChanges = provider !== (settings?.defaultProvider || '') ||
    model !== (settings?.defaultModel || '') ||
    yoloMode !== (settings?.yoloMode || false);

  useEffect(() => {
    setProvider(settings?.defaultProvider || '');
    setModel(settings?.defaultModel || '');
    setYoloMode(settings?.yoloMode || false);
  }, [settings?.defaultProvider, settings?.defaultModel, settings?.yoloMode]);

  return (
    <div>
      <h2 className="text-lg font-medium text-foreground mb-4">AI Settings</h2>
      <SettingRow label="Default Provider" description="Provider for new sessions">
        <Select
          value={provider}
          options={[
            { id: 'anthropic', label: 'Anthropic' },
            // { id: 'google', label: 'Google' },     // TODO: Enable when supported
            // { id: 'openai', label: 'OpenAI' },     // TODO: Enable when supported
          ]}
          onChange={(v) => setProvider(v)}
          disabled={isPending}
        />
      </SettingRow>
      <SettingRow label="Default Model" description="Model for new sessions">
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={isPending}
          className="w-40 px-3 py-1.5 text-sm rounded-lg glass text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="e.g. claude-sonnet-4"
        />
      </SettingRow>
      <SettingRow label="YOLO Mode" description="Auto-approve AI actions without confirmation">
        <Toggle value={yoloMode} onChange={(v) => setYoloMode(v)} disabled={isPending} />
      </SettingRow>
      <SaveButton
        onClick={() => updateSettings({
          defaultProvider: provider as 'anthropic' | 'google' | 'openai' | undefined,
          defaultModel: model,
          yoloMode,
        })}
        isPending={isPending}
        hasChanges={hasChanges}
      />
    </div>
  );
}

function ApiKeysContent({ settings }: ContentProps) {
  const setApiKey = useSetApiKey();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyValue, setKeyValue] = useState('');

  const handleSave = async (provider: 'anthropic' | 'google' | 'openai') => {
    if (keyValue.trim()) {
      await setApiKey.mutateAsync({ provider, apiKey: keyValue });
      setKeyValue('');
      setEditingProvider(null);
    }
  };

  const providers = [
    { id: 'anthropic', label: 'Anthropic', configured: settings?.apiKeys?.anthropic },
    { id: 'google', label: 'Google', configured: settings?.apiKeys?.google },
    { id: 'openai', label: 'OpenAI', configured: settings?.apiKeys?.openai },
  ];

  return (
    <div>
      <h2 className="text-lg font-medium text-foreground mb-4">API Keys</h2>
      {providers.map(provider => (
        <SettingRow key={provider.id} label={provider.label} description={provider.configured ? 'Configured' : 'Not configured'}>
          {editingProvider === provider.id ? (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                className="w-32 px-3 py-1.5 text-sm rounded-lg glass text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="API Key"
              />
              <button
                onClick={() => handleSave(provider.id as 'anthropic' | 'google' | 'openai')}
                disabled={setApiKey.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {setApiKey.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => setEditingProvider(null)} className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingProvider(provider.id)}
              className={cn(
                'text-sm',
                provider.configured ? 'text-green-500' : 'text-primary hover:underline'
              )}
            >
              {provider.configured ? '✓ Set' : 'Add key'}
            </button>
          )}
        </SettingRow>
      ))}
    </div>
  );
}

/** Compact built-in patterns display for floating panel */
function CompactBuiltinDisplay({ patterns }: { type: 'commands' | 'files'; patterns: readonly string[] }) {
  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground w-full py-1">
        <Lock className="w-2.5 h-2.5" />
        <span>Built-in ({patterns.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0.5 pl-3 text-[10px] font-mono text-muted-foreground/70 max-h-20 overflow-y-auto">
          {patterns.map((p, i) => <div key={i}>{p}</div>)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AdvancedContent({ settings, updateSettings, isPending }: ContentProps) {
  const [autoExtract, setAutoExtract] = useState(settings?.autoExtractSummary || false);
  const [approvalEnabled, setApprovalEnabled] = useState(settings?.approvalGate?.enabled || false);
  // Convert backend arrays → UI tool rules
  const backendToToolRules = (autoAllow: string[] = [], requireApproval: string[] = []): ToolRule[] => {
    const rules: ToolRule[] = [];
    autoAllow.forEach(tool => rules.push({ tool, action: 'approve' }));
    requireApproval.forEach(tool => rules.push({ tool, action: 'ask' }));
    return rules;
  };

  const [toolRules, setToolRules] = useState<ToolRule[]>(backendToToolRules(
    settings?.approvalGate?.autoAllowTools,
    settings?.approvalGate?.requireApprovalTools,
  ));
  const [dangerousCommands, setDangerousCommands] = useState<string[]>(settings?.approvalGate?.dangerousPatterns?.commands || []);
  const [dangerousFiles, setDangerousFiles] = useState<string[]>(settings?.approvalGate?.dangerousPatterns?.files || []);

  const hasInvalidPatterns = [...dangerousCommands, ...dangerousFiles].some(p => !isValidRegex(p));

  const serverToolRules = backendToToolRules(
    settings?.approvalGate?.autoAllowTools,
    settings?.approvalGate?.requireApprovalTools,
  );
  const hasChanges = autoExtract !== (settings?.autoExtractSummary || false) ||
    approvalEnabled !== (settings?.approvalGate?.enabled || false) ||
    JSON.stringify(toolRules) !== JSON.stringify(serverToolRules) ||
    JSON.stringify(dangerousCommands) !== JSON.stringify(settings?.approvalGate?.dangerousPatterns?.commands || []) ||
    JSON.stringify(dangerousFiles) !== JSON.stringify(settings?.approvalGate?.dangerousPatterns?.files || []);

  useEffect(() => {
    setAutoExtract(settings?.autoExtractSummary || false);
    setApprovalEnabled(settings?.approvalGate?.enabled || false);
    setToolRules(backendToToolRules(
      settings?.approvalGate?.autoAllowTools,
      settings?.approvalGate?.requireApprovalTools,
    ));
    setDangerousCommands(settings?.approvalGate?.dangerousPatterns?.commands || []);
    setDangerousFiles(settings?.approvalGate?.dangerousPatterns?.files || []);
  }, [settings?.autoExtractSummary, settings?.approvalGate]);

  // Tool rules handlers
  const addToolRule = () => setToolRules([...toolRules, { tool: 'Bash', action: 'ask' }]);
  const updateToolRule = (index: number, field: keyof ToolRule, value: string) => {
    const updated = [...toolRules];
    updated[index] = { ...updated[index], [field]: value };
    setToolRules(updated);
  };
  const removeToolRule = (index: number) => setToolRules(toolRules.filter((_, i) => i !== index));

  // Pattern handlers
  const addCommand = () => setDangerousCommands([...dangerousCommands, '']);
  const updateCommand = (index: number, value: string) => {
    const updated = [...dangerousCommands];
    updated[index] = value;
    setDangerousCommands(updated);
  };
  const removeCommand = (index: number) => setDangerousCommands(dangerousCommands.filter((_, i) => i !== index));

  const addFile = () => setDangerousFiles([...dangerousFiles, '']);
  const updateFile = (index: number, value: string) => {
    const updated = [...dangerousFiles];
    updated[index] = value;
    setDangerousFiles(updated);
  };
  const removeFile = (index: number) => setDangerousFiles(dangerousFiles.filter((_, i) => i !== index));

  const handleSave = () => {
    const validCommands = dangerousCommands.filter(p => p.trim() && isValidRegex(p));
    const validFiles = dangerousFiles.filter(p => p.trim() && isValidRegex(p));
    // Convert UI tool rules → backend arrays
    const autoAllowTools = toolRules.filter(r => r.action === 'approve').map(r => r.tool);
    const requireApprovalTools = toolRules.filter(r => r.action === 'ask').map(r => r.tool);
    updateSettings({
      autoExtractSummary: autoExtract,
      approvalGate: approvalEnabled ? {
        enabled: true,
        autoAllowTools: autoAllowTools.length > 0 ? autoAllowTools : undefined,
        requireApprovalTools: requireApprovalTools.length > 0 ? requireApprovalTools : undefined,
        dangerousPatterns: (validCommands.length > 0 || validFiles.length > 0) ? {
          commands: validCommands.length > 0 ? validCommands : undefined,
          files: validFiles.length > 0 ? validFiles : undefined,
        } : undefined,
      } : null,
    });
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-foreground mb-4">Advanced</h2>

      {/* Auto-extract Summary — hidden until feature is ready
      <SettingRow label="Auto-extract Summary" description="Automatically extract task summaries">
        <Toggle value={autoExtract} onChange={(v) => setAutoExtract(v)} disabled={isPending} />
      </SettingRow>
      */}

      {/* Global Approval Gate - 3 Section Structure */}
      <div className="border-t border-border dark:border-white/10 mt-4 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Global Approval Gate</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Configure approval rules. Project settings override global.</p>

        <SettingRow label="Enable" description="">
          <Toggle value={approvalEnabled} onChange={(v) => setApprovalEnabled(v)} disabled={isPending} />
        </SettingRow>

        {approvalEnabled && (
          <div className="space-y-4 mt-3 pl-2 border-l-2 border-primary/20">
            {/* Section 1: Tool Rules */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Wrench className="w-3 h-3 text-blue-500" />
                <span>Tool Rules</span>
              </div>
              {toolRules.map((rule, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <select value={rule.tool} onChange={(e) => updateToolRule(index, 'tool', e.target.value)}
                    className="flex-1 px-2 py-1 text-xs rounded glass text-foreground">
                    {AVAILABLE_TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={rule.action} onChange={(e) => updateToolRule(index, 'action', e.target.value)}
                    className="px-2 py-1 text-xs rounded glass text-foreground">
                    <option value="ask">Ask</option>
                    <option value="approve">Auto</option>
                    <option value="deny">Deny</option>
                  </select>
                  <button onClick={() => removeToolRule(index)} className="p-0.5 text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button onClick={addToolRule} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80">
                <Plus className="w-2.5 h-2.5" /> Add Tool
              </button>
            </div>

            {/* Section 2: Dangerous Commands */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Terminal className="w-3 h-3 text-orange-500" />
                <span>Dangerous Commands</span>
              </div>
              <CompactBuiltinDisplay type="commands" patterns={BUILTIN_PATTERNS.commands} />
              {dangerousCommands.map((pattern, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <input type="text" value={pattern} onChange={(e) => updateCommand(index, e.target.value)}
                    placeholder="rm\s+-rf" className={cn('flex-1 px-2 py-1 text-xs rounded glass font-mono',
                    !isValidRegex(pattern) && 'ring-1 ring-red-500')} />
                  <button onClick={() => removeCommand(index)} className="p-0.5 text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button onClick={addCommand} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80">
                <Plus className="w-2.5 h-2.5" /> Add Pattern
              </button>
            </div>

            {/* Section 3: Dangerous Files */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <FileWarning className="w-3 h-3 text-red-500" />
                <span>Dangerous Files</span>
              </div>
              <CompactBuiltinDisplay type="files" patterns={BUILTIN_PATTERNS.files} />
              {dangerousFiles.map((pattern, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <input type="text" value={pattern} onChange={(e) => updateFile(index, e.target.value)}
                    placeholder="\.env$" className={cn('flex-1 px-2 py-1 text-xs rounded glass font-mono',
                    !isValidRegex(pattern) && 'ring-1 ring-red-500')} />
                  <button onClick={() => removeFile(index)} className="p-0.5 text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button onClick={addFile} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80">
                <Plus className="w-2.5 h-2.5" /> Add Pattern
              </button>
            </div>

            {hasInvalidPatterns && (
              <p className="text-[10px] text-red-500">Fix invalid regex patterns before saving</p>
            )}
          </div>
        )}
      </div>

      <SaveButton onClick={handleSave} isPending={isPending} hasChanges={hasChanges && !hasInvalidPatterns} />
    </div>
  );
}

interface ContentProps {
  settings: ReturnType<typeof useSettings>['data'];
  updateSettings: (updates: Parameters<ReturnType<typeof useUpdateSettings>['mutate']>[0]) => void;
  isPending: boolean;
}

export function FloatingSettingsPanel({ isOpen, onClose, onOpenFullSettings }: FloatingSettingsPanelProps) {
  const [activeSection, setActiveSection] = useState('preferences');
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: settings, isLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  const updateSettings = (updates: Parameters<typeof updateSettingsMutation.mutate>[0]) => {
    updateSettingsMutation.mutate(updates);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contentProps: ContentProps = {
    settings,
    updateSettings,
    isPending: updateSettingsMutation.isPending,
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (activeSection) {
      case 'profile': return <ProfileContent {...contentProps} />;
      case 'preferences': return <PreferencesContent {...contentProps} />;
      case 'general': return <GeneralContent {...contentProps} />;
      case 'ai-settings': return <AISettingsContent {...contentProps} />;
      case 'api-keys': return <ApiKeysContent {...contentProps} />;
      case 'advanced': return <AdvancedContent {...contentProps} />;
      default: return <PreferencesContent {...contentProps} />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-[800px] max-w-[90vw] h-[550px] max-h-[85vh]',
          'glass-strong rounded-lg',
          'flex overflow-hidden'
        )}
      >
        {/* Sidebar */}
        <div className="w-52 border-r border-border/50 dark:border-white/10 flex flex-col">
          <div className="flex-1 overflow-y-auto py-3">
            {/* Account Section */}
            <div className="px-3 mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Account</span>
            </div>
            <div className="px-2 space-y-0.5 mb-4">
              {accountItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  isUser={item.isUser}
                  isActive={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                />
              ))}
            </div>

            {/* Workspace Section */}
            <div className="px-3 mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Workspace</span>
            </div>
            <div className="px-2 space-y-0.5">
              {workspaceItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="p-3 border-t border-border dark:border-white/10">
            <button
              onClick={onOpenFullSettings}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-sm text-foreground transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Full Settings</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Close button */}
          <div className="absolute top-3 right-3 z-10">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}
