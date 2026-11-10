/**
 * One shared jump behavior for every in-page link (docs/STORYBOARDS.md, "One shared jump
 * behavior").
 *
 * - The browser keeps doing the navigation: the hash changes, a history entry is added, Back
 *   and forward work, and the scroll (smooth unless the visitor asked for reduced motion) is
 *   the native one. Nothing calls `preventDefault`.
 * - Right after it, focus moves to the target's heading with `preventScroll`, so keyboard and
 *   screen-reader users continue from the place they jumped to.
 * - A jump target is any element matching `JUMP_TARGET_SELECTOR`: chapters, job and education
 *   entries, and any element a concept marks with `data-jump-target` (for example a map
 *   `<nav>` with a visually hidden heading). A hash naming an element inside a jump target
 *   (such as a chapter's `#energy-title`) resolves to that jump target. Every jump target gets
 *   a `scroll-margin-top` of `var(--jump-offset)` in global.css, so it lands below the sticky
 *   header.
 * - Back/forward: the browser restores that entry's scroll position; when the restored URL's
 *   hash names a jump target, focus follows it (without scrolling). Without a hash, focus
 *   stays where it is.
 */

export const JUMP_TARGET_SELECTOR =
  '[data-chapter], [data-job], [data-education], [data-jump-target]';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const MARKED_HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  .map((h) => `${h}[tabindex="-1"]`)
  .join(', ');
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** The element a fragment such as `#job-atos-cpfl` names, or null. */
export function elementForHash(hash: string): HTMLElement | null {
  if (!hash.startsWith('#') || hash.length < 2) return null;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  return document.getElementById(id);
}

/** True when `element` is a jump target (see `JUMP_TARGET_SELECTOR`). */
export function isJumpTarget(element: Element): boolean {
  return element.matches(JUMP_TARGET_SELECTOR);
}

/** The jump target an element is or belongs to, or null (for example `#main`). */
export function jumpTargetFor(element: Element): HTMLElement | null {
  return element.closest<HTMLElement>(JUMP_TARGET_SELECTOR);
}

/**
 * Where focus lands for a jump target of any element type: the first descendant heading
 * with `tabindex="-1"`, else the first h1–h6 descendant, else the element itself. An element
 * that isn't focusable yet gets `tabindex="-1"`, so this also works on markup that forgot it.
 */
export function jumpFocusElement(target: HTMLElement): HTMLElement {
  const element =
    target.querySelector<HTMLElement>(MARKED_HEADINGS) ??
    target.querySelector<HTMLElement>(HEADINGS) ??
    target;
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  return element;
}

/** Moves focus to the target's heading without scrolling. Returns the focused element. */
export function focusJumpTarget(target: HTMLElement): HTMLElement {
  const element = jumpFocusElement(target);
  element.focus({ preventScroll: true });
  return element;
}

/** The fragment of a link (HTML, or SVG with `href` or `xlink:href`) into this page, or null. */
function samePageHash(anchor: Element): string | null {
  const href = anchor.getAttribute('href') ?? anchor.getAttributeNS(XLINK_NS, 'href');
  if (!href?.includes('#')) return null;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  const here = window.location;
  if (url.origin !== here.origin || url.pathname !== here.pathname || url.search !== here.search) {
    return null;
  }
  return url.hash || null;
}

/**
 * Click listener, installed on the document in the capture phase by `useJumpNavigation` (so
 * a handler that stops propagation can't break it). Lets the native hash navigation run, then
 * focuses the target's heading. Ignores clicks that open a new tab or window, links to other
 * pages, hashes outside any jump target (such as the skip link's `#main`, which handles its
 * own focus) and clicks another handler took over with `preventDefault`.
 */
export function handleJumpClick(event: MouseEvent): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const anchor = event.target instanceof Element ? event.target.closest('a') : null;
  if (!anchor) return;
  const linkTarget = anchor.getAttribute('target');
  if ((linkTarget && linkTarget !== '_self') || anchor.hasAttribute('download')) return;
  const hash = samePageHash(anchor);
  const element = hash ? elementForHash(hash) : null;
  const target = element ? jumpTargetFor(element) : null;
  if (!target) return;
  // The link's navigation runs after this event finishes dispatching, and it resets focus
  // (to the target or the document). Focus once it has happened, unless a later handler
  // cancelled the navigation.
  window.setTimeout(() => {
    if (!event.defaultPrevented) focusJumpTarget(target);
  }, 0);
}

/**
 * `hashchange` listener: after Back/forward (or any other hash change), focus follows the
 * restored hash when it names a jump target. The browser's scroll is left alone. With no
 * hash, or a hash outside any jump target, focus stays where it is.
 */
export function handleHashChange(): void {
  const element = elementForHash(window.location.hash);
  const target = element ? jumpTargetFor(element) : null;
  if (target) focusJumpTarget(target);
}

/**
 * Deep links on load and reload (`/#now`, `/#job-…`): the story renders after the browser
 * looked for the fragment (and, on reload or Back from another page, usually after it tried
 * to restore the scroll position), so neither happened. Call once the story has rendered
 * (before paint). If the page is still at the top, scrolls instantly to the hash's jump target
 * (no visible travel, and reduced motion is respected) and focuses its heading. If the page
 * is no longer at the top, the browser has already scrolled (a restored position, or its own
 * fragment scroll) and that position wins: nothing scrolls, but focus still moves to the jump target's heading (without
 * scrolling). Does nothing without a hash.
 */
export function jumpToHashOnLoad(): HTMLElement | null {
  const element = elementForHash(window.location.hash);
  if (!element) return null;
  const target = jumpTargetFor(element);
  if (window.scrollY !== 0) return target ? focusJumpTarget(target) : null;
  (target ?? element).scrollIntoView({ block: 'start', behavior: 'instant' });
  if (target) return focusJumpTarget(target);
  if (element.hasAttribute('tabindex')) {
    element.focus({ preventScroll: true });
    return element;
  }
  return null;
}

/**
 * Keeps `--site-header-height` on :root equal to the sticky header's real height (it grows,
 * for example, when the chapter nav shows a classic horizontal scrollbar). Returns a cleanup
 * that stops observing and falls back to the CSS default.
 */
export function trackHeaderHeight(header: HTMLElement): () => void {
  const root = document.documentElement;
  const update = () => {
    const height = header.getBoundingClientRect().height;
    if (height > 0) root.style.setProperty('--site-header-height', `${height}px`);
  };
  update();
  if (typeof ResizeObserver === 'undefined') {
    return () => {
      root.style.removeProperty('--site-header-height');
    };
  }
  const observer = new ResizeObserver(update);
  observer.observe(header);
  return () => {
    observer.disconnect();
    root.style.removeProperty('--site-header-height');
  };
}
