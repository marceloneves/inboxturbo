import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { en } from './translations/en';
import { es } from './translations/es';
import { pt } from './translations/pt';

export type Locale = 'en' | 'es' | 'pt';
export type Translations = typeof en;

const translations: Record<Locale, Translations> = { en, es, pt };

function detectBrowserLocale(): Locale {
  const lang = navigator.language?.toLowerCase() || 'en';
  if (lang.startsWith('pt')) return 'pt';
  if (lang.startsWith('es')) return 'es';
  return 'en';
}

function getSavedLocale(): Locale {
  const saved = localStorage.getItem('locale') as Locale | null;
  if (saved && translations[saved]) return saved;
  return detectBrowserLocale();
}

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  t: en,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('locale', l);
    document.documentElement.lang = l === 'pt' ? 'pt-BR' : l;
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
