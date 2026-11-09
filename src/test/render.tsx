import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { Lang } from '../content/types';
import { LanguageProvider } from '../i18n/LanguageProvider';

export function renderWithLang(ui: ReactElement, lang: Lang = 'en'): RenderResult {
  return render(<LanguageProvider initial={lang}>{ui}</LanguageProvider>);
}
