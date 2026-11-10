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
 * (no visible travel, and reduced motion is respected; the landing ignores reveal transforms,
 * see `landingScrollY`) and focuses its heading. If the page
 * is no longer at the top, the browser has already scrolled (a restored position, or its own
 * fragment scroll) and that position wins: nothing scrolls, but focus still moves to the jump
 * target's heading (without scrolling). Does nothing without a hash. `installDeepLink` calls
 * it and then keeps the landing while the page finishes loading.
 */
export function jumpToHashOnLoad(): HTMLElement | null {
  const element = elementForHash(window.location.hash);
  if (!element) return null;
  const target = jumpTargetFor(element);
  if (window.scrollY !== 0) return target ? focusJumpTarget(target) : null;
  if (target) {
    scrollToLanding(target);
    return focusJumpTarget(target);
  }
  element.scrollIntoView({ block: 'start', behavior: 'instant' });
  if (element.hasAttribute('tabindex')) {
    element.focus({ preventScroll: true });
    return element;
  }
  return null;
}

/** Visitor input that ends the settling of a deep link: from then on, the visitor is in charge. */
const INTERACTIONS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** Upper bound for settling a deep link, so nothing keeps watching a long-open page. */
export const SETTLE_LIMIT_MS = 10_000;

/** Upper bound for realigning scrolls while settling, so settling can never fight a scene. */
export const SETTLE_MAX_REALIGNS = 20;

/** Vertical translation of an element's own transform (0 without one). */
function translateY(element: Element): number {
  const match = /^matrix(3d)?\((.+)\)$/.exec(getComputedStyle(element).transform);
  if (!match?.[2]) return 0;
  const values = match[2].split(',').map(Number);
  return (match[1] ? values[13] : values[5]) ?? 0;
}

/**
 * Document position of an element, without the vertical translations on it and its ancestors
 * (such as reveal tweens), so a card that is still sliding in doesn't move its landing. It is
 * measured from the rendered box (sub-pixel exact, and right for a section a scroll scene has
 * pinned with `position: fixed`).
 */
function documentTop(element: HTMLElement): number {
  let shift = 0;
  for (let node: Element | null = element; node; node = node.parentElement) {
    shift += translateY(node);
  }
  return element.getBoundingClientRect().top + window.scrollY - shift;
}

/**
 * The scroll position that puts a jump target at its scroll margin, below the sticky header,
 * clamped to what the page can scroll (the last chapters may not reach the top).
 */
export function landingScrollY(target: HTMLElement): number {
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(max, Math.max(0, documentTop(target) - margin));
}

/** Scrolls instantly so a jump target lands at its scroll margin. */
export function scrollToLanding(target: HTMLElement): void {
  window.scrollTo({ top: landingScrollY(target), behavior: 'instant' });
}

/**
 * Keeps a deep link's landing while the page finishes loading. Some engines act on the fragment
 * again later (Firefox scrolls to the fragment's own element at load and resets focus to the
 * document), and late layout changes (a web-font swap, a scroll scene inserting a pin spacer)
 * move the page or the target. So, until the visitor interacts:
 * - focus: when `focusElement` loses focus to the document, at `load` (and one task later)
 *   and at `document.fonts.ready`, focus goes back to it without scrolling, but only while
 *   nothing else has focus;
 * - position, with `align` (the jump code did the scrolling): at those same moments and on
 *   layout changes (a ResizeObserver on the root and body, at most one check per frame), if
 *   the target is more than 1 px away from its landing, the page scrolls there instantly.
 *   Scrolling doesn't resize anything, so it can't retrigger itself, and it gives up after
 *   `SETTLE_MAX_REALIGNS` scrolls.
 * It stops at the first pointerdown, keydown, wheel or touchstart, when the hash no longer
 * names `target`, after `SETTLE_LIMIT_MS`, or when the returned cleanup runs.
 */
export function settleDeepLink(
  target: HTMLElement,
  focusElement: HTMLElement,
  align: boolean,
): () => void {
  const timers: number[] = [];
  let frame = 0;
  let realigns = 0;
  let done = false;

  const reapply = () => {
    if (done) return;
    const element = elementForHash(window.location.hash);
    if (!element || jumpTargetFor(element) !== target) {
      stop();
      return;
    }
    const active = document.activeElement;
    if (!active || active === document.body) focusElement.focus({ preventScroll: true });
    if (align && realigns < SETTLE_MAX_REALIGNS) {
      const landing = landingScrollY(target);
      if (Math.abs(window.scrollY - landing) > 1) {
        realigns += 1;
        window.scrollTo({ top: landing, behavior: 'instant' });
      }
    }
  };
  const later = () => {
    timers.push(window.setTimeout(reapply, 0));
  };
  const nextFrame = () => {
    if (!frame) {
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        reapply();
      });
    }
  };
  const onLoad = () => {
    reapply();
    // The engine's own load-time fragment handling may run right after the load event.
    later();
  };
  const observer =
    align && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(nextFrame) : null;
  const stop = () => {
    if (done) return;
    done = true;
    for (const type of INTERACTIONS) window.removeEventListener(type, stop, true);
    window.removeEventListener('load', onLoad);
    window.removeEventListener('hashchange', reapply);
    focusElement.removeEventListener('focusout', later);
    observer?.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    for (const timer of timers) window.clearTimeout(timer);
  };

  for (const type of INTERACTIONS) {
    window.addEventListener(type, stop, { capture: true, passive: true });
  }
  window.addEventListener('hashchange', reapply);
  focusElement.addEventListener('focusout', later);
  observer?.observe(document.documentElement);
  observer?.observe(document.body);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', onLoad, { once: true });
  // Not every environment has the Font Loading API.
  const fonts = (document as { fonts?: FontFaceSet }).fonts;
  if (fonts) void fonts.ready.then(reapply);
  timers.push(window.setTimeout(stop, SETTLE_LIMIT_MS));
  return stop;
}

/**
 * Deep link on load, then settling (see `settleDeepLink`). Returns a cleanup for unmount.
 * Settling only realigns the scroll when the jump code did the scrolling; a position the
 * browser restored is left alone.
 */
export function installDeepLink(): () => void {
  const scrolledFirst = window.scrollY !== 0;
  const focused = jumpToHashOnLoad();
  const element = elementForHash(window.location.hash);
  const target = element ? jumpTargetFor(element) : null;
  if (!focused || !target) return () => undefined;
  return settleDeepLink(target, focused, !scrolledFirst);
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
