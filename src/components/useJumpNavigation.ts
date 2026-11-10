import { useLayoutEffect } from 'react';
import { handleHashChange, handleJumpClick, installDeepLink, trackHeaderHeight } from './jump';

/**
 * Installs the shared jump behavior once, in the app shell: focus follows every in-page link
 * to a jump target and every Back/forward to one, and a deep link in the URL is honoured after
 * the story has rendered and kept while the page finishes loading (`settleDeepLink`). A layout
 * effect, so a deep link lands before the first paint (no flash of the top).
 */
export function useJumpNavigation(): void {
  useLayoutEffect(() => {
    const stopDeepLink = installDeepLink();
    document.addEventListener('click', handleJumpClick, true);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      stopDeepLink();
      document.removeEventListener('click', handleJumpClick, true);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
}

/**
 * Measures the sticky site header (`selector`) and keeps `--site-header-height` in sync, so
 * every jump target's scroll margin clears it at any width, language or scrollbar style.
 * A layout effect, so the measured value is in place before a deep link scrolls.
 */
export function useHeaderHeight(selector = '.site-header'): void {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(selector);
    return header ? trackHeaderHeight(header) : undefined;
  }, [selector]);
}
