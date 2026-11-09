import { describe, expect, it } from 'vitest';
import { buildRoad, pointOnCubic, progressAtY, type RoadPoint } from './geometry';

const L = 100;
const R = 300;

/** A desktop-like layout: pins alternate lanes, the Breadth pair sits side by side. */
const zigzag: RoadPoint[] = [
  { id: 'novus', chapter: 'origins', x: L, y: 100 },
  { id: 'bradesco', chapter: 'enterprise', x: R, y: 400 },
  { id: 'frontend', chapter: 'enterprise', x: L, y: 700 },
  { id: 'cpfl', chapter: 'energy', x: R, y: 1000 },
  { id: 'cemig', chapter: 'energy', x: L, y: 1300 },
  { id: 'sodexo', chapter: 'breadth', x: L, y: 1600, fork: 'a' },
  { id: 'alphaville', chapter: 'breadth', x: R, y: 1605, fork: 'b' },
  { id: 'semantix', chapter: 'now', x: R, y: 2000 },
  { id: 'topic-0', chapter: 'next', x: L, y: 2200 },
  { id: 'ai', chapter: 'next', x: 200, y: 2400 },
];

/** A mobile-like layout: every pin on the same x, stacked. */
const straight: RoadPoint[] = zigzag.map((p, i) => ({ ...p, x: 40, y: 100 + i * 300 }));

describe('buildRoad', () => {
  it('draws one path per chapter up to "You are here", through every pin', () => {
    const road = buildRoad(zigzag, 400, 2600);
    expect(road.segments.map((s) => s.chapter)).toEqual(['enterprise', 'energy', 'breadth', 'now']);
    expect(road.route.startsWith('M100 100 C')).toBe(true);
    for (const id of ['bradesco', 'frontend', 'cpfl', 'cemig', 'sodexo', 'semantix']) {
      const p = zigzag.find((point) => point.id === id);
      expect(road.route, id).toContain(`${p?.x} ${p?.y}`);
    }
    expect(road.here).toEqual({ x: R, y: 2000 });
    expect(road.width).toBe(400);
    expect(road.height).toBe(2600);
  });

  it('puts the side-by-side Breadth pair on two branches that split and rejoin', () => {
    const road = buildRoad(zigzag, 400, 2600);
    // Split halfway between CEMIG and the pair, rejoin halfway to SEMANTIX, mid-lane.
    expect(road.route).toContain('200 1450');
    expect(road.route).not.toContain('300 1605');
    expect(road.fork).toMatch(/^M200 1450 C.* 300 1605 C.* 200 1802\.5$/);
  });

  it('keeps a stacked pair on the straight road and bulges the side road', () => {
    const road = buildRoad(straight, 400, 3200);
    const xs = [...road.route.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) =>
      Number(m[1]),
    );
    expect(new Set(xs)).toEqual(new Set([40]));
    expect(road.fork).toContain('54 ');
  });

  it('draws the road ahead from "You are here" to the destination', () => {
    const road = buildRoad(zigzag, 400, 2600);
    expect(road.ahead).toMatch(/^M300 2000 C.* 100 2200 C.* 200 2400$/);
  });

  it('places power-line poles along the Energy stretch', () => {
    const desktop = buildRoad(zigzag, 400, 2600);
    expect(desktop.poles.length).toBeGreaterThanOrEqual(2);
    expect(desktop.poles[0]).toEqual({ x: 200, y: 700 });
    expect(desktop.poles.at(-1)).toEqual({ x: 200, y: 1300 });
    // Straight road: the line runs just beside it.
    expect(buildRoad(straight, 400, 3200).poles[0]?.x).toBe(22);
  });

  it('handles a road without "You are here", fork or energy', () => {
    const road = buildRoad(
      [
        { id: 'a', chapter: 'origins', x: 10, y: 10 },
        { id: 'b', chapter: 'origins', x: 10, y: 50 },
      ],
      100,
      100,
    );
    expect(road.here).toBeNull();
    expect(road.ahead).toBeNull();
    expect(road.fork).toBeNull();
    expect(road.poles).toEqual([]);
    expect(buildRoad([], 0, 0).route).toBe('');
  });

  it('changes its key only when the drawing changes', () => {
    expect(buildRoad(zigzag, 400, 2600).key).toBe(buildRoad(zigzag, 400, 2600).key);
    expect(buildRoad(zigzag, 400, 2600).key).not.toBe(buildRoad(straight, 400, 2600).key);
  });
});

describe('progressAtY', () => {
  const road = buildRoad(zigzag, 400, 2600);

  it('is 0 above the road, 1 below it, and grows down the page', () => {
    expect(progressAtY(road, 0)).toBe(0);
    expect(progressAtY(road, 5000)).toBe(1);
    const a = progressAtY(road, 500);
    const b = progressAtY(road, 1500);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(1);
  });

  it('is 0 for an empty road', () => {
    expect(progressAtY({ samples: [], length: 0 }, 100)).toBe(0);
  });

  it('copes with flat stretches of the table', () => {
    const flat = {
      samples: [
        { y: 0, length: 0 },
        { y: 10, length: 10 },
        { y: 10, length: 20 },
        { y: 20, length: 30 },
      ],
      length: 30,
    };
    expect(progressAtY(flat, 10)).toBeCloseTo(1 / 3);
    expect(progressAtY(flat, 15)).toBeCloseTo(25 / 30);
  });
});

describe('pointOnCubic', () => {
  it('starts and ends at the curve ends', () => {
    const c = {
      chapter: 'origins' as const,
      p0: { x: 0, y: 0 },
      c1: { x: 0, y: 5 },
      c2: { x: 10, y: 5 },
      p1: { x: 10, y: 10 },
    };
    expect(pointOnCubic(c, 0)).toEqual({ x: 0, y: 0 });
    expect(pointOnCubic(c, 1)).toEqual({ x: 10, y: 10 });
    expect(pointOnCubic(c, 0.5)).toEqual({ x: 5, y: 5 });
  });
});
