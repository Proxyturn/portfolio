import { useMemo } from 'react';
import { cv } from '../content/cv';
import { t } from '../content/selectors';
import { useLanguage } from '../i18n/context';
import { useActiveChapter } from './useActiveChapter';

export function ChapterNav() {
  const { lang, dict } = useLanguage();
  const ids = useMemo(() => cv.chapters.map((chapter) => chapter.id), []);
  const active = useActiveChapter(ids);

  return (
    <nav className="chapter-nav" aria-label={dict.a11y.chapterNav}>
      <ol>
        {cv.chapters.map((chapter) => (
          <li key={chapter.id}>
            <a href={`#${chapter.id}`} aria-current={active === chapter.id ? 'true' : undefined}>
              {t(chapter.navLabel, lang)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
