/**
 * Theme Provider
 * Syncs theme from Settings API and applies to document
 * Supports: light, dark, system (follows OS preference)
 */

import { useEffect } from 'react';
import { useSettings } from '@/shared/hooks/use-settings';

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;

  if (theme === 'system') {
    // Follow system preference
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', systemDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSettings();
  const theme = settings?.theme || 'system';

  // Apply theme when settings change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme immediately on mount (before settings load)
  useEffect(() => {
    // Check localStorage for cached theme or use system
    const cached = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    applyTheme(cached || 'system');
  }, []);

  // Cache theme to localStorage for faster initial load
  useEffect(() => {
    if (settings?.theme) {
      localStorage.setItem('theme', settings.theme);
    }
  }, [settings?.theme]);

  return <>{children}</>;
}
