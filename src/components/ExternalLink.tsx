import type { ReactNode } from 'react';
import { useLanguage } from '../i18n/context';

interface Props {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Off-site link: new tab, no opener, no referrer, announced to screen readers. */
export function ExternalLink({ href, children, className }: Props) {
  const { dict } = useLanguage();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="visually-hidden"> {dict.a11y.opensInNewTab}</span>
    </a>
  );
}
