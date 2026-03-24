import { useEffect, useCallback } from 'react';
import { useUserPreferences } from './useUserPreferences';
import { applyUiStyle, getSavedUiStyle } from '@/lib/themes';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
  // Re-apply UI style colors for the new theme mode
  applyUiStyle(getSavedUiStyle(), theme === 'dark');
}

export function useTheme() {
  const { preferences, updatePreferences } = useUserPreferences();

  const currentTheme: Theme =
    (preferences?.theme as Theme) ||
    (localStorage.getItem('theme') as Theme) ||
    'light';

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    updatePreferences.mutate({ theme: next });
  }, [currentTheme, updatePreferences]);

  return { theme: currentTheme, toggleTheme };
}
