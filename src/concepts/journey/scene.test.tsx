import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap } from '../../motion/gsap';
import { buildRoad } from './geometry';
import { Road } from './Road';
import { Terrain } from './Terrain';
import { driveRoad, revealStops } from './scene';
import { render } from '@testing-library/react';

const geometry = buildRoad(
  [
    { id: 'novus', chapter: 'origins', x: 100, y: 100 },
    { id: 'cpfl', chapter: 'energy', x: 300, y: 400 },
    { id: 'semantix', chapter: 'now', x: 100, y: 700 },
    { id: 'topic-0', chapter: 'next', x: 300, y: 900 },
  ],
  400,
  1000,
);

function Fixture() {
  return (
    <div>
      <Terrain />
      <Road geometry={geometry} />
      <article data-stop="">
        <span data-road-point="semantix" data-road-chapter="now" data-here="">
          <span className="journey-pin" />
        </span>
        <div className="journey-card" />
      </article>
      <article data-stop="">
        <span data-road-point="topic-0" data-road-chapter="next" />
        <div className="journey-card" />
      </article>
    </div>
  );
}

/** Runs a scene inside a matchMedia-like context, as useScrollScene does, and reverts it. */
function inContext(run: () => void) {
  const ctx = gsap.context(run);
  return () => {
    ctx.revert();
  };
}

/** Puts every stop at `top` px from the top of the viewport (jsdom has no layout). */
function placeStops(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return { top: this.hasAttribute('data-stop') ? top : 0 } as DOMRect;
  });
}

describe('Journey scroll scenes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides pins and cards below the fold until their trigger, then reverts cleanly', () => {
    placeStops(window.innerHeight * 2);
    const { container } = render(<Fixture />);
    const root = container.firstElementChild as HTMLElement;
    const card = root.querySelector<HTMLElement>('.journey-card');
    const pin = root.querySelector<HTMLElement>('.journey-pin');
    const revert = inContext(() => {
      revealStops(root);
    });
    expect(card?.style.opacity).toBe('0');
    expect(pin?.style.opacity).toBe('0');
    expect(card?.style.transform).toContain('scale');
    expect(pin?.style.transform).toContain('translate');
    revert();
    expect(card?.style.opacity).toBe('');
    expect(pin?.style.transform).toBe('');
  });

  it('drifts the two contour layers by transform, wrapping within one pattern tile', () => {
    const { container } = render(<Fixture />);
    const root = container.firstElementChild as HTMLElement;
    const layers = [...root.querySelectorAll<SVGElement>('.journey-terrain__layer')];
    expect(layers).toHaveLength(2);
    const revert = inContext(() => {
      revealStops(root);
    });
    for (const layer of layers) {
      const y = Number(gsap.getProperty(layer, 'y'));
      expect(y).toBeLessThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(-Number(layer.dataset.tile));
      expect((layer.getAttribute('transform') ?? '') + layer.style.transform).not.toBe('');
    }
    revert();
    for (const layer of layers) {
      expect(layer.style.transform).toBe('');
      expect(layer.getAttribute('transform')).toBeNull();
    }
  });

  it('never hides a stop that is already on screen or scrolled past when the scene loads', () => {
    placeStops(10);
    const { container } = render(<Fixture />);
    const root = container.firstElementChild as HTMLElement;
    const revert = inContext(() => {
      revealStops(root);
    });
    for (const el of root.querySelectorAll<HTMLElement>('.journey-card, .journey-pin')) {
      expect(el.style.opacity).toBe('');
      expect(el.style.transform).toBe('');
    }
    revert();
  });

  it('masks the road with a scaled rectangle, drives the traveler and crossfades the road ahead', () => {
    const { container } = render(<Fixture />);
    const root = container.firstElementChild as HTMLElement;
    const reveal = root.querySelector('.journey-road__reveal');
    const traveler = root.querySelector('.journey-traveler');
    const day = root.querySelector<SVGElement>('.journey-road__ahead--day');
    const horizon = root.querySelector<SVGElement>('.journey-road__ahead--horizon');
    const restTraveler = traveler?.getAttribute('transform');

    const revert = inContext(() => {
      driveRoad(root, geometry);
    });
    // jsdom has no scroll layout, so only check that each piece is driven, not how far.
    // The mask rectangle is scaled with a transform on Y only; its size never changes.
    const scaleY = Number(gsap.getProperty(reveal, 'scaleY'));
    expect(scaleY).toBeGreaterThanOrEqual(0);
    expect(scaleY).toBeLessThanOrEqual(1);
    expect(gsap.getProperty(reveal as Element, 'scaleX')).toBe(1);
    expect(
      (reveal?.getAttribute('transform') ?? '') + (reveal as SVGElement).style.transform,
    ).not.toBe('');
    expect(reveal?.getAttribute('height')).toBe(String(geometry.height));
    // The traveler is moved by MotionPath: x/y become raw coordinates on the route. (Browsers
    // write SVG transforms to the attribute; jsdom, which lacks SVG geometry, to the style.)
    const x = Number(gsap.getProperty(traveler, 'x'));
    const y = Number(gsap.getProperty(traveler, 'y'));
    expect(x).toBeGreaterThanOrEqual(100);
    expect(x).toBeLessThanOrEqual(300);
    expect(y).toBeGreaterThanOrEqual(100);
    expect(y).toBeLessThanOrEqual(700);
    expect(
      traveler?.getAttribute('transform') !== restTraveler ||
        (traveler as SVGElement).style.transform !== '',
    ).toBe(true);
    // The two stacked road layers crossfade through opacity only.
    expect(day?.style.opacity).not.toBe('');
    expect(horizon?.style.opacity).not.toBe('');
    expect(Number(day?.style.opacity) + Number(horizon?.style.opacity)).toBeCloseTo(1);
    revert();
    expect(reveal?.getAttribute('transform')).toBeNull();
    expect((reveal as SVGElement).style.transform).toBe('');
    expect(traveler?.getAttribute('transform')).toBe(restTraveler);
    expect((traveler as SVGElement).style.transform).toBe('');
    expect(day?.style.opacity).toBe('');
    expect(horizon?.style.opacity).toBe('');
  });

  it('does nothing without a measured road', () => {
    const { container } = render(<Road geometry={null} />);
    expect(() => {
      inContext(() => {
        driveRoad(container, { ...geometry, height: 0 });
        driveRoad(document.createElement('div'), geometry);
        revealStops(document.createElement('div'));
      })();
    }).not.toThrow();
  });
});
