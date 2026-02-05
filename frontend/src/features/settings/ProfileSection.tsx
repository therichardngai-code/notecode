/**
 * Profile Section
 * Settings for user name and theme - synced with backend API
 */

import { useState, useEffect } from 'react';
import { Loader2, User, Mail, Sun, Moon, Sparkles } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';

type Theme = 'light' | 'dark' | 'glass-light' | 'glass-dark';

export function ProfileSection() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [theme, setTheme] = useState<Theme>('light');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with API data
  useEffect(() => {
    if (settings) {
      setUserName(settings.userName || '');
      setUserEmail(settings.userEmail || '');
      setTheme((settings.theme as Theme) || 'light');
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      userName: userName || undefined,
      userEmail: userEmail || undefined,
      theme,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'glass-light', label: 'Glass Light', icon: Sparkles },
    { value: 'glass-dark', label: 'Glass Dark', icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Profile</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Personalize your workspace settings.
        </p>
      </div>

      {/* User Name */}
      <div>
        <label htmlFor="userName" className="block text-sm font-medium text-foreground mb-1">
          <User className="w-4 h-4 inline mr-1" />
          Display Name
        </label>
        <input
          id="userName"
          type="text"
          value={userName}
          onChange={(e) => {
            setUserName(e.target.value);
            setHasChanges(true);
          }}
          placeholder="Enter your name"
          className="w-full max-w-md px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Used for identifying your actions in sessions.
        </p>
      </div>

      {/* User Email */}
      <div>
        <label htmlFor="userEmail" className="block text-sm font-medium text-foreground mb-1">
          <Mail className="w-4 h-4 inline mr-1" />
          Email
        </label>
        <input
          id="userEmail"
          type="email"
          value={userEmail}
          onChange={(e) => {
            setUserEmail(e.target.value);
            setHasChanges(true);
          }}
          placeholder="your@email.com"
          className="w-full max-w-md px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Used as fallback for git commits when global git config not set.
        </p>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Theme
        </label>
        <div className="flex gap-2">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setHasChanges(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                  theme === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Save Changes'
          )}
        </button>
        {updateSettings.isSuccess && !hasChanges && (
          <span className="text-green-600 text-sm">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
