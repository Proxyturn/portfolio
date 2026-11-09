import { useEffect, useState } from 'react';
import type { ChapterId } from '../content/types';

/**
 * Tracks which chapter section is in the middle of the viewport.
 * Sections must carry `data-chapter="<id>"`.
 */
export function useActiveChapter(ids: readonly ChapterId[]): ChapterId | null {
  const [active, setActive] = useState<ChapterId | null>(ids[0] ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.chapter as ChapterId | undefined;
            if (id) setActive(id);
          }
        }
      },
      // A thin band across the middle of the screen decides the active chapter.
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => {
      observer.disconnect();
    };
  }, [ids]);

  return active;
}
