import { useLanguage } from '../i18n/context';

export const MAIN_ID = 'main';

export function SkipLink() {
  const { dict } = useLanguage();
  return (
    <a
      className="skip-link"
      href={`#${MAIN_ID}`}
      onClick={() => {
        // Safari does not always move focus to a fragment target; do it explicitly.
        document.getElementById(MAIN_ID)?.focus();
      }}
    >
      {dict.a11y.skipToContent}
    </a>
  );
}
