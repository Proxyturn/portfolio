import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { cv } from '../../content/cv';
import { en } from '../../i18n/en';
import { renderWithLang } from '../../test/render';
import { setReducedMotion } from '../../test/setup';
import { STICKY_QUERY } from './useMediaQuery';
import { WorldsStory } from './WorldsStory';

/** Makes the sticky-layout media query match (jsdom's matchMedia matches nothing else). */
function stickyLayout() {
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
    if (query !== STICKY_QUERY) return original(query);
    return {
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList;
  });
}

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
    expect(container.querySelectorAll('.worlds-back')).toHaveLength(8);
  });

  it('renders the overview map (portrait) by default, and the landscape map when sticky', () => {
    setReducedMotion(true);
    const { unmount } = renderWithLang(<WorldsStory />);
    const nav = screen.getByRole('navigation', { name: en.worlds.worldMap });
    expect(nav).toHaveAttribute('id', 'world-map');
    expect(within(nav).getAllByRole('link')).toHaveLength(12);
    expect(nav.querySelector('svg')).toHaveAttribute('data-arrangement', 'portrait');
    unmount();
    stickyLayout();
    renderWithLang(<WorldsStory />);
    expect(document.querySelector('#world-map svg')).toHaveAttribute(
      'data-arrangement',
      'landscape',
    );
  });

  it('fits each chip to the measured label', () => {
    setReducedMotion(true);
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value: () => ({ x: 0, y: 0, width: 123, height: 20 }),
    });
    try {
      renderWithLang(<WorldsStory />);
      for (const chip of document.querySelectorAll('.worlds-chip')) {
        expect(chip).toHaveAttribute('width', '143');
      }
    } finally {
      delete (SVGElement.prototype as { getBBox?: unknown }).getBBox;
    }
  });

  it('loads the camera in the sticky layout and zooms out while the map has keyboard focus', async () => {
    stickyLayout();
    renderWithLang(<WorldsStory />);
    const camera = document.querySelector<HTMLElement>('[data-camera]');
    await waitFor(() => {
      expect(camera?.style.transform).not.toBe('');
    });
    const link = within(screen.getByRole('navigation', { name: en.worlds.worldMap })).getAllByRole(
      'link',
    )[0];
    if (!link) throw new Error('No map link');
    act(() => {
      link.focus();
    });
    act(() => {
      fireEvent.blur(link, { relatedTarget: document.body });
    });
    expect(camera?.style.transform).not.toBe('');
  });

  it('lands on the deep link again once the web fonts are in, unless the visitor took over', async () => {
    setReducedMotion(true);
    window.history.replaceState(null, '', '/#now');
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    let ready: () => void = () => undefined;
    const fonts = () => {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: { ready: new Promise<void>((resolve) => (ready = resolve)) },
      });
    };
    const fontsIn = () =>
      act(async () => {
        ready();
        await Promise.resolve();
      });
    try {
      // The shared load jump ran (and focused the heading): land again after the swap.
      fonts();
      let view = renderWithLang(<App />);
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      await fontsIn();
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'instant' });
      view.unmount();

      // A visitor's input in the meantime cancels it.
      scrollIntoView.mockClear();
      fonts();
      view = renderWithLang(<App />);
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      await fontsIn();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      view.unmount();

      // The browser restored a scroll position (the load jump stepped aside): leave it.
      scrollIntoView.mockClear();
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(500);
      fonts();
      renderWithLang(<App />);
      await fontsIn();
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      delete (document as { fonts?: unknown }).fonts;
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });
});
