import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cv } from '../../content/cv';
import { en } from '../../i18n/en';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { renderWithLang } from '../../test/render';
import { setReducedMotion } from '../../test/setup';
import { SPLIT_QUERY, STRIP_QUERY, WIDE_OVERVIEW_QUERY } from './useMediaQuery';
import { WorldsStory } from './WorldsStory';

/** Makes the given layout queries match (jsdom's matchMedia matches nothing else). */
function layout(...queries: string[]) {
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
    if (!queries.includes(query)) return original(query);
    return {
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList;
  });
}

const arrangement = () =>
  document.querySelector('#world-map svg')?.getAttribute('data-arrangement');

describe('WorldsStory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('tells every beat in order, with the district name and real entries', () => {
    const { container } = renderWithLang(<WorldsStory />);
    expect([...container.querySelectorAll('[data-chapter]')].map((s) => s.id)).toEqual(
      cv.chapters.map((c) => c.id),
    );
    for (const job of cv.jobs) {
      const entry = container.querySelector(`#job-${job.id}`);
      expect(entry, job.id).toHaveAttribute('data-job', job.id);
      expect(entry?.querySelector('h3')).toHaveAttribute('tabindex', '-1');
    }
    expect(container.querySelector('#edu-computer-science h3')).toHaveAttribute('tabindex', '-1');
    expect(
      within(container.querySelector('#energy') as HTMLElement).getByText(
        en.worlds.districts.energy,
      ),
    ).toBeInTheDocument();
    // The ATOS Jan–Jun 2023 entry keeps its own neutral "Between worlds" panel.
    const between = container.querySelector('#job-atos-frontend');
    expect(between).toHaveClass('worlds-card--own', 'wd-between');
    expect(between?.querySelector('.worlds-card__eyebrow')).toHaveTextContent(
      en.worlds.districts.betweenWorlds,
    );
    for (const section of container.querySelectorAll('[data-chapter]')) {
      expect(section.firstElementChild, section.id).toHaveClass('chapter__eyebrow');
    }
    expect(container.querySelector('#hook .chapter__eyebrow')).toHaveTextContent(en.worlds.title);
    expect(container.querySelectorAll('.worlds-back')).toHaveLength(8);
    // A vignette opens every chapter but the hook (shown in the overview layout only).
    expect(container.querySelectorAll('[data-chapter] .worlds-vignette')).toHaveLength(8);
    expect(container.querySelector('#hook .worlds-vignette')).toBeNull();
  });

  it('puts the name before the map, and the map before the chapters, in reading order', () => {
    const { container } = renderWithLang(<WorldsStory />);
    const h1 = screen.getByRole('heading', { level: 1 });
    const nav = screen.getByRole('navigation', { name: en.worlds.worldMap });
    const origins = container.querySelector('#origins') as Element;
    expect(h1.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nav.compareDocumentPosition(origins) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the AI frontier topics as four signs marked "In progress"', () => {
    renderWithLang(<WorldsStory />);
    const signs = document.querySelectorAll('#next .worlds-signs__sign');
    expect(signs).toHaveLength(4);
    for (const sign of signs) {
      expect(sign.querySelector('.worlds-signs__badge')).toHaveTextContent(en.story.inProgress);
    }
  });

  it('picks the arrangement for each layout gate', () => {
    setReducedMotion(true);
    const cases: [string[], string][] = [
      [[], 'portrait'],
      [[WIDE_OVERVIEW_QUERY], 'wide'],
      [[STRIP_QUERY], 'wide'],
      [[SPLIT_QUERY, WIDE_OVERVIEW_QUERY], 'square'],
    ];
    for (const [queries, expected] of cases) {
      vi.restoreAllMocks();
      layout(...queries);
      const { unmount } = renderWithLang(<WorldsStory />);
      expect(arrangement(), queries.join()).toBe(expected);
      const nav = screen.getByRole('navigation', { name: en.worlds.worldMap });
      expect(nav).toHaveAttribute('id', 'world-map');
      expect(within(nav).getAllByRole('link')).toHaveLength(12);
      unmount();
    }
  });

  it('fits each chip to the measured label', () => {
    setReducedMotion(true);
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value: () => ({ x: 0, y: 0, width: 123, height: 20 }),
    });
    try {
      renderWithLang(<WorldsStory />);
      for (const chip of document.querySelectorAll('#world-map .worlds-chip')) {
        if (chip.closest('[data-building]')) expect(chip).toHaveAttribute('width', '143');
      }
    } finally {
      delete (SVGElement.prototype as { getBBox?: unknown }).getBBox;
    }
  });

  it('puts a halo on the buildings whose job used the chosen skill', async () => {
    setReducedMotion(true);
    const user = userEvent.setup();
    renderWithLang(<WorldsStory />);
    const halos = () =>
      [...document.querySelectorAll<SVGGElement>('#world-map [data-halo]')].map(
        (g) => g.dataset.building,
      );
    expect(halos()).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Xamarin' }));
    expect(halos()).toEqual(['plant']);
    await user.click(screen.getByRole('button', { name: 'Xamarin' }));
    expect(halos()).toEqual([]);
  });

  it('loads the details layer: decor, the "You are here" pin and four signs', async () => {
    setReducedMotion(true);
    renderWithLang(<WorldsStory />);
    await waitFor(() => {
      expect(document.querySelector('#world-map [data-pin]')).not.toBeNull();
    });
    expect(document.querySelector('#world-map [data-pin]')).toHaveTextContent(en.worlds.youAreHere);
    expect(document.querySelectorAll('#world-map [data-signs] > g')).toHaveLength(4);
    expect(document.querySelector('#world-map .worlds-details')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('loads the scene in the sticky layout and shows the whole world only while the map has keyboard focus', async () => {
    layout(SPLIT_QUERY);
    // jsdom has no layout: chapters 1000 px apart, a 768 × 661 stage, scrolled into "energy".
    const ids = cv.chapters.map((c) => c.id);
    const scrolled = ids.indexOf('energy') * 1000;
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(scrolled);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(720);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(768);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(661);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const i = ids.indexOf(this.dataset.chapter as (typeof ids)[number]);
      return { top: (i < 0 ? 0 : i * 1000) - scrolled } as DOMRect;
    });
    renderWithLang(<WorldsStory />);
    const camera = document.querySelector<HTMLElement>('[data-camera]');
    if (!camera) throw new Error('No camera');
    await waitFor(() => {
      expect(camera.style.transform).not.toBe('');
    });
    // A refresh applies the camera instantly (quickTo would otherwise ease over 0.35 s).
    const scale = () => {
      ScrollTrigger.refresh();
      return Number(gsap.getProperty(camera, 'scaleX'));
    };
    const zoomed = scale();
    expect(zoomed).toBeGreaterThan(1);
    expect(zoomed).toBeLessThanOrEqual(2);

    const link = within(screen.getByRole('navigation', { name: en.worlds.worldMap })).getAllByRole(
      'link',
    )[0];
    if (!link) throw new Error('No map link');
    // jsdom never matches :focus-visible; a real keyboard focus does.
    const matches = Object.getOwnPropertyDescriptor(Element.prototype, 'matches')?.value as (
      this: Element,
      selector: string,
    ) => boolean;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ':focus-visible' || matches.call(this, selector);
    });
    act(() => {
      link.focus();
    });
    expect(scale()).toBeCloseTo(1, 5);
    expect(document.querySelector('#world-map svg')?.hasAttribute('data-active')).toBe(false);
    act(() => {
      fireEvent.blur(link, { relatedTarget: document.body });
    });
    expect(scale()).toBeCloseTo(zoomed, 5);
    expect(document.querySelector('#world-map svg')?.getAttribute('data-active')).toBe('energy');
  });
});
