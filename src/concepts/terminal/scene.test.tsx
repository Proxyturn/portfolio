import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { renderWithLang } from '../../test/render';
import { setReducedMotion } from '../../test/setup';
import {
  createBlinker,
  fillDeployBar,
  pinNowWindow,
  refreshScene,
  revealLines,
  runScene,
} from './scene';
import { TerminalStory } from './TerminalStory';
import { restoreRects, stubRects } from './testLayout';

/** Runs a scene inside a context, as useScrollScene does, and returns its revert. */
function inContext(run: () => void) {
  const ctx = gsap.context(run);
  return () => {
    ctx.revert();
  };
}

interface Layout {
  /** Top of every output line. */
  readonly line?: number;
  /** Top of the "Now" section. */
  readonly now?: number;
  /** Height of the "Now" stage. */
  readonly stage?: number;
}

/** jsdom has no layout: place lines, the "Now" section and its stage. */
function layout({ line = 5000, now = 4000, stage = 300 }: Layout) {
  stubRects((el) => {
    if (el.id === 'now') return { top: now };
    if (el.hasAttribute('data-now-stage')) return { top: now, height: stage };
    if (el.classList.contains('term-line') || el.classList.contains('term-deploy__track')) {
      return { top: line };
    }
    return { top: 0 };
  });
}

function story(): HTMLElement {
  const { container } = renderWithLang(<TerminalStory />);
  return container.firstElementChild as HTMLElement;
}

const pinsOf = (el: Element | null) => ScrollTrigger.getAll().filter((st) => st.pin === el);

// GSAP reads computed styles for every line it hides, which jsdom computes slowly (the story has
// about a hundred lines). Real browsers take milliseconds; give jsdom room under coverage.
describe('Terminal scroll scenes', { timeout: 20_000 }, () => {
  beforeEach(() => {
    // The story itself stays static; the tests drive the scenes directly.
    setReducedMotion(true);
  });
  afterEach(() => {
    restoreRects();
  });

  it('hides lines below the fold until their trigger, a whole line at a time', () => {
    layout({ line: window.innerHeight * 2 });
    const root = story();
    const line = root.querySelector<HTMLElement>('#job-novus .term-line');
    const revert = inContext(() => {
      revealLines(root);
    });
    expect(line?.style.opacity).toBe('0');
    expect(line?.style.transform).toContain('translate');
    // The boot screen is never touched: it plays as a CSS animation on first paint.
    for (const boot of root.querySelectorAll<HTMLElement>('#hook .term-line')) {
      expect(boot.style.opacity).toBe('');
    }
    revert();
    expect(line?.style.opacity).toBe('');
    expect(line?.style.transform).toBe('');
  });

  it('never hides a line that is already on screen or above it when the scene loads', () => {
    // Even below the reveal line (90%), a line that is on screen stays as it is.
    layout({ line: window.innerHeight - 1 });
    const root = story();
    const revert = inContext(() => {
      revealLines(root);
    });
    for (const line of root.querySelectorAll<HTMLElement>('.term-line')) {
      expect(line.style.opacity).toBe('');
      expect(line.style.transform).toBe('');
    }
    revert();
  });

  it('leaves the lines of an excluded (pinned) stage to the pin', () => {
    layout({});
    const root = story();
    const stage = root.querySelector<HTMLElement>('[data-now-stage]');
    const revert = inContext(() => {
      revealLines(root, stage);
    });
    for (const line of stage?.querySelectorAll<HTMLElement>('.term-line') ?? []) {
      expect(line.style.opacity).toBe('');
    }
    revert();
  });

  it('pins the "Now" stage where the chapter nav lands and scrubs its log lines', () => {
    layout({});
    const root = story();
    const section = root.querySelector<HTMLElement>('#now');
    const stage = section?.querySelector<HTMLElement>('[data-now-stage]') ?? null;
    let pinned: HTMLElement | null = null;
    const revert = inContext(() => {
      pinned = pinNowWindow(root);
    });
    expect(pinned).toBe(stage);
    const [trigger] = pinsOf(stage);
    expect(trigger?.trigger).toBe(section);
    // jsdom has no scroll-margin, so the pin starts when the section reaches the very top.
    expect(trigger?.vars.start).toBe('top top+=0');
    // Only the log lines are scrubbed; the title, period and command stay visible.
    for (const line of stage?.querySelectorAll<HTMLElement>('.term-line') ?? []) {
      const scrubbed = line.hasAttribute('data-scrub');
      expect(line.style.opacity, line.textContent).toBe(scrubbed ? '0' : '');
    }
    revert();
    expect(pinsOf(stage)).toHaveLength(0);
    for (const line of stage?.querySelectorAll<HTMLElement>('.term-line') ?? []) {
      expect(line.style.opacity).toBe('');
    }
  });

  it('does not pin when the section is already on screen, or when the stage is too tall', () => {
    for (const case_ of [
      { now: 10, stage: 300 },
      { now: 4000, stage: window.innerHeight + 1 },
    ]) {
      restoreRects();
      layout(case_);
      const root = story();
      let pinned: HTMLElement | null = root;
      const revert = inContext(() => {
        pinned = pinNowWindow(root);
      });
      expect(pinned).toBeNull();
      expect(root.querySelector('[data-scrub]')).not.toHaveStyle({ opacity: '0' });
      revert();
    }
  });

  it('runs every scene, with or without the pin', () => {
    layout({});
    const root = story();
    const stage = root.querySelector('[data-now-stage]');
    const title = root.querySelector<HTMLElement>('.term-now__title .term-line');
    const revertPinned = inContext(() => {
      runScene(root, { pinNow: true });
    });
    expect(pinsOf(stage)).toHaveLength(1);
    expect(title?.style.opacity).toBe('');
    revertPinned();

    const revertScrolling = inContext(() => {
      runScene(root, { pinNow: false });
      refreshScene();
    });
    expect(pinsOf(stage)).toHaveLength(0);
    // Without the pin, the "Now" lines reveal like every other line.
    expect(title?.style.opacity).toBe('0');
    revertScrolling();
  });

  it('fills the deploy bar with scaleX only, scrubbed by the scroll', () => {
    layout({});
    const root = story();
    const fill = root.querySelector<HTMLElement>('.term-deploy__fill');
    const revert = inContext(() => {
      fillDeployBar(root);
    });
    expect(gsap.getProperty(fill, 'scaleX')).toBe(0);
    expect(gsap.getProperty(fill, 'scaleY')).toBe(1);
    expect(fill?.style.transform).not.toBe('');
    expect(fill?.style.opacity).toBe('');
    revert();
    expect(fill?.style.transform).toBe('');
    expect(() => {
      inContext(() => {
        fillDeployBar(document.createElement('div'));
        revealLines(document.createElement('div'));
        expect(pinNowWindow(document.createElement('div'))).toBeNull();
      })();
    }).not.toThrow();
  });

  it('blinks a cursor once, for at most 3 seconds, and leaves it solid', () => {
    const cursor = document.createElement('span');
    const blink = createBlinker();
    const revert = inContext(() => {
      blink(cursor);
    });
    const [tween] = gsap.getTweensOf(cursor);
    expect(tween?.paused()).toBe(false);
    expect(tween?.totalDuration()).toBeLessThanOrEqual(3);
    tween?.totalProgress(1);
    expect(cursor.style.opacity).toBe('1');
    // A second reveal in the same window does not start it again.
    blink(cursor);
    expect(tween?.totalProgress()).toBe(1);
    expect(gsap.getTweensOf(cursor)).toHaveLength(0);
    expect(cursor.style.opacity).toBe('1');
    blink(null);
    revert();
    expect(cursor.style.opacity).toBe('');
  });
});
