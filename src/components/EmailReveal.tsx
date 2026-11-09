import { useEffect, useRef, useState } from 'react';
import { assembleEmail } from '../content/selectors';
import { useLanguage } from '../i18n/context';

/**
 * The address is only assembled after a click, so it never appears in the HTML
 * that simple scrapers read.
 */
export function EmailReveal() {
  const { dict } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (email) link.current?.focus();
  }, [email]);

  if (!email) {
    return (
      <button
        type="button"
        className="button button--ghost"
        onClick={() => {
          setEmail(assembleEmail());
        }}
      >
        {dict.contact.revealEmail}
      </button>
    );
  }

  return (
    <p>
      <span className="visually-hidden">{dict.contact.emailLabel}: </span>
      <a ref={link} href={`mailto:${email}`}>
        {email}
      </a>
    </p>
  );
}
