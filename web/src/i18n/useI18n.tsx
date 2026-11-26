import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { en } from './en.js';
import { hi } from './hi.js';
import type { Language, Translations } from './types.js';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  children: ReactNode;
}

export function I18nProvider({ language, setLanguage, children }: I18nProviderProps) {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: language === 'hi' ? hi : en,
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}
