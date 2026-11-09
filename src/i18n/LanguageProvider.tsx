import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '../content/types';
import { LanguageContext, type LanguageContextValue } from './context';
import { dictionaries, htmlLang, initialLang, safeLocalStorage, storeLang } from './language';

interface Props {
  readonly children: ReactNode;
  /** For tests: start in a given language instead of detecting it. */
  readonly initial?: Lang;
}

export function LanguageProvider({ children, initial }: Props) {
  const [lang, setLangState] = useState<Lang>(() => initial ?? initialLang());
  const dict = dictionaries[lang];

  useEffect(() => {
    document.documentElement.lang = htmlLang[lang];
    document.title = dict.meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', dict.meta.description);
  }, [lang, dict]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    storeLang(safeLocalStorage(), next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, dict }),
    [lang, setLang, dict],
  );

  return <LanguageContext value={value}>{children}</LanguageContext>;
}
