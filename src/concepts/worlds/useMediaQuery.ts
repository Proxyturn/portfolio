import { useCallback, useSyncExternalStore } from 'react';

/*
 * Layout gates, kept in sync with the media queries in worlds.css. Each is chosen so the whole
 * world keeps its labels at 12 px or more (William, 2026-11-10); where a gate can't hold that,
 * the next one down is used.
 *
 * - split: the sticky stage on the left (SQUARE arrangement).
 * - strip: the sticky strip on top, 40% of the height (WIDE arrangement). Below 760 px tall
 *   the strip is too short for 12 px labels, so those screens get the overview.
 * - wide overview: no stage; the WIDE map once, after the hook. Narrower screens get PORTRAIT.
 */
export const SPLIT_QUERY = '(min-width: 1024px) and (min-height: 600px)';
export const STRIP_QUERY = '(min-width: 768px) and (max-width: 1023.98px) and (min-height: 760px)';
export const WIDE_OVERVIEW_QUERY = '(min-width: 820px)';

/** True while `query` matches. Updates live (resize, rotation). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
