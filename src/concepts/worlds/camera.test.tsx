import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { startCamera } from './camera';

const CHAPTERS = ['hook', 'origins', 'energy', 'toolbox'] as const;
/** Document top of each chapter (jsdom has no layout). */
const TOPS: Record<string, number> = { hook: 0, origins: 1000, energy: 2000, toolbox: 3000 };

function fixture(): HTMLElement {
  const root = document.createElement('div');
  const stage = document.createElement('div');
  stage.setAttribute('data-camera-stage', '');
  const camera = document.createElement('div');
  camera.setAttribute('data-camera', '');
  stage.append(camera);
  root.append(stage);
  for (const id of CHAPTERS) {
    const section = document.createElement('section');
    section.dataset.chapter = id;
    root.append(section);
  }
  document.body.append(root);
  return root;
}

function layout(scrollY: number) {
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(scrollY);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(720);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(768);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(661);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const top = (TOPS[this.dataset.chapter ?? ''] ?? 0) - window.scrollY;
    return { top } as DOMRect;
  });
}

const scale = (el: Element) => Number(gsap.getProperty(el, 'scaleX'));

describe('Worlds camera', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('does nothing without a stage, a camera or chapters', () => {
    const empty = document.createElement('div');
    expect(startCamera(empty, () => false)).toBeNull();
  });

  it('shows the whole world at the top, a district further down, and the world on demand', () => {
    const root = fixture();
    const camera = root.querySelector('[data-camera]') as HTMLElement;
    let whole = false;
    layout(0);
    const ctx = gsap.context(() => {
      startCamera(root, () => whole);
    });
    expect(scale(camera)).toBeCloseTo(1, 5);

    // Settled in the energy chapter: zoomed in, at most 2×.
    layout(TOPS.energy ?? 0);
    ScrollTrigger.refresh();
    const zoomed = scale(camera);
    expect(zoomed).toBeGreaterThan(1);
    expect(zoomed).toBeLessThanOrEqual(2);

    // Halfway through the transition from origins to energy: between the two.
    layout((TOPS.energy ?? 0) - 720 * 0.675);
    ScrollTrigger.refresh();
    expect(Number(gsap.getProperty(camera, 'x'))).toBeLessThan(0);

    // Keyboard focus in the map: the whole world.
    whole = true;
    ScrollTrigger.refresh();
    expect(scale(camera)).toBeCloseTo(1, 5);

    // The Toolbox chapter shows the whole world too.
    whole = false;
    layout(TOPS.toolbox ?? 0);
    ScrollTrigger.refresh();
    expect(scale(camera)).toBeCloseTo(1, 5);
    ctx.revert();
  });

  it('animates on update, and a stale handle does nothing after revert', () => {
    const root = fixture();
    layout(TOPS.energy ?? 0);
    let handle: ReturnType<typeof startCamera> = null;
    const ctx = gsap.context(() => {
      handle = startCamera(root, () => false);
    });
    expect(handle).not.toBeNull();
    const camera = root.querySelector('[data-camera]') as HTMLElement;
    const tweens = () => gsap.getTweensOf(camera).length;
    (handle as unknown as { update: () => void }).update();
    expect(tweens()).toBeGreaterThan(0);
    ctx.revert();
    expect(() => {
      (handle as unknown as { update: () => void }).update();
    }).not.toThrow();
  });
});
