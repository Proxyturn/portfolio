import { cv } from '../content/cv';
import { t } from '../content/selectors';
import { format } from '../i18n/format';
import { useLanguage } from '../i18n/context';

export function Footer() {
  const { lang, dict } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>{format(dict.footer.rights, { year: new Date().getFullYear() })}</p>
        <p>{t(cv.identity.location, lang)}</p>
      </div>
    </footer>
  );
}
