import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { AMBIENT_MAX_SECONDS, playAmbient, startScene, type SceneHandle } from './scene';
import { SQUARE } from './world';

const CHAPTERS = ['hook', 'origins', 'energy', 'now', 'toolbox'] as const;
/** Document top of each chapter (jsdom has no layout). */
const TOPS: Record<string, number> = {
  hook: 0,
  origins: 1000,
  energy: 2000,
  now: 3000,
  toolbox: 4000,
};
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgChild(parent: Element, tag: string, attrs: Record<string, string> = {}): Element {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.append(el);
  return el;
}

/** A map with the three ambient pieces, and the chapters. */
function fixture(): { root: HTMLElement; svg: SVGSVGElement } {
  const root = document.createElement('div');
  const stage = document.createElement('div');
  stage.setAttribute('data-camera-stage', '');
  const camera = document.createElement('div');
  camera.setAttribute('data-camera', '');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svgChild(svg, 'g', { 'data-ambient': 'gear' });
  svgChild(svg, 'path', { id: 'worlds-powerline', d: 'M0 0L100 0' });
  svgChild(svg, 'circle', { 'data-ambient': 'pulse', r: '6', opacity: '0' });
  svgChild(svg, 'circle', { 'data-ambient': 'pulse', r: '6', opacity: '0' });
  svgChild(svg, 'path', { 'data-ambient-path': 'truck', d: 'M-150 0L0 0' });
  svgChild(svg, 'g', { 'data-ambient': 'truck' });
  camera.append(svg);
  stage.append(camera);
  root.append(stage);
  for (const id of CHAPTERS) {
    const section = document.createElement('section');
    section.dataset.chapter = id;
    root.append(section);
  }
  document.body.append(root);
  return { root, svg };
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

describe('Worlds scene', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('does nothing without a stage, a camera, a map or chapters', () => {
    expect(startScene(document.createElement('div'), SQUARE, () => false)).toBeNull();
  });

  it('moves the camera with the scroll and marks the district it has arrived at', () => {
    const { root, svg } = fixture();
    const camera = root.querySelector('[data-camera]') as HTMLElement;
    let whole = false;
    layout(0);
    const ctx = gsap.context(() => {
      startScene(root, SQUARE, () => whole);
    });
    expect(scale(camera)).toBeCloseTo(1, 5);
    expect(svg.hasAttribute('data-active')).toBe(false);

    // Settled in the energy chapter: zoomed in (at most 2×), the energy district is active.
    layout(TOPS.energy ?? 0);
    ScrollTrigger.refresh();
    expect(scale(camera)).toBeGreaterThan(1);
    expect(scale(camera)).toBeLessThanOrEqual(2);
    expect(svg.getAttribute('data-active')).toBe('energy');

    // Mid-transition towards "now": the camera moves, the active district stays until it settles.
    layout((TOPS.now ?? 0) - 720 * 0.675);
    ScrollTrigger.refresh();
    expect(svg.getAttribute('data-active')).toBe('energy');

    // Keyboard focus in the map: the whole world, nothing faded.
    whole = true;
    ScrollTrigger.refresh();
    expect(scale(camera)).toBeCloseTo(1, 5);
    expect(svg.hasAttribute('data-active')).toBe(false);

    // The Toolbox chapter shows the whole world too.
    whole = false;
    layout(TOPS.toolbox ?? 0);
    ScrollTrigger.refresh();
    expect(scale(camera)).toBeCloseTo(1, 5);
    expect(svg.hasAttribute('data-active')).toBe(false);
    ctx.revert();
  });

  it('plays each ambient touch once per visit, within the time limit', () => {
    const { root, svg } = fixture();
    layout(TOPS.origins ?? 0);
    let handle: SceneHandle | null = null;
    let whole = false;
    const ctx = gsap.context(() => {
      handle = startScene(root, SQUARE, () => whole);
    });
    const gear = svg.querySelector('[data-ambient="gear"]') as Element;
    const first = gsap.getTweensOf(gear)[0];
    expect(first).toBeDefined();
    // Scrolling within the same district doesn't replay it.
    (handle as unknown as SceneHandle).update();
    expect(gsap.getTweensOf(gear)).toEqual([first]);
    // Keyboard focus in and out of the map: the fade lifts and returns, the visit goes on.
    whole = true;
    ScrollTrigger.refresh();
    expect(svg.hasAttribute('data-active')).toBe(false);
    whole = false;
    ScrollTrigger.refresh();
    expect(svg.getAttribute('data-active')).toBe('industrial');
    expect(gsap.getTweensOf(gear)).toEqual([first]);
    // A new visit (away to a whole-world view and back) plays it again.
    layout(TOPS.toolbox ?? 0);
    ScrollTrigger.refresh();
    layout(TOPS.origins ?? 0);
    ScrollTrigger.refresh();
    expect(gsap.getTweensOf(gear)[0]).not.toBe(first);
    ctx.revert();
    expect(() => {
      (handle as unknown as SceneHandle).update();
    }).not.toThrow();
  });

  it('builds the gear, pulse and truck timelines, all within the limit', () => {
    const { svg } = fixture();
    const ctx = gsap.context(() => {
      for (const ground of ['industrial', 'energy', 'cement'] as const) {
        const tl = playAmbient(svg, ground);
        expect(tl, ground).not.toBeNull();
        expect(tl?.duration(), ground).toBeLessThanOrEqual(AMBIENT_MAX_SECONDS);
      }
      expect(playAmbient(svg, 'banking')).toBeNull();
    });
    ctx.revert();
  });

  it('skips an ambient touch whose pieces are missing', () => {
    const empty = document.createElementNS(SVG_NS, 'svg');
    for (const ground of ['industrial', 'energy', 'cement'] as const) {
      expect(playAmbient(empty, ground)).toBeNull();
    }
  });
});
