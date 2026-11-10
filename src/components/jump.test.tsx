import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  landingScrollY,
  SETTLE_LIMIT_MS,
  SETTLE_MAX_REALIGNS,
  settleDeepLink,
  trackHeaderHeight,
} from './jump';
import { useHeaderHeight } from './useJumpNavigation';

/** jsdom has no layout, so scrolling is recorded instead of performed. */
const scrollIntoView = vi.fn();

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
  function story(hash = '/#now') {
    mount(`
      <section id="now" data-chapter="now"><h2 tabindex="-1">Now</h2></section>
      <button type="button">Elsewhere</button>`);
    window.history.replaceState(null, '', hash);
    const target = document.getElementById('now') as HTMLElement;
    let top = 1000;
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(
      () => ({ top: top - scrollPosition }) as DOMRect,
    );
    scrollPosition = 1000;
    const heading = screen.getByRole('heading', { name: 'Now' });
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

  it('realigns when something else moved the page (such as an engine fragment scroll)', () => {
    override(document, 'readyState', 'loading');
    const { target, heading } = story();
    stop = settleDeepLink(target, heading, true);
    scrollPosition = 1120;
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
    const callbacks: (() => void)[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
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
    moveTo(1040);
    callbacks[0]?.();
    callbacks[0]?.();
    expect(frames).toHaveLength(1);
    frames[0]?.(0);
    expect(realigns()).toEqual([[{ top: 1040, behavior: 'instant' }]]);

    // A frame still pending when settling stops is cancelled, and the observer disconnected.
    callbacks[0]?.();
    stop();
    expect(cancel).toHaveBeenCalledWith(2);
    expect(disconnect).toHaveBeenCalledTimes(1);

    // Without aligning (a restored position), layout changes aren't watched at all.
    stop = settleDeepLink(target, heading, false);
    expect(callbacks).toHaveLength(1);
  });

  it(`gives up realigning after ${String(SETTLE_MAX_REALIGNS)} scrolls`, () => {
    const { target, heading } = story();
    stop = settleDeepLink(target, heading, true);
    // The page refuses to stay put (something keeps moving it back).
    windowScrollTo.mockImplementation(() => undefined);
    scrollPosition = 0;
    for (let i = 0; i < SETTLE_MAX_REALIGNS + 5; i++) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    expect(realigns()).toHaveLength(SETTLE_MAX_REALIGNS);
  });

  it(`gives up after ${String(SETTLE_LIMIT_MS)} ms, and the cleanup stops it too`, () => {
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
