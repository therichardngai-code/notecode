import { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  SlidersHorizontal,
  Bell,
  Link2,
  Settings,
  Shield,
  Sparkles,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface FloatingSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullSettings?: () => void;
}

// Account section items
const accountItems = [
  { id: 'account', label: 'User Profile', icon: User, isUser: true },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'connections', label: 'Connections', icon: Link2 },
];

// Workspace section items
const workspaceItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'ai-settings', label: 'AI Settings', icon: Sparkles },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

// Settings content for each section
const settingsContent: Record<
  string,
  {
    title: string;
    settings: {
      id: string;
      label: string;
      description?: string;
      type: 'select' | 'toggle';
      value: string | boolean;
      options?: string[];
    }[];
  }
> = {
  preferences: {
    title: 'Preferences',
    settings: [
      { id: 'theme', label: 'Appearance', description: 'Customize how the app looks', type: 'select', value: 'Dark', options: ['Light', 'Dark', 'System'] },
      { id: 'language', label: 'Language', description: 'Change the interface language', type: 'select', value: 'English', options: ['English', 'Spanish', 'French'] },
      { id: 'start-week', label: 'Start week on Monday', type: 'toggle', value: true },
    ],
  },
  notifications: {
    title: 'Notifications',
    settings: [
      { id: 'email-updates', label: 'Email notifications', description: 'Receive email about activity', type: 'toggle', value: true },
      { id: 'push-enabled', label: 'Push notifications', description: 'Receive push notifications', type: 'toggle', value: true },
    ],
  },
  'ai-settings': {
    title: 'AI Settings',
    settings: [
      { id: 'default-model', label: 'Default Model', description: 'Default AI model for new sessions', type: 'select', value: 'Claude Sonnet', options: ['Claude Sonnet', 'Claude Opus', 'Gemini Pro'] },
      { id: 'auto-approve', label: 'Auto-approve (YOLO mode)', description: 'Automatically approve AI actions', type: 'toggle', value: false },
    ],
  },
  general: {
    title: 'General',
    settings: [
      { id: 'workspace-name', label: 'Workspace name', type: 'select', value: 'AI Workspace', options: ['AI Workspace'] },
    ],
  },
};

function SettingToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn('w-9 h-5 rounded-full transition-colors relative shrink-0', value ? 'bg-primary' : 'bg-muted')}
    >
      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', value ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  );
}

function SettingSelect({ value }: { value: string; options: string[] }) {
  return (
    <button className="flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors shrink-0">
      <span>{value}</span>
      <ChevronDown className="w-4 h-4" />
    </button>
  );
}

function SidebarItem({ icon: Icon, label, isActive, isUser, onClick }: { icon: React.ElementType; label: string; isActive?: boolean; isUser?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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

export function FloatingSettingsPanel({ isOpen, onClose, onOpenFullSettings }: FloatingSettingsPanelProps) {
  const [activeSection, setActiveSection] = useState('preferences');
  const panelRef = useRef<HTMLDivElement>(null);

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
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const currentContent = settingsContent[activeSection] || settingsContent.preferences;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-[800px] max-w-[90vw] h-[500px] max-h-[85vh]',
          'bg-card border border-border rounded-lg shadow-2xl',
          'flex overflow-hidden'
        )}
      >
        {/* Sidebar */}
        <div className="w-52 border-r border-border flex flex-col">
          <div className="flex-1 overflow-y-auto py-2">
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
                <SidebarItem key={item.id} icon={item.icon} label={item.label} isActive={activeSection === item.id} onClick={() => setActiveSection(item.id)} />
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="p-3 border-t border-border">
            <button
              onClick={onOpenFullSettings}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-sm text-primary transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Full Settings</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header with close button */}
          <div className="absolute top-3 right-3 z-10">
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-lg font-medium text-foreground mb-6">{currentContent.title}</h2>

            <div className="space-y-4">
              {currentContent.settings.map((setting) => (
                <div key={setting.id} className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">{setting.label}</div>
                    {setting.description && <div className="text-sm text-muted-foreground mt-0.5">{setting.description}</div>}
                  </div>
                  {setting.type === 'toggle' ? (
                    <SettingToggle value={setting.value as boolean} onChange={() => {}} />
                  ) : (
                    <SettingSelect value={setting.value as string} options={setting.options || []} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
