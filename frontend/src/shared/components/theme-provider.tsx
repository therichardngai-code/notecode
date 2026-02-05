/**
 * Theme Provider - 4-Mode System
 * Supports: light, dark, glass-light, glass-dark
 * Applies .dark and .glass classes to document element
 */

import { useEffect } from 'react';
import { useSettings } from '@/shared/hooks/use-settings';

export type Theme = 'light' | 'dark' | 'glass-light' | 'glass-dark';

/** Maps theme value to CSS classes */
const THEME_CLASS_MAP: Record<Theme, { dark: boolean; glass: boolean }> = {
  'light':       { dark: false, glass: false },
  'dark':        { dark: true,  glass: false },
  'glass-light': { dark: false, glass: true  },
  'glass-dark':  { dark: true,  glass: true  },
};

/** Applies theme classes to document root */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const classes = THEME_CLASS_MAP[theme] || THEME_CLASS_MAP['light'];

  root.classList.toggle('dark', classes.dark);
  root.classList.toggle('glass', classes.glass);

  localStorage.setItem('theme', theme);
}

/** Gets initial theme from localStorage or defaults to 'light' */
function getInitialTheme(): Theme {
  const cached = localStorage.getItem('theme');

  // Migrate old 'system' value to 'light'
  if (cached === 'system') {
    localStorage.setItem('theme', 'light');
    return 'light';
  }

  if (cached && cached in THEME_CLASS_MAP) {
    return cached as Theme;
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSettings();

  // Apply initial theme on mount
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  // Apply theme when settings change
  useEffect(() => {
    if (settings?.theme) {
      const theme = settings.theme as Theme;
      if (THEME_CLASS_MAP[theme]) {
        applyTheme(theme);
      }
    }
  }, [settings?.theme]);

  return <>{children}</>;
}
