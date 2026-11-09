import { jobsChronological } from '../../content/selectors';
import type { Job } from '../../content/types';

export type JobChapter = Job['chapter'];
export type Side = 'left' | 'right';

const ROUTE_CHAPTERS: readonly JobChapter[] = ['origins', 'enterprise', 'energy', 'breadth', 'now'];

/** Every job, in the order the road visits them: spec beat order, oldest first within a beat. */
export function routeStops(jobs?: readonly Job[]): Job[] {
  const chronological = jobsChronological(jobs);
  return ROUTE_CHAPTERS.flatMap((chapter) => chronological.filter((j) => j.chapter === chapter));
}

/** Pins alternate lanes so the road zigzags. */
export function sideOf(index: number): Side {
  return index % 2 === 0 ? 'left' : 'right';
}

/**
 * Short label for a stop on the mini route. ATOS projects name the employer and the client
 * ("ATOS · Bradesco"), so a client is never read as the employer; other stops use the company.
 */
export function stopLabel(job: Pick<Job, 'company' | 'project'>): string {
  return job.company === 'ATOS' && job.project ? `ATOS · ${job.project}` : job.company;
}

/** Fixed wobble per vertex, so the contours look hand-drawn but render the same every time. */
const WOBBLE = [1, 0.86, 1.08, 0.92, 1.12, 0.84, 1.04, 0.95] as const;

/** A closed, smooth terrain contour through 8 wobbly points (Catmull-Rom as cubic Bézier). */
export function contour(cx: number, cy: number, r: number, phase: number): string {
  const n = WOBBLE.length;
  const pts = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2;
    const k = WOBBLE[(i + phase) % n] ?? 1;
    return { x: cx + Math.cos(angle) * r * k, y: cy + Math.sin(angle) * r * 0.78 * k };
  });
  const at = (i: number) => pts[(i + n) % n] ?? { x: cx, y: cy };
  const f = (v: number) => Math.round(v * 10) / 10;
  let d = `M${f(at(0).x)} ${f(at(0).y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return `${d}Z`;
}
