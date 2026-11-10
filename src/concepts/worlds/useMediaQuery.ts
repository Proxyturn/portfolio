import { useCallback, useSyncExternalStore } from 'react';

/**
 * Layout gates, kept in sync with the media queries in worlds.css. The sticky stage and the
 * camera need room in both directions: at least 768 px wide and 600 px tall.
 */
export const STICKY_QUERY = '(min-width: 768px) and (min-height: 600px)';

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
