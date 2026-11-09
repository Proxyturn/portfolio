import { createContext, use } from 'react';
import type { Lang } from '../content/types';
import type { Dictionary } from './types';

export interface LanguageContextValue {
  readonly lang: Lang;
  readonly setLang: (lang: Lang) => void;
  readonly dict: Dictionary;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage(): LanguageContextValue {
  const value = use(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside <LanguageProvider>.');
  return value;
}
