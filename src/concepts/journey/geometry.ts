/**
 * Road geometry for the Journey concept. Pure functions: they take the measured positions of
 * the stops (pins) and return SVG path data, so they can be tested without a layout engine.
 *
 * The road always passes through every pin. The layout (CSS) decides the shape: on desktop the
 * pins alternate between two lanes, so the road zigzags; on mobile every pin sits on the same
 * x, so the same code produces a straight line along the left edge.
 */
import type { ChapterId } from '../../content/types';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface RoadPoint extends Point {
  readonly id: string;
  readonly chapter: ChapterId;
  /** The two stops of the Breadth fork: `a` stays on the main road, `b` is the side road. */
  readonly fork?: 'a' | 'b';
}

interface Cubic {
  readonly chapter: ChapterId;
  readonly p0: Point;
  readonly c1: Point;
  readonly c2: Point;
  readonly p1: Point;
}

export interface RoadSample {
  readonly y: number;
  readonly length: number;
}

export interface RoadGeometry {
  readonly width: number;
  readonly height: number;
  /** Traveled road, start → "You are here", one path per chapter (Enterprise is a highway). */
  readonly segments: readonly { readonly chapter: ChapterId; readonly d: string }[];
  /** The whole traveled road as one path: the traveler marker follows it. */
  readonly route: string;
  /** Side road of the Breadth fork, or null. */
  readonly fork: string | null;
  /** "You are here" → destination, drawn as two stacked layers that crossfade. */
  readonly ahead: string | null;
  /** Power-line poles along the Energy stretch. */
  readonly poles: readonly Point[];
  /** Arc-length table of `route`, used to keep the traveler at the drawing head. */
  readonly samples: readonly RoadSample[];
  readonly length: number;
  /** Where the traveler rests: the "You are here" pin. */
  readonly here: Point | null;
  /** Changes whenever anything that is drawn changes. */
  readonly key: string;
}

/** Points closer than this vertically count as side by side (the desktop fork). */
const SIDE_BY_SIDE = 24;
/** How far the mobile side road bulges out from the straight road. */
const BULGE = 14;
/** Distance between power-line poles. */
const POLE_SPACING = 150;
const SAMPLES_PER_CURVE = 16;

const round = (n: number) => Math.round(n * 10) / 10;
const fmt = (p: Point) => `${round(p.x)} ${round(p.y)}`;

/** S-curve with vertical tangents at both ends, so joined curves stay smooth. */
function cubic(p0: Point, p1: Point, chapter: ChapterId): Cubic {
  const half = (p1.y - p0.y) / 2;
  return { chapter, p0, c1: { x: p0.x, y: p0.y + half }, c2: { x: p1.x, y: p1.y - half }, p1 };
}

function curvesThrough(points: readonly (Point & { chapter: ChapterId })[]): Cubic[] {
  const curves: Cubic[] = [];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (from && to) curves.push(cubic(from, to, to.chapter));
  }
  return curves;
}

function pathOf(curves: readonly Cubic[]): string {
  const first = curves[0];
  if (!first) return '';
  return [
    `M${fmt(first.p0)}`,
    ...curves.map((c) => `C${fmt(c.c1)} ${fmt(c.c2)} ${fmt(c.p1)}`),
  ].join(' ');
}

export function pointOnCubic(c: Cubic, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * c.p0.x + b * c.c1.x + d * c.c2.x + e * c.p1.x,
    y: a * c.p0.y + b * c.c1.y + d * c.c2.y + e * c.p1.y,
  };
}

function sample(curves: readonly Cubic[]): { samples: RoadSample[]; length: number } {
  const first = curves[0];
  if (!first) return { samples: [], length: 0 };
  const samples: RoadSample[] = [{ y: first.p0.y, length: 0 }];
  let length = 0;
  let prev = first.p0;
  for (const c of curves) {
    for (let i = 1; i <= SAMPLES_PER_CURVE; i++) {
      const p = pointOnCubic(c, i / SAMPLES_PER_CURVE);
      length += Math.hypot(p.x - prev.x, p.y - prev.y);
      samples.push({ y: p.y, length });
      prev = p;
    }
  }
  return { samples, length };
}

/**
 * Fraction (0-1) of the traveled road that lies above `y`. The road only ever goes down the
 * page, so the first sample at or below `y` brackets it.
 */
export function progressAtY(road: Pick<RoadGeometry, 'samples' | 'length'>, y: number): number {
  const { samples, length } = road;
  const first = samples[0];
  if (!first || length <= 0 || y <= first.y) return 0;
  for (let i = 1; i < samples.length; i++) {
    const hi = samples[i];
    const lo = samples[i - 1];
    if (hi && lo && hi.y >= y) {
      const span = hi.y - lo.y;
      const along =
        span > 0 ? lo.length + ((hi.length - lo.length) * (y - lo.y)) / span : hi.length;
      return Math.min(1, along / length);
    }
  }
  return 1;
}

interface Expanded {
  readonly main: (Point & { chapter: ChapterId })[];
  readonly side: (Point & { chapter: ChapterId })[] | null;
}

/**
 * Turns the two Breadth stops into a fork: the road splits halfway after the previous stop
 * and rejoins halfway before the next one. Side by side (desktop) the stops sit on the two
 * branches; stacked (mobile) both stay on the straight road and the side road bulges out.
 */
function expandFork(points: readonly RoadPoint[]): Expanded {
  const ai = points.findIndex((p) => p.fork === 'a');
  const bi = points.findIndex((p) => p.fork === 'b');
  const prev = points[Math.min(ai, bi) - 1];
  const next = points[Math.max(ai, bi) + 1];
  const a = points[ai];
  const b = points[bi];
  if (ai < 0 || bi < 0 || Math.abs(ai - bi) !== 1 || !a || !b || !prev || !next) {
    return { main: [...points], side: null };
  }
  const sideBySide = Math.abs(a.y - b.y) < SIDE_BY_SIDE;
  const x = sideBySide ? (a.x + b.x) / 2 : a.x;
  const split = { x, y: (prev.y + Math.min(a.y, b.y)) / 2, chapter: a.chapter };
  const join = { x, y: (Math.max(a.y, b.y) + next.y) / 2, chapter: a.chapter };
  const before = points.slice(0, Math.min(ai, bi));
  const after = points.slice(Math.max(ai, bi) + 1);
  if (sideBySide) {
    return { main: [...before, split, a, join, ...after], side: [split, b, join] };
  }
  const bulge = { x: a.x + BULGE, y: (a.y + b.y) / 2, chapter: a.chapter };
  return { main: [...before, split, a, b, join, ...after], side: [split, bulge, join] };
}

function polesAlong(curves: readonly Cubic[], all: readonly Point[]): Point[] {
  const energy = curves.filter((c) => c.chapter === 'energy');
  const first = energy[0];
  const last = energy[energy.length - 1];
  if (!first || !last) return [];
  const xs = all.map((p) => p.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  // Zigzag: the line runs down the middle of the lane and the road crosses under it.
  // Straight road: the line runs just beside it.
  const x = max - min < 8 ? Math.max(6, min - 18) : (min + max) / 2;
  const top = first.p0.y;
  const bottom = last.p1.y;
  const count = Math.max(2, Math.round((bottom - top) / POLE_SPACING) + 1);
  return Array.from({ length: count }, (_, i) => ({
    x: round(x),
    y: round(top + ((bottom - top) * i) / (count - 1)),
  }));
}

/** Builds everything the road layer draws from the measured stop positions. */
export function buildRoad(
  points: readonly RoadPoint[],
  width: number,
  height: number,
): RoadGeometry {
  const hereIndex = points.findIndex((p) => p.chapter === 'now');
  const traveled = hereIndex >= 0 ? points.slice(0, hereIndex + 1) : [...points];
  const aheadPoints = hereIndex >= 0 ? points.slice(hereIndex) : [];

  const { main, side } = expandFork(traveled);
  const curves = curvesThrough(main);

  const segments: { chapter: ChapterId; d: string }[] = [];
  let run: Cubic[] = [];
  for (const c of curves) {
    if (run[0] && run[0].chapter !== c.chapter) {
      segments.push({ chapter: run[0].chapter, d: pathOf(run) });
      run = [];
    }
    run.push(c);
  }
  if (run[0]) segments.push({ chapter: run[0].chapter, d: pathOf(run) });

  const route = pathOf(curves);
  const fork = side ? pathOf(curvesThrough(side)) : null;
  const ahead = aheadPoints.length > 1 ? pathOf(curvesThrough(aheadPoints)) : null;
  const { samples, length } = sample(curves);
  const here = hereIndex >= 0 ? (points[hereIndex] ?? null) : null;

  return {
    width: round(width),
    height: round(height),
    segments,
    route,
    fork,
    ahead,
    poles: polesAlong(curves, main),
    samples,
    length,
    here: here ? { x: round(here.x), y: round(here.y) } : null,
    key: [round(width), round(height), route, fork ?? '', ahead ?? ''].join('|'),
  };
}
