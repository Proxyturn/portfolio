import type { Lang } from '../content/types';
import { useLanguage } from '../i18n/context';

const options: readonly { lang: Lang; short: string; nameKey: 'english' | 'portuguese' }[] = [
  { lang: 'en', short: 'EN', nameKey: 'english' },
  { lang: 'pt', short: 'PT', nameKey: 'portuguese' },
];

export function LanguageToggle() {
  const { lang, setLang, dict } = useLanguage();
  return (
    <div className="lang-toggle" role="group" aria-label={dict.language.groupLabel}>
      {options.map((option) => (
        <button
          key={option.lang}
          type="button"
          aria-pressed={lang === option.lang}
          // Each name is shown in its own language, so it is announced in that language.
          lang={option.lang === 'pt' ? 'pt-BR' : 'en'}
          onClick={() => {
            setLang(option.lang);
          }}
        >
          {/* Accessible name "EN English" keeps the visible label inside it (WCAG 2.5.3). */}
          {option.short}
          <span className="visually-hidden"> {dict.language[option.nameKey]}</span>
        </button>
      ))}
    </div>
  );
}
