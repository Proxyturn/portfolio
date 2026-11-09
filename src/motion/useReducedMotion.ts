import { useSyncExternalStore } from 'react';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY)
    : null;
}

function subscribe(onChange: () => void): () => void {
  const query = getQuery();
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

/** True when the visitor asked the OS for less motion. Updates live. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getQuery()?.matches ?? false,
    () => false,
  );
}
