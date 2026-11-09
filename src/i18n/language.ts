import type { Lang } from '../content/types';
import { en } from './en';
import { ptBR } from './pt-BR';
import type { Dictionary } from './types';

export const dictionaries: Readonly<Record<Lang, Dictionary>> = { en, pt: ptBR };

/** BCP 47 tag written to `<html lang>`. */
export const htmlLang: Readonly<Record<Lang, string>> = { en: 'en', pt: 'pt-BR' };

export const STORAGE_KEY = 'portfolio.lang';

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'pt';
}

/** Reads the remembered choice. Storage can be blocked (private mode), so never throw. */
export function readStoredLang(storage: Pick<Storage, 'getItem'> | undefined): Lang | null {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLang(storage: Pick<Storage, 'setItem'> | undefined, lang: Lang): void {
  try {
    storage?.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage unavailable: the choice simply is not remembered.
  }
}

/** Portuguese for any `pt*` browser language, otherwise English. */
export function detectLang(languages: readonly string[] | undefined): Lang {
  const first = languages?.[0]?.toLowerCase() ?? '';
  return first.startsWith('pt') ? 'pt' : 'en';
}

export function initialLang(): Lang {
  const storage = typeof window === 'undefined' ? undefined : safeLocalStorage();
  return (
    readStoredLang(storage) ??
    detectLang(typeof navigator === 'undefined' ? undefined : navigator.languages)
  );
}

export function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
