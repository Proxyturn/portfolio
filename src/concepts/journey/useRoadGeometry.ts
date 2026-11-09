import { useLayoutEffect, useState, type RefObject } from 'react';
import type { ChapterId } from '../../content/types';
import { buildRoad, type RoadGeometry, type RoadPoint } from './geometry';

/**
 * Reads every `[data-road-point]` anchor inside `root`, relative to `root`. Anchors are
 * zero-size and never animated, so transforms on pins and cards don't move the road.
 */
export function measureRoadPoints(root: HTMLElement): RoadPoint[] {
  const box = root.getBoundingClientRect();
  return [...root.querySelectorAll<HTMLElement>('[data-road-point]')].map((el) => {
    const r = el.getBoundingClientRect();
    const fork = el.dataset.roadFork;
    return {
      id: el.dataset.roadPoint ?? '',
      chapter: (el.dataset.roadChapter ?? 'origins') as ChapterId,
      x: r.left - box.left + r.width / 2,
      y: r.top - box.top + r.height / 2,
      ...(fork === 'a' || fork === 'b' ? { fork } : {}),
    };
  });
}

/**
 * Measures the stops and rebuilds the road whenever the story resizes (viewport, fonts
 * loading, language switch). Returns null until the first measurement.
 */
export function useRoadGeometry(
  root: RefObject<HTMLElement | null>,
  remeasureOn: unknown,
): RoadGeometry | null {
  const [geometry, setGeometry] = useState<RoadGeometry | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    let frame = 0;
    let active = true;
    const measure = () => {
      frame = 0;
      const next = buildRoad(measureRoadPoints(el), el.offsetWidth, el.offsetHeight);
      setGeometry((prev) => (prev?.key === next.key ? prev : next));
    };
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(measure);
    };
    measure();
    // Web fonts swapping in move the pins; the story usually resizes then too, but not always.
    if ('fonts' in document) void document.fonts.ready.then(schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(el);
    return () => {
      active = false;
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [root, remeasureOn]);

  return geometry;
}
