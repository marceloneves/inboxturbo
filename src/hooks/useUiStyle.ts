import { useState, useEffect, useCallback } from 'react';
import { applyUiStyle, getSavedUiStyle, type UiStyleName } from '@/lib/themes';
import { useTheme } from '@/hooks/useTheme';

export function useUiStyle() {
  const { theme } = useTheme();
  const [style, setStyleState] = useState<UiStyleName>(getSavedUiStyle);

  useEffect(() => {
    applyUiStyle(style, theme === 'dark');
  }, [style, theme]);

  const setStyle = useCallback((newStyle: UiStyleName) => {
    setStyleState(newStyle);
    applyUiStyle(newStyle, theme === 'dark');
  }, [theme]);

  return { style, setStyle };
}
