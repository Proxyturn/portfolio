import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { App } from '../App';
import { cv } from '../content/cv';
import { renderWithLang } from '../test/render';
import {
  elementForHash,
  focusJumpTarget,
  handleHashChange,
  handleJumpClick,
  installDeepLink,
  isJumpTarget,
  jumpFocusElement,
  jumpTargetFor,
  jumpToHashOnLoad,
  insideStickyOrFixed,
  landingScrollY,
  SETTLE_AFTER_LOAD_MS,
  SETTLE_HARD_LIMIT_MS,
  SETTLE_LIMIT_MS,
  SETTLE_MAX_REALIGNS,
  SETTLE_SCROLL_QUIET_MS,
  settleDeepLink,
  trackHeaderHeight,
} from './jump';
import { useHeaderHeight } from './useJumpNavigation';

/** jsdom has no layout, so scrolling is recorded instead of performed. */
const scrollIntoView = vi.fn();

/** ResizeObserver entries reporting `height` for the body (what settling observes). */
function resized(height: number, target: Element = document.body): ResizeObserverEntry[] {
  return [
    {
      target,
      borderBoxSize: [{ blockSize: height }],
      contentRect: { height },
    } as unknown as ResizeObserverEntry,
  ];
}

/** A fake scroll position that window.scrollTo moves and window.scrollY reads. */
let scrollPosition = 0;
const windowScrollTo = vi.fn<(options?: ScrollToOptions | number, y?: number) => void>();
const restores: (() => void)[] = [];

/** Replaces a property (a value, or a getter) until the end of the test. */
function override(object: object, key: string, value: unknown, getter = false) {
  const original = Object.getOwnPropertyDescriptor(object, key);
  Object.defineProperty(
    object,
    key,
    getter ? { configurable: true, get: value as () => unknown } : { configurable: true, value },
  );
  restores.push(() => {
    if (original) Object.defineProperty(object, key, original);
    else Reflect.deleteProperty(object, key);
  });
}

function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  // Test fixture parsed with DOMParser (the project bans innerHTML).
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  host.append(...parsed.body.childNodes);
  document.body.append(host);
  return host;
}

const nextTask = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  scrollPosition = 0;
  windowScrollTo.mockReset();
  // Only the jump code's object form moves the fake page. ScrollTrigger (imported with the
  // app) calls scrollTo(x, y) at load with jsdom's real scrollTop of 0, which would reset it.
  windowScrollTo.mockImplementation((options?: ScrollToOptions | number) => {
    if (typeof options === 'object') scrollPosition = options.top ?? scrollPosition;
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(windowScrollTo);
  override(window, 'scrollY', () => scrollPosition, true);
  override(document.documentElement, 'scrollHeight', 100_000);
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  document.body.replaceChildren();
  window.history.replaceState(null, '', '/');
  document.documentElement.style.removeProperty('--site-header-height');
  vi.unstubAllGlobals();
  for (const restore of restores.splice(0).reverse()) restore();
});

describe('elementForHash', () => {
  it('finds the element a fragment names, decoding it', () => {
    mount('<section id="now"></section><div id="é"></div>');
    expect(elementForHash('#now')?.id).toBe('now');
    expect(elementForHash('#%C3%A9')?.id).toBe('é');
  });

  it('returns null for empty, missing or malformed fragments', () => {
    mount('<section id="now"></section>');
    expect(elementForHash('')).toBeNull();
    expect(elementForHash('#')).toBeNull();
    expect(elementForHash('now')).toBeNull();
    expect(elementForHash('#missing')).toBeNull();
    expect(elementForHash('#%E0%A4%A')).toBeNull();
  });
});

describe('jumpFocusElement', () => {
  it('finds a hidden heading with tabindex -1 inside any element type, such as a map nav', () => {
    mount(`
      <nav id="world-map" data-jump-target>
        <h2 class="visually-hidden" tabindex="-1">Map</h2>
        <a href="#now">Now</a>
      </nav>`);
    const nav = document.getElementById('world-map') as HTMLElement;
    expect(isJumpTarget(nav)).toBe(true);
    expect(jumpFocusElement(nav)).toBe(screen.getByRole('heading', { name: 'Map' }));
  });

  it('prefers a heading marked tabindex -1 over an earlier plain heading', () => {
    mount('<div id="t"><h3>Plain</h3><h4 tabindex="-1">Marked</h4></div>');
    const target = document.getElementById('t') as HTMLElement;
    expect(jumpFocusElement(target).textContent).toBe('Marked');
  });

  it('falls back to the first heading and makes it focusable', () => {
    mount('<article id="t"><p>Intro</p><h3>First</h3><h3>Second</h3></article>');
    const element = jumpFocusElement(document.getElementById('t') as HTMLElement);
    expect(element.textContent).toBe('First');
    expect(element).toHaveAttribute('tabindex', '-1');
  });

  it('falls back to the element itself when it has no heading', () => {
    mount('<div id="t"><p>No heading</p></div>');
    const target = document.getElementById('t') as HTMLElement;
    expect(focusJumpTarget(target)).toBe(target);
    expect(target).toHaveAttribute('tabindex', '-1');
    expect(target).toHaveFocus();
  });

  it('keeps an existing tabindex', () => {
    mount('<div id="t"><h2 tabindex="0">Focusable</h2></div>');
    const element = jumpFocusElement(document.getElementById('t') as HTMLElement);
    expect(element).toHaveAttribute('tabindex', '0');
  });
});

describe('handleJumpClick', () => {
  beforeEach(() => {
    document.addEventListener('click', handleJumpClick, true);
  });
  afterEach(() => {
    document.removeEventListener('click', handleJumpClick, true);
  });

  function fixture() {
    mount(`
      <a href="#job-x">Job</a>
      <a href="#main">Main</a>
      <a href="#job-x" target="_blank">New tab</a>
      <a href="#job-x" download>Download</a>
      <a href="/other#job-x">Other page</a>
      <a href="#missing">Missing</a>
      <a href="/">No hash</a>
      <a href="#job-x-title">Job title</a>
      <main id="main" tabindex="-1">
        <article id="job-x" data-job="x">
          <header><h3 id="job-x-title" tabindex="-1">Job X</h3></header>
        </article>
      </main>`);
  }

  it('lets the hash navigation happen, then focuses the target heading', async () => {
    fixture();
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Job' }));
    await act(nextTask);
    expect(window.location.hash).toBe('#job-x');
    expect(screen.getByRole('heading', { name: 'Job X' })).toHaveFocus();
  });

  it('resolves a hash inside a jump target (a heading id) to that target', async () => {
    fixture();
    fireEvent.click(screen.getByRole('link', { name: 'Job title' }));
    await act(nextTask);
    expect(screen.getByRole('heading', { name: 'Job X' })).toHaveFocus();
  });

  it('still works when an ancestor stops the click from bubbling', async () => {
    mount(`
      <div class="stopper"><a href="#job-x">Job</a></div>
      <article id="job-x" data-job="x"><h3 tabindex="-1">Job X</h3></article>`);
    document.querySelector('.stopper')?.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    fireEvent.click(screen.getByRole('link', { name: 'Job' }));
    await act(nextTask);
    expect(screen.getByRole('heading', { name: 'Job X' })).toHaveFocus();
  });

  it('follows SVG links that use xlink:href', async () => {
    mount(`
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <a xlink:href="#world-map"><text>Building</text></a>
      </svg>
      <nav id="world-map" data-jump-target><h2 tabindex="-1">Map</h2></nav>`);
    fireEvent.click(screen.getByText('Building'));
    await act(nextTask);
    expect(screen.getByRole('heading', { name: 'Map' })).toHaveFocus();
  });

  it('follows clicks on elements inside the link', async () => {
    mount('<a href="#job-x"><span>Inner</span></a><div id="job-x" data-job="x"><h3>X</h3></div>');
    fireEvent.click(screen.getByText('Inner'));
    await act(nextTask);
    expect(screen.getByRole('heading', { name: 'X' })).toHaveFocus();
  });

  it.each([
    ['a modifier key', { ctrlKey: true }],
    ['the middle button', { button: 1 }],
    ['the meta key', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
  ])('ignores clicks with %s', async (_name, init) => {
    fixture();
    fireEvent.click(screen.getByRole('link', { name: 'Job' }), init);
    await act(nextTask);
    expect(document.body).toHaveFocus();
  });

  it.each(['Main', 'New tab', 'Download', 'Other page', 'Missing', 'No hash'])(
    'leaves the "%s" link alone',
    async (name) => {
      fixture();
      // After the jump handler has seen the click, stop jsdom from leaving the page.
      const stay = (event: Event) => {
        event.preventDefault();
      };
      window.addEventListener('click', stay);
      fireEvent.click(screen.getByRole('link', { name }));
      await act(nextTask);
      window.removeEventListener('click', stay);
      expect(screen.getByRole('heading', { name: 'Job X' })).not.toHaveFocus();
      expect(document.getElementById('main')).not.toHaveFocus();
    },
  );

  it('respects handlers that prevented the navigation', async () => {
    fixture();
    const link = screen.getByRole('link', { name: 'Job' });
    link.addEventListener('click', (event) => {
      event.preventDefault();
    });
    fireEvent.click(link);
    await act(nextTask);
    expect(screen.getByRole('heading', { name: 'Job X' })).not.toHaveFocus();
  });

  it('ignores clicks that are not on an element', () => {
    const event = new MouseEvent('click', { bubbles: true });
    expect(() => {
      document.dispatchEvent(event);
    }).not.toThrow();
  });
});

describe('jumpToHashOnLoad', () => {
  function story() {
    mount(`
      <section id="now" data-chapter="now"><h2 tabindex="-1">Now</h2></section>
      <main id="main" tabindex="-1"></main>
      <div id="plain"></div>`);
  }

  it('does nothing without a hash', () => {
    story();
    expect(jumpToHashOnLoad()).toBeNull();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls instantly to a deep link and focuses its heading', () => {
    story();
    window.history.replaceState(null, '', '/#now');
    const focused = jumpToHashOnLoad();
    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(focused).toBe(screen.getByRole('heading', { name: 'Now' }));
    expect(focused).toHaveFocus();
  });

  it('focuses a focusable element that is not a jump target, and only scrolls to others', () => {
    story();
    window.history.replaceState(null, '', '/#main');
    expect(jumpToHashOnLoad()).toBe(document.getElementById('main'));
    window.history.replaceState(null, '', '/#plain');
    expect(jumpToHashOnLoad()).toBeNull();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('resolves a hash inside a jump target to that target', () => {
    mount(`
      <section id="now" data-chapter="now">
        <h2 id="now-title" tabindex="-1">Now</h2>
      </section>`);
    window.history.replaceState(null, '', '/#now-title');
    vi.spyOn(
      document.getElementById('now') as HTMLElement,
      'getBoundingClientRect',
    ).mockReturnValue({ top: 640 } as DOMRect);
    expect(jumpToHashOnLoad()).toBe(screen.getByRole('heading', { name: 'Now' }));
    expect(windowScrollTo).toHaveBeenCalledWith({ top: 640, behavior: 'instant' });
    expect(jumpTargetFor(document.getElementById('now-title') as HTMLElement)?.id).toBe('now');
  });

  function withScrollY(value: number, run: () => void) {
    scrollPosition = value;
    run();
  }

  it('on a page already scrolled (restored), focuses the heading without scrolling', () => {
    story();
    window.history.replaceState(null, '', '/#now');
    withScrollY(120, () => {
      const focused = jumpToHashOnLoad();
      expect(focused).toBe(screen.getByRole('heading', { name: 'Now' }));
      expect(focused).toHaveFocus();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(windowScrollTo).not.toHaveBeenCalled();
  });

  it('on a page already scrolled, leaves a hash outside any jump target alone', () => {
    story();
    window.history.replaceState(null, '', '/#main');
    withScrollY(120, () => {
      expect(jumpToHashOnLoad()).toBeNull();
    });
    expect(document.getElementById('main')).not.toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('handleHashChange (Back/forward)', () => {
  function story() {
    mount(`
      <section id="now" data-chapter="now"><h2 tabindex="-1">Now</h2></section>
      <main id="main" tabindex="-1"><button type="button">Elsewhere</button></main>`);
  }

  it('moves focus to the restored jump target without scrolling', () => {
    story();
    window.history.replaceState(null, '', '/#now');
    handleHashChange();
    expect(screen.getByRole('heading', { name: 'Now' })).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(['/', '/#main', '/#missing'])('leaves focus alone for %s', (url) => {
    story();
    const button = screen.getByRole('button', { name: 'Elsewhere' });
    button.focus();
    window.history.replaceState(null, '', url);
    handleHashChange();
    expect(button).toHaveFocus();
  });
});

describe('header height', () => {
  function header(height: number): HTMLElement {
    const element = mount('<header class="site-header"></header>').firstElementChild as HTMLElement;
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ height } as DOMRect);
    return element;
  }
  const property = () => document.documentElement.style.getPropertyValue('--site-header-height');

  it('writes the measured height on :root, follows resizes and cleans up', () => {
    const observed: Element[] = [];
    let notify: () => void = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect = disconnect;
      },
    );
    const element = header(59.25);
    const stop = trackHeaderHeight(element);
    expect(observed).toEqual([element]);
    expect(property()).toBe('59.25px');

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ height: 69.25 } as DOMRect);
    notify();
    expect(property()).toBe('69.25px');

    stop();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(property()).toBe('');
  });

  it('keeps the CSS fallback when the header has no size yet, or without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const stopEmpty = trackHeaderHeight(header(0));
    expect(property()).toBe('');
    stopEmpty();
    const stop = trackHeaderHeight(header(60));
    expect(property()).toBe('60px');
    stop();
    expect(property()).toBe('');
  });

  it('useHeaderHeight measures the header and stops on unmount', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    header(64);
    function Probe() {
      useHeaderHeight();
      return null;
    }
    const { unmount } = renderWithLang(<Probe />);
    expect(property()).toBe('64px');
    unmount();
    expect(property()).toBe('');
  });

  it('useHeaderHeight does nothing without a header', () => {
    function Probe() {
      useHeaderHeight('.missing');
      return null;
    }
    renderWithLang(<Probe />);
    expect(property()).toBe('');
  });
});

describe('useJumpNavigation in the app', () => {
  it('honours a deep link once the story has rendered', () => {
    window.history.replaceState(null, '', '/#edu-computer-science');
    const degree = cv.education.find((e) => e.id === 'computer-science');
    if (!degree) throw new Error('Expected the Computer Science degree in the CV.');
    renderWithLang(<App />);
    expect(windowScrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }));
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: degree.title.en })).toHaveFocus();
  });

  it('moves focus to the chapter heading after a chapter navigation click', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithLang(<App />);
    const nav = screen.getByRole('navigation', { name: 'Chapters' });
    await user.click(within(nav).getByRole('link', { name: 'Energy' }));
    await act(nextTask);
    expect(window.location.hash).toBe('#energy');
    expect(screen.getByRole('heading', { level: 2, name: 'Powering energy' })).toHaveFocus();

    // Back/forward: focus follows the restored hash.
    await user.click(within(nav).getByRole('link', { name: 'Contact' }));
    await act(nextTask);
    window.history.replaceState(null, '', '/#energy');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(screen.getByRole('heading', { level: 2, name: 'Powering energy' })).toHaveFocus();

    // The listeners go away with the app.
    unmount();
    mount('<a href="#t">T</a><section id="t" data-chapter="t"><h2>T</h2></section>');
    fireEvent.click(screen.getByRole('link', { name: 'T' }));
    await act(nextTask);
    expect(screen.getByRole('heading', { name: 'T' })).not.toHaveFocus();
  });

  it('gives every job and education entry a focusable heading and an id', () => {
    const { container } = renderWithLang(<App />);
    const entries = container.querySelectorAll<HTMLElement>('[data-job], [data-education]');
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const prefix = entry.dataset.job ? 'job-' : 'edu-';
      expect(entry.id).toBe(`${prefix}${entry.dataset.job ?? entry.dataset.education ?? ''}`);
      expect(entry.querySelector('h3')).toHaveAttribute('tabindex', '-1');
    }
    for (const heading of container.querySelectorAll('[data-chapter] > h2')) {
      expect(heading).toHaveAttribute('tabindex', '-1');
    }
  });
});

describe('landingScrollY', () => {
  function styles(map: Map<Element, { scrollMarginTop?: string; transform?: string }>) {
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
      const own = map.get(element);
      return {
        scrollMarginTop: own?.scrollMarginTop ?? '',
        transform: own?.transform ?? 'none',
      } as CSSStyleDeclaration;
    });
  }
  function at(element: HTMLElement, top: number) {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
  }

  it("puts the target at its scroll margin, without its own or its ancestors' translation", () => {
    mount('<div class="wrap"><section id="t" data-chapter="t"><h2>T</h2></section></div>');
    const target = document.getElementById('t') as HTMLElement;
    const wrap = document.querySelector('.wrap') as HTMLElement;
    scrollPosition = 200;
    // Rendered 24 px low by a reveal tween, and 6 px more by a 3D transform on the wrapper.
    at(target, 830);
    styles(
      new Map<Element, { scrollMarginTop?: string; transform?: string }>([
        [target, { scrollMarginTop: '84px', transform: 'matrix(1, 0, 0, 1, 0, 24)' }],
        [wrap, { transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 6, 0, 1)' }],
      ]),
    );
    expect(landingScrollY(target)).toBe(916);
  });

  it('stops where the page ends, and never goes above the top', () => {
    mount('<section id="t" data-chapter="t"><h2>T</h2></section>');
    const target = document.getElementById('t') as HTMLElement;
    override(document.documentElement, 'scrollHeight', window.innerHeight + 500);
    at(target, 4000);
    styles(new Map());
    expect(landingScrollY(target)).toBe(500);
    at(target, 20);
    styles(new Map([[target, { scrollMarginTop: '84px' }]]));
    expect(landingScrollY(target)).toBe(0);
  });
});

describe('settleDeepLink (keeping a deep link while the page loads)', () => {
  let stop: () => void = () => undefined;

  /**
   * A chapter at a controllable layout position, with the URL pointing at it and the page at
   * its landing (as right after the jump).
   */
  function story(hash = '/#now', headingOffset = 120) {
    mount(`
      <section id="now" data-chapter="now"><h2 id="now-title" tabindex="-1">Now</h2></section>
      <button type="button">Elsewhere</button>`);
    window.history.replaceState(null, '', hash);
    const target = document.getElementById('now') as HTMLElement;
    let top = 1000;
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(
      () => ({ top: top - scrollPosition }) as DOMRect,
    );
    scrollPosition = 1000;
    const heading = screen.getByRole('heading', { name: 'Now' });
    vi.spyOn(heading, 'getBoundingClientRect').mockImplementation(
      () => ({ top: top + headingOffset - scrollPosition }) as DOMRect,
    );
    heading.focus();
    return {
      target,
      heading,
      moveTo: (value: number) => {
        top = value;
      },
    };
  }

  const realigns = () =>
    windowScrollTo.mock.calls.filter(([options]) => {
      return typeof options === 'object' && options.behavior === 'instant';
    });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('puts focus back on the heading when the engine resets it to the document', async () => {
    const { target, heading } = story();
    stop = settleDeepLink(target, heading, true);
    await act(nextTask);
    heading.blur();
    expect(document.body).toHaveFocus();
    await act(nextTask);
    expect(heading).toHaveFocus();
    expect(realigns()).toEqual([]);
  });

  it('never takes focus from another element', async () => {
    const { target, heading } = story();
    stop = settleDeepLink(target, heading, true);
    const button = screen.getByRole('button', { name: 'Elsewhere' });
    button.focus();
    await act(nextTask);
    expect(button).toHaveFocus();
  });

  it.each(['pointerdown', 'keydown', 'wheel', 'touchstart'])(
    'stops for good after the first %s',
    async (type) => {
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      await act(nextTask);
      window.dispatchEvent(new Event(type));
      heading.blur();
      moveTo(1100);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await act(nextTask);
      expect(document.body).toHaveFocus();
      expect(realigns()).toEqual([]);
    },
  );

  it('stops when the hash no longer names the target', async () => {
    const { target, heading } = story();
    stop = settleDeepLink(target, heading, true);
    await act(nextTask);
    window.history.replaceState(null, '', '/#elsewhere');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.history.replaceState(null, '', '/#now');
    heading.blur();
    await act(nextTask);
    expect(document.body).toHaveFocus();
  });

  it('realigns at load when the layout moved the target, once', () => {
    override(document, 'readyState', 'loading');
    const { target, heading, moveTo } = story();
    stop = settleDeepLink(target, heading, true);
    moveTo(1025);
    window.dispatchEvent(new Event('load'));
    expect(realigns()).toEqual([[{ top: 1025, behavior: 'instant' }]]);
    // Landed: further checks find nothing to do, so it can't loop.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toHaveLength(1);
  });

  it("realigns at load after an engine scrolled to the fragment's own heading", () => {
    override(document, 'readyState', 'loading');
    const { target, heading } = story('/#now-title', 340);
    stop = settleDeepLink(target, heading, true);
    scrollPosition = 1340;
    window.dispatchEvent(new Event('load'));
    expect(realigns()).toEqual([[{ top: 1000, behavior: 'instant' }]]);
  });

  it('ignores sub-pixel offsets, and never realigns a position the browser restored', () => {
    override(document, 'readyState', 'loading');
    const first = story();
    stop = settleDeepLink(first.target, first.heading, true);
    first.moveTo(1000.5);
    window.dispatchEvent(new Event('load'));
    expect(realigns()).toEqual([]);
    stop();

    stop = settleDeepLink(first.target, first.heading, false);
    first.moveTo(1200);
    window.dispatchEvent(new Event('load'));
    expect(realigns()).toEqual([]);
  });

  it('checks again once web fonts are ready', async () => {
    let fontsLoaded: () => void = () => undefined;
    override(document, 'fonts', {
      ready: new Promise<void>((resolve) => {
        fontsLoaded = resolve;
      }),
    });
    const { target, heading, moveTo } = story();
    stop = settleDeepLink(target, heading, true);
    await act(nextTask);
    moveTo(1030);
    await act(async () => {
      fontsLoaded();
      await Promise.resolve();
    });
    expect(realigns()).toEqual([[{ top: 1030, behavior: 'instant' }]]);
  });

  it('checks after layout changes, at most once per frame, only while aligning', () => {
    const observed: Element[] = [];
    const callbacks: ((entries: ResizeObserverEntry[]) => void)[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: (entries: ResizeObserverEntry[]) => void) {
          callbacks.push(callback);
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect = disconnect;
      },
    );
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const { target, heading, moveTo } = story();
    stop = settleDeepLink(target, heading, true);
    expect(observed).toEqual([document.documentElement, document.body]);
    // The first notification (sent on observe) and an unchanged height are not layout changes.
    callbacks[0]?.(resized(5000));
    callbacks[0]?.(resized(5000));
    expect(frames).toEqual([]);
    moveTo(1040);
    callbacks[0]?.(resized(5040));
    callbacks[0]?.(resized(5060));
    expect(frames).toHaveLength(1);
    frames[0]?.(0);
    expect(realigns()).toEqual([[{ top: 1040, behavior: 'instant' }]]);

    // A frame still pending when settling stops is cancelled, and the observer disconnected.
    callbacks[0]?.(resized(5100));
    stop();
    expect(cancel).toHaveBeenCalledWith(2);
    expect(disconnect).toHaveBeenCalledTimes(1);

    // Without aligning (a restored position), layout changes aren't watched at all.
    stop = settleDeepLink(target, heading, false);
    expect(callbacks).toHaveLength(1);
  });

  it(`gives up realigning after ${String(SETTLE_MAX_REALIGNS)} scrolls`, () => {
    const { target, heading } = story('/#now-title', 340);
    stop = settleDeepLink(target, heading, true);
    // The page refuses to stay put (something keeps moving it back to the heading).
    windowScrollTo.mockImplementation(() => undefined);
    scrollPosition = 1340;
    for (let i = 0; i < SETTLE_MAX_REALIGNS + 5; i++) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    expect(realigns()).toHaveLength(SETTLE_MAX_REALIGNS);
  });

  it(`gives up ${String(SETTLE_LIMIT_MS)} ms after starting on a loaded page, and the cleanup stops it too`, () => {
    vi.useFakeTimers();
    const { target, heading, moveTo } = story();
    stop = settleDeepLink(target, heading, true);
    vi.advanceTimersByTime(SETTLE_LIMIT_MS);
    moveTo(1100);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toEqual([]);

    const again = settleDeepLink(target, heading, true);
    again();
    again();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toEqual([]);
  });

  it(`runs until the later of ${String(SETTLE_LIMIT_MS)} ms and ${String(SETTLE_AFTER_LOAD_MS)} ms after load`, () => {
    vi.useFakeTimers();
    override(document, 'readyState', 'loading');
    const { target, heading, moveTo } = story();
    stop = settleDeepLink(target, heading, true);
    vi.advanceTimersByTime(9_000);
    window.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(SETTLE_AFTER_LOAD_MS - 100);
    moveTo(1050);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toEqual([[{ top: 1050, behavior: 'instant' }]]);
    vi.advanceTimersByTime(200);
    moveTo(1100);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toHaveLength(1);
  });

  it('keeps the start limit when load comes early', () => {
    vi.useFakeTimers();
    override(document, 'readyState', 'loading');
    const { target, heading, moveTo } = story();
    stop = settleDeepLink(target, heading, true);
    vi.advanceTimersByTime(100);
    window.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(SETTLE_LIMIT_MS - 200);
    moveTo(1050);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toHaveLength(1);
    vi.advanceTimersByTime(200);
    moveTo(1100);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toHaveLength(1);
  });

  it(`stops after ${String(SETTLE_HARD_LIMIT_MS)} ms on a page that never finishes loading`, () => {
    vi.useFakeTimers();
    override(document, 'readyState', 'loading');
    const { target, heading, moveTo } = story();
    stop = settleDeepLink(target, heading, true);
    vi.advanceTimersByTime(SETTLE_HARD_LIMIT_MS - 100);
    moveTo(1050);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toHaveLength(1);
    vi.advanceTimersByTime(200);
    moveTo(1100);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigns()).toHaveLength(1);
  });

  describe('scrolls that are not its own', () => {
    let frames: FrameRequestCallback[] = [];
    /** Each queued frame's id (unique), and the ids cancelled before they ran. */
    let frameIds: number[] = [];
    let nextFrameId = 0;
    const cancelled = new Set<number>();
    let cancelFrame: MockInstance<(handle: number) => void> | undefined;
    beforeEach(() => {
      vi.useFakeTimers();
      frames = [];
      frameIds = [];
      nextFrameId = 0;
      cancelled.clear();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        nextFrameId += 1;
        frames.push(callback);
        frameIds.push(nextFrameId);
        return nextFrameId;
      });
      cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle) => {
        cancelled.add(handle);
      });
    });
    /** Runs the frames queued so far (not ones they request), skipping cancelled ones. */
    const runFrames = () => {
      const ids = frameIds.splice(0);
      frames.splice(0).forEach((callback, i) => {
        if (!cancelled.has(ids[i] ?? 0)) callback(0);
      });
    };
    const scrollTo = (y: number) => {
      scrollPosition = y;
      window.dispatchEvent(new Event('scroll'));
    };
    /** The quiet time, then the two animation frames a decision waits for. */
    const quiet = () => {
      vi.advanceTimersByTime(SETTLE_SCROLL_QUIET_MS);
      runFrames();
      runFrames();
    };
    /** Proves aligning is still on (or off) with a later layout change. */
    const stillAligning = (moveTo: (value: number) => void, to: number) => {
      const before = realigns().length;
      moveTo(to);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return realigns().length > before;
    };

    it('ignores its own position', () => {
      const { target, heading } = story();
      stop = settleDeepLink(target, heading, true);
      scrollTo(1000.5);
      quiet();
      expect(realigns()).toEqual([]);
    });

    it.each([120, 340])(
      'realigns an engine fragment scroll to a heading %i px below the chapter top',
      (offset) => {
        // The Worlds overview puts a vignette and an eyebrow above the heading (189–341 px).
        const { target, heading, moveTo } = story('/#now-title', offset);
        stop = settleDeepLink(target, heading, true);
        scrollTo(1000 + offset);
        quiet();
        expect(realigns()).toEqual([[{ top: 1000, behavior: 'instant' }]]);
        expect(stillAligning(moveTo, 1050)).toBe(true);
      },
    );

    it('realigns at once when a check finds the fragment geometry before the scroll event', () => {
      const { target, heading } = story('/#now-title', 340);
      stop = settleDeepLink(target, heading, true);
      scrollPosition = 1340;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      expect(realigns()).toEqual([[{ top: 1000, behavior: 'instant' }]]);
    });

    it('judges a smooth fragment scroll where it ends, not on the way', () => {
      const { target, heading } = story('/#now-title', 340);
      stop = settleDeepLink(target, heading, true);
      for (const y of [1010, 1060, 1150, 1260, 1320, 1340]) {
        scrollTo(y);
        vi.advanceTimersByTime(16);
      }
      expect(realigns()).toEqual([]);
      quiet();
      expect(realigns()).toEqual([[{ top: 1000, behavior: 'instant' }]]);
    });

    it('treats the bottom as the end of a fragment scroll when the clamp explains it', () => {
      // The page can scroll to 900 at most, so the target (at 1000) stays 100 px below its
      // margin there, inside the viewport: that's where a fragment scroll to it ends.
      override(document.documentElement, 'scrollHeight', 900 + window.innerHeight);
      const { target, heading, moveTo } = story();
      scrollPosition = 700;
      stop = settleDeepLink(target, heading, true);
      scrollTo(900);
      quiet();
      expect(stillAligning(moveTo, 800)).toBe(true);
      expect(realigns()).toEqual([[{ top: 800, behavior: 'instant' }]]);
    });

    it('does not take a no-input scroll to the bottom for a fragment scroll', () => {
      // At the bottom with the target 400 px above the viewport: a scrollbar drag or a jump
      // to the end, not something the hash explains.
      override(document.documentElement, 'scrollHeight', 1400 + window.innerHeight);
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      scrollTo(1400);
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1050)).toBe(false);
    });

    /** A ResizeObserver whose callback the test calls (a layout change). */
    function observeLayout() {
      const callbacks: ((entries: ResizeObserverEntry[]) => void)[] = [];
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: (entries: ResizeObserverEntry[]) => void) {
            callbacks.push(callback);
          }
          observe() {
            return undefined;
          }
          disconnect() {
            return undefined;
          }
        },
      );
      let height = 5000;
      let first = true;
      /** Reports a page-height change of `by` px (after the observer's first notification). */
      return (by = 400) => {
        for (const callback of callbacks) {
          if (first) callback(resized(height));
          height += by;
          callback(resized(height));
        }
        first = false;
      };
    }

    it("never takes the observer's first notification for a layout change", () => {
      const callbacks: ((entries: ResizeObserverEntry[]) => void)[] = [];
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: (entries: ResizeObserverEntry[]) => void) {
            callbacks.push(callback);
          }
          observe() {
            return undefined;
          }
          disconnect() {
            return undefined;
          }
        },
      );
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      // A no-input scroll, and the first notification in the same frame (seen in WebKit).
      scrollTo(1080);
      callbacks[0]?.([...resized(5000), ...resized(4000, document.documentElement)]);
      runFrames();
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });

    it.each([
      ['grows (+40 px, anchoring followed 25)', 1040, 1025],
      ['shrinks (−24 px, anchoring followed 15)', 976, 985],
      ['moved the anchored heading more than the chapter (+120, page +180)', 1120, 1180],
    ])('realigns a whole-page reflow that %s, whatever the geometry', (_name, top, pageY) => {
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      moveTo(top);
      // Anchoring is applied during the layout, before the report; its event comes later.
      scrollPosition = pageY;
      layoutChanged();
      // Scroll anchoring's scroll event comes while the layout check is pending.
      scrollTo(pageY);
      runFrames();
      expect(realigns()).toEqual([[{ top, behavior: 'instant' }]]);
      quiet();
      expect(stillAligning(moveTo, top + 30)).toBe(true);
    });

    it('runs a plain check at document.fonts.ready (no layout change assumed)', async () => {
      // WebKit resolves it after load even when no font changed; a real swap's reflow reaches
      // the ResizeObserver. So a no-input scroll just before it is still judged as a scroll.
      let fontsLoaded: () => void = () => undefined;
      override(document, 'fonts', {
        ready: new Promise<void>((resolve) => {
          fontsLoaded = resolve;
        }),
      });
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      scrollPosition = 1080;
      await act(async () => {
        fontsLoaded();
        await Promise.resolve();
      });
      expect(realigns()).toEqual([]);
      quiet();
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });

    it('judges the same move by geometry when no layout change explains it', () => {
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      moveTo(1040);
      scrollTo(1025);
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });

    it("sees a reflow that happened before the observer's first notification", () => {
      // Seen on Journey: a 246 px reflow between the start and the first notification moved
      // the target 90 px; with the first notification as the baseline it went unnoticed.
      const callbacks: ((entries: ResizeObserverEntry[]) => void)[] = [];
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: (entries: ResizeObserverEntry[]) => void) {
            callbacks.push(callback);
          }
          observe() {
            return undefined;
          }
          disconnect() {
            return undefined;
          }
        },
      );
      vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue({
        height: 5000,
      } as DOMRect);
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      moveTo(910);
      callbacks[0]?.(resized(4754));
      runFrames();
      expect(realigns()).toEqual([[{ top: 910, behavior: 'instant' }]]);
    });

    it('takes a page move larger than the layout change for a scroll', () => {
      // A visitor's 80 px scroll in the same frame as a 20 px late image (seen in WebKit).
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      scrollTo(1080);
      moveTo(1020);
      layoutChanged(20);
      runFrames();
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });

    it('does not take a visitor scroll for anchoring when a reflow then moves the content the other way', () => {
      // Seen on Journey at load: the visitor scrolls 80 px down, then a 246 px layout change
      // moves the target 141 px up. Anchoring never moves the page against the content.
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      scrollTo(1080);
      moveTo(859);
      layoutChanged(246);
      runFrames();
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 900)).toBe(false);
    });

    it("does not take a visitor scroll an earlier check saw for a later reflow's anchoring", () => {
      // Seen on Journey: a check sees the visitor's 80 px scroll; two layout changes later the
      // content has moved back the same way (net +11 px), but the page didn't move with it.
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      scrollPosition = 1080;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      // Two frames later the sighting stands.
      runFrames();
      runFrames();
      moveTo(1011);
      layoutChanged(152);
      runFrames();
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });

    it('lets the observer report a reflow a frame after a plain check saw its anchoring (WebKit)', () => {
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      vi.advanceTimersByTime(1);
      moveTo(1040);
      scrollPosition = 1025;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      expect(realigns()).toEqual([]);
      runFrames();
      layoutChanged(40);
      runFrames();
      expect(realigns()).toEqual([[{ top: 1040, behavior: 'instant' }]]);
      quiet();
      expect(stillAligning(moveTo, 1080)).toBe(true);
    });

    it("after a decision realigns, a reflow's anchoring is still taken for layout", () => {
      // A plain check sights a smooth fragment scroll part-way (1200); it ends at the heading
      // (1340) and the decision realigns to 1000. A +40 px reflow then anchors the page 25 px:
      // that must be compared with the realigned position, not with the old sighting.
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story('/#now-title', 340);
      stop = settleDeepLink(target, heading, true);
      vi.advanceTimersByTime(1);
      scrollPosition = 1200;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      runFrames();
      runFrames();
      scrollTo(1340);
      quiet();
      expect(realigns()).toEqual([[{ top: 1000, behavior: 'instant' }]]);
      moveTo(1040);
      scrollPosition = 1025;
      layoutChanged(40);
      scrollTo(1025);
      runFrames();
      expect(realigns()).toEqual([
        [{ top: 1000, behavior: 'instant' }],
        [{ top: 1040, behavior: 'instant' }],
      ]);
      quiet();
      expect(stillAligning(moveTo, 1080)).toBe(true);
    });

    it('does not take a move a check already saw for a reflow that left the content in place', () => {
      // The visitor scrolls to 1080 and a check sees it; two frames later a 152 px layout
      // change elsewhere leaves the target and its heading where they were.
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      vi.advanceTimersByTime(1);
      scrollPosition = 1080;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      runFrames();
      runFrames();
      layoutChanged(152);
      runFrames();
      expect(realigns()).toEqual([]);
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });

    it("takes anchoring for layout when a smaller change's check ran before the reflow's report", () => {
      // Seen on Terminal in WebKit: a 3 px change is reported, then a 433 px reflow moves the
      // target 251 px and anchoring moves the page 215 px at once; a plain check and the 3 px
      // change's check both see the move before the observer reports the reflow.
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      vi.advanceTimersByTime(1);
      layoutChanged(3);
      moveTo(1251);
      scrollPosition = 1215;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      runFrames();
      expect(realigns()).toEqual([]);
      layoutChanged(433);
      runFrames();
      expect(realigns()).toEqual([[{ top: 1251, behavior: 'instant' }]]);
      runFrames();
      quiet();
      expect(stillAligning(moveTo, 1300)).toBe(true);
    });

    it('keeps a visitor scroll that a reflow moved the content against, through a second reflow', () => {
      // Seen on Journey (slow frames): a plain check sees the visitor's +80 px, a 246 px
      // reflow moves the content 141 px up before two frames pass, then a 152 px reflow moves
      // it back down (net +11 px, the same way as the visitor's scroll).
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      vi.advanceTimersByTime(1);
      scrollPosition = 1080;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      moveTo(859);
      layoutChanged(246);
      runFrames();
      moveTo(1011);
      layoutChanged(152);
      runFrames();
      runFrames();
      expect(realigns()).toEqual([]);
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });

    it('takes anchoring larger than the height change for layout (Terminal #contact in CI)', () => {
      // The page got 88 px shorter, the target moved 88 px up, and anchoring moved the page
      // 138 px up (content above the anchor shrank more than the page did).
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      vi.advanceTimersByTime(1);
      moveTo(912);
      scrollPosition = 862;
      layoutChanged(88);
      scrollTo(862);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      runFrames();
      expect(realigns()).toEqual([[{ top: 912, behavior: 'instant' }]]);
      runFrames();
      quiet();
      expect(stillAligning(moveTo, 950)).toBe(true);
    });

    it('takes a move after the report for a scroll, even if the net move looks like anchoring', () => {
      // Terminal in WebKit CI: a font reflow moves the target 114 px up and anchoring the page
      // 87 px up; then the visitor scrolls 80 px down before the layout check runs (net -7 px).
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      vi.advanceTimersByTime(1);
      moveTo(886);
      scrollPosition = 913;
      layoutChanged(139);
      scrollTo(913);
      scrollTo(993);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      runFrames();
      expect(realigns()).toEqual([]);
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1000)).toBe(false);
    });

    it('judges a reflow as reported even when a later change is already applied', () => {
      // Terminal in WebKit CI: a font reflow (target -114 px, anchoring -87 px) is reported,
      // then more content is added above (+176 px) before the first layout check runs.
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      vi.advanceTimersByTime(1);
      moveTo(886);
      scrollPosition = 913;
      layoutChanged(139);
      scrollTo(913);
      moveTo(1062);
      runFrames();
      expect(realigns()).toEqual([[{ top: 1062, behavior: 'instant' }]]);
      layoutChanged(264);
      runFrames();
      quiet();
      expect(stillAligning(moveTo, 1100)).toBe(true);
    });

    it('keeps aligning when a reflow that moved only the content is followed by an anchored one', () => {
      // The first reflow moves the content but not the page (no anchoring: the page didn't move
      // up to its report). A second reflow's anchoring lands after that report but before its
      // check, and is reported later: it must still be taken for that second reflow's anchoring.
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      moveTo(1040);
      layoutChanged(40);
      moveTo(1100);
      scrollPosition = 1060;
      scrollTo(1060);
      runFrames();
      layoutChanged(60);
      runFrames();
      runFrames();
      quiet();
      expect(stillAligning(moveTo, 1150)).toBe(true);
    });

    it('accepts the false positive: a reflow right after a no-input scroll realigns', () => {
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      scrollTo(1080);
      moveTo(1030);
      layoutChanged();
      runFrames();
      expect(realigns()).toEqual([[{ top: 1030, behavior: 'instant' }]]);
    });

    it.each([
      ['near (find in page, just below the fold)', 80],
      ['far (a scrollbar drag, or a late scroll restore)', -1500],
    ])('leaves any other scroll alone, %s, and keeps the focus', (_name, by) => {
      const { target, heading, moveTo } = story('/#now-title', 340);
      const removed = vi.spyOn(window, 'removeEventListener');
      stop = settleDeepLink(target, heading, true);
      scrollTo(1000 + by);
      quiet();
      expect(realigns()).toEqual([]);
      expect(removed).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(stillAligning(moveTo, 1050)).toBe(false);
      heading.blur();
      vi.advanceTimersByTime(1);
      expect(heading).toHaveFocus();
    });

    it('waits when a check runs before the scroll event, then respects the scroll', () => {
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      scrollPosition = 700;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      expect(realigns()).toEqual([]);
      quiet();
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });

    it('catches up after waiting when the page came back by itself', () => {
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      scrollTo(1080);
      moveTo(1030);
      scrollPosition = 1000;
      quiet();
      expect(realigns()).toEqual([[{ top: 1030, behavior: 'instant' }]]);
    });

    it.each([
      ['more than the target moved (a scroll on top of a reflow)', 1200, 1280],
      ['against the target', 1200, 950],
    ])('without a layout check, does not take a page move %s for layout', (_name, top, pageY) => {
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      moveTo(top);
      scrollTo(pageY);
      quiet();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, top + 50)).toBe(false);
    });

    it('ignores scrolls while a layout check is pending (scroll anchoring)', () => {
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      // Content above grew by 400 px and the browser's scroll anchoring followed it.
      moveTo(1400);
      scrollPosition = 1400;
      layoutChanged();
      scrollTo(1400);
      expect(frames).toHaveLength(1);
      runFrames();
      quiet();
      expect(realigns()).toEqual([]);
      // Still aligning afterwards: the anchored position became the confirmed one.
      expect(stillAligning(moveTo, 1450)).toBe(true);
      expect(realigns()).toEqual([[{ top: 1450, behavior: 'instant' }]]);
    });

    it('still follows a reflow above the target when the page itself did not move', () => {
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      expect(stillAligning(moveTo, 1600)).toBe(true);
      expect(realigns()).toEqual([[{ top: 1600, behavior: 'instant' }]]);
    });

    it("ignores scrolls when it isn't aligning", () => {
      const { target, heading } = story('/#now-title', 340);
      stop = settleDeepLink(target, heading, false);
      scrollTo(1340);
      quiet();
      expect(realigns()).toEqual([]);
    });

    it('cancels a pending decision when it stops', () => {
      const { target, heading } = story('/#now-title', 340);
      stop = settleDeepLink(target, heading, true);
      scrollTo(1340);
      stop();
      quiet();
      expect(realigns()).toEqual([]);
    });

    it('cancels a decision waiting for its frames when it stops', () => {
      const { target, heading } = story('/#now-title', 340);
      stop = settleDeepLink(target, heading, true);
      // Let the start-up check run first, so only the scroll's own decision is left.
      vi.advanceTimersByTime(1);
      scrollTo(1340);
      vi.advanceTimersByTime(SETTLE_SCROLL_QUIET_MS);
      expect(frames).toHaveLength(1);
      stop();
      expect(cancelFrame).toHaveBeenCalledWith(1);
      runFrames();
      runFrames();
      expect(realigns()).toEqual([]);
    });

    it('decides only after the frames that let a reflow report itself', () => {
      const { target, heading } = story('/#now-title', 340);
      stop = settleDeepLink(target, heading, true);
      // Let the start-up check run first, so only the scroll's own decision is left.
      vi.advanceTimersByTime(1);
      scrollTo(1340);
      vi.advanceTimersByTime(SETTLE_SCROLL_QUIET_MS);
      expect(realigns()).toEqual([]);
      runFrames();
      expect(realigns()).toEqual([]);
      runFrames();
      expect(realigns()).toEqual([[{ top: 1000, behavior: 'instant' }]]);
    });

    it('on slow frames, waits for a pending layout check before deciding (the Journey race)', () => {
      // A reflow: its scroll anchoring moves the page a little (scroll event first), the quiet
      // time passes during long frames, and only then does the observer report the height
      // change and schedule its check.
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      // Let the start-up check run first.
      vi.advanceTimersByTime(1);
      moveTo(1440);
      scrollTo(1004);
      vi.advanceTimersByTime(SETTLE_SCROLL_QUIET_MS);
      runFrames();
      layoutChanged(443);
      // The decision's frame and the layout check's frame are due together; the decision
      // comes first and must wait for the check.
      runFrames();
      expect(realigns()).toEqual([[{ top: 1440, behavior: 'instant' }]]);
      expect(stillAligning(moveTo, 1480)).toBe(true);
    });

    it('on slow frames, still respects a visitor scroll once the layout check has run', () => {
      const layoutChanged = observeLayout();
      const { target, heading, moveTo } = story();
      stop = settleDeepLink(target, heading, true);
      moveTo(1010);
      scrollTo(1300);
      vi.advanceTimersByTime(SETTLE_SCROLL_QUIET_MS);
      runFrames();
      layoutChanged(10);
      runFrames();
      expect(realigns()).toEqual([]);
      expect(stillAligning(moveTo, 1100)).toBe(false);
    });
  });
});

describe('insideStickyOrFixed', () => {
  it('finds a sticky or fixed container, and nothing in normal flow', () => {
    mount(`
      <div class="stage"><nav id="world-map" data-jump-target><h2>Map</h2></nav></div>
      <section id="now" data-chapter="now"><h2>Now</h2></section>`);
    const stage = document.querySelector('.stage') as HTMLElement;
    stage.style.position = 'sticky';
    expect(insideStickyOrFixed(document.getElementById('world-map') as HTMLElement)).toBe(true);
    stage.style.position = 'fixed';
    expect(insideStickyOrFixed(document.getElementById('world-map') as HTMLElement)).toBe(true);
    expect(insideStickyOrFixed(document.getElementById('now') as HTMLElement)).toBe(false);
  });
});

describe('installDeepLink', () => {
  let stop: () => void = () => undefined;
  afterEach(() => {
    stop();
  });

  it('does nothing without a hash or outside a jump target', () => {
    mount('<main id="main" tabindex="-1"></main>');
    stop = installDeepLink();
    expect(scrollIntoView).not.toHaveBeenCalled();
    window.history.replaceState(null, '', '/#main');
    stop = installDeepLink();
    expect(document.getElementById('main')).toHaveFocus();
  });

  /** A chapter laid out at 1000 px, with the URL pointing at it. */
  function chapter(
    html = '<section id="now" data-chapter="now"><h2 tabindex="-1">Now</h2></section>',
  ) {
    mount(html);
    window.history.replaceState(null, '', '/#now');
    const target = document.getElementById('now') as HTMLElement;
    let top = 1000;
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(
      () => ({ top: top - scrollPosition }) as DOMRect,
    );
    return (value: number) => {
      top = value;
    };
  }
  const realigned = () =>
    windowScrollTo.mock.calls.filter(([options]) => typeof options === 'object').slice(1);

  it('on a page that starts scrolled elsewhere, leaves later layout changes alone', () => {
    const moveTo = chapter();
    scrollPosition = 500;
    stop = installDeepLink();
    expect(screen.getByRole('heading', { name: 'Now' })).toHaveFocus();
    moveTo(1100);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(windowScrollTo.mock.calls.filter(([options]) => typeof options === 'object')).toEqual(
      [],
    );
  });

  it('keeps aligning when the page is already at the landing (StrictMode second run)', () => {
    const moveTo = chapter();
    scrollPosition = 1000;
    stop = installDeepLink();
    moveTo(1040);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(windowScrollTo).toHaveBeenCalledWith({ top: 1040, behavior: 'instant' });
  });

  it('jumps to a target in a sticky container but never realigns it', () => {
    const moveTo = chapter(
      '<div class="stage"><section id="now" data-chapter="now"><h2 tabindex="-1">Now</h2></section></div>',
    );
    (document.querySelector('.stage') as HTMLElement).style.position = 'sticky';
    stop = installDeepLink();
    expect(windowScrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'instant' });
    moveTo(1100);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(realigned()).toEqual([]);
  });

  it('jumps, focuses and keeps the focus while the page settles', async () => {
    mount('<section id="now" data-chapter="now"><h2 tabindex="-1">Now</h2></section>');
    window.history.replaceState(null, '', '/#now');
    stop = installDeepLink();
    const heading = screen.getByRole('heading', { name: 'Now' });
    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    expect(heading).toHaveFocus();
    heading.blur();
    await act(nextTask);
    expect(heading).toHaveFocus();
  });
});
