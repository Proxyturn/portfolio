import type { ReactNode } from 'react';
import { cv } from '../content/cv';
import { t } from '../content/selectors';
import type { ChapterId } from '../content/types';
import { useLanguage } from '../i18n/context';

interface Props {
  readonly id: ChapterId;
  readonly children: ReactNode;
  readonly className?: string;
  /** The hook chapter renders its own <h1>; other chapters get an <h2> title. */
  readonly hideTitle?: boolean;
  /**
   * Optional short label shown before the title (for example a district name). It comes before
   * the heading in the DOM, so it is read first. Nothing is rendered when it is absent.
   */
  readonly eyebrow?: ReactNode;
}

/**
 * Wrapper every concept uses for a story beat. Provides the anchor id, the `data-chapter`
 * hook that navigation, progress and tests rely on, and an accessible name.
 */
export function ChapterSection({ id, children, className, hideTitle = false, eyebrow }: Props) {
  const { lang } = useLanguage();
  const chapter = cv.chapters.find((c) => c.id === id);
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      data-chapter={id}
      aria-labelledby={hideTitle ? undefined : titleId}
      aria-label={hideTitle && chapter ? t(chapter.navLabel, lang) : undefined}
      className={className}
    >
      {eyebrow !== undefined && eyebrow !== null && <p className="chapter__eyebrow">{eyebrow}</p>}
      {!hideTitle && chapter && (
        <h2 id={titleId} tabIndex={-1}>
          {t(chapter.title, lang)}
        </h2>
      )}
      {children}
    </section>
  );
}
