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
  Key,
  Settings,
  Sparkles,
  Shield,
  Maximize2,
  ChevronDown,
  Loader2,
  FolderOpen,
  Plus,
  Info,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useSettings, useUpdateSettings, useSetApiKey } from '@/shared/hooks/use-settings';
import { useProjects } from '@/shared/hooks/use-projects-query';

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
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'advanced', label: 'Advanced', icon: Shield },
];

function SidebarItem({ icon: Icon, label, isActive, isUser, onClick }: {
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
      {isUser ? (
        <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
          U
        </div>
      ) : (
        <Icon className="w-4 h-4" />
      )}
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
        'w-10 h-6 rounded-full transition-all relative shrink-0',
        value ? 'bg-primary' : 'bg-black/10 dark:bg-white/15',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform',
        value ? 'translate-x-5' : 'translate-x-1'
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
  const hasChanges = userName !== (settings?.userName || '');

  useEffect(() => {
    setUserName(settings?.userName || '');
  }, [settings?.userName]);

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
      <SaveButton onClick={() => updateSettings({ userName })} isPending={isPending} hasChanges={hasChanges} />
    </div>
  );
}

function PreferencesContent({ settings, updateSettings, isPending }: ContentProps) {
  const [theme, setTheme] = useState(settings?.theme || 'system');
  const hasChanges = theme !== (settings?.theme || 'system');

  useEffect(() => {
    setTheme(settings?.theme || 'system');
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
            { id: 'system', label: 'System' },
          ]}
          onChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
          disabled={isPending}
        />
      </SettingRow>
      <SaveButton onClick={() => updateSettings({ theme: theme as 'light' | 'dark' | 'system' })} isPending={isPending} hasChanges={hasChanges} />
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
            { id: 'google', label: 'Google' },
            { id: 'openai', label: 'OpenAI' },
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

interface ApprovalRule {
  pattern: string;
  action: 'approve' | 'deny' | 'ask';
}

function AdvancedContent({ settings, updateSettings, isPending }: ContentProps) {
  const [autoExtract, setAutoExtract] = useState(settings?.autoExtractSummary || false);
  const [approvalEnabled, setApprovalEnabled] = useState(settings?.approvalGate?.enabled || false);
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>(settings?.approvalGate?.rules || []);

  const hasChanges = autoExtract !== (settings?.autoExtractSummary || false) ||
    approvalEnabled !== (settings?.approvalGate?.enabled || false) ||
    JSON.stringify(approvalRules) !== JSON.stringify(settings?.approvalGate?.rules || []);

  useEffect(() => {
    setAutoExtract(settings?.autoExtractSummary || false);
    setApprovalEnabled(settings?.approvalGate?.enabled || false);
    setApprovalRules(settings?.approvalGate?.rules || []);
  }, [settings?.autoExtractSummary, settings?.approvalGate]);

  const addRule = () => {
    setApprovalRules([...approvalRules, { pattern: '', action: 'ask' }]);
  };

  const updateRule = (index: number, field: keyof ApprovalRule, value: string) => {
    const updated = [...approvalRules];
    updated[index] = { ...updated[index], [field]: value };
    setApprovalRules(updated);
  };

  const removeRule = (index: number) => {
    setApprovalRules(approvalRules.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    updateSettings({
      autoExtractSummary: autoExtract,
      approvalGate: approvalEnabled ? { enabled: true, rules: approvalRules } : null,
    });
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-foreground mb-4">Advanced</h2>

      <SettingRow label="Auto-extract Summary" description="Automatically extract task summaries">
        <Toggle value={autoExtract} onChange={(v) => setAutoExtract(v)} disabled={isPending} />
      </SettingRow>

      {/* Global Approval Gate */}
      <div className="border-t border-border dark:border-white/10 mt-4 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Global Approval Gate</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Define rules for AI actions. Project settings override global.</p>

        <SettingRow label="Enable" description="">
          <Toggle value={approvalEnabled} onChange={(v) => setApprovalEnabled(v)} disabled={isPending} />
        </SettingRow>

        {approvalEnabled && (
          <div className="space-y-2 mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="w-3 h-3" />
              <span>Pattern matching for commands</span>
            </div>
            {approvalRules.map((rule, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={rule.pattern}
                  onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                  placeholder="Pattern"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg glass text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={rule.action}
                  onChange={(e) => updateRule(index, 'action', e.target.value as ApprovalRule['action'])}
                  className="px-3 py-1.5 text-sm rounded-lg glass text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ask">Ask</option>
                  <option value="approve">Approve</option>
                  <option value="deny">Deny</option>
                </select>
                <button onClick={() => removeRule(index)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={addRule} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
              <Plus className="w-3 h-3" />
              Add Rule
            </button>
          </div>
        )}
      </div>

      <SaveButton onClick={handleSave} isPending={isPending} hasChanges={hasChanges} />
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
      <div className="fixed inset-0 z-40 bg-black/50" />

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
