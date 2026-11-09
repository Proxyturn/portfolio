import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoadGeometry } from './geometry';
import { measureRoadPoints, useRoadGeometry } from './useRoadGeometry';

let positions: Record<string, { x: number; y: number }> = {};

function stubRects() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const p = positions[this.dataset.roadPoint ?? ''] ?? { x: 0, y: 0 };
    return { x: p.x, y: p.y, left: p.x, top: p.y, width: 0, height: 0 } as DOMRect;
  });
}

function Probe({ onGeometry }: { onGeometry: (g: RoadGeometry | null) => void }) {
  const root = useRef<HTMLDivElement>(null);
  onGeometry(useRoadGeometry(root, 'en'));
  return (
    <div ref={root}>
      <span data-road-point="a" data-road-chapter="origins" />
      <span data-road-point="b" data-road-chapter="breadth" data-road-fork="a" />
      <span data-road-point="c" data-road-chapter="now" data-road-fork="x" />
    </div>
  );
}

describe('useRoadGeometry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads anchors relative to the root, with their chapter and fork', () => {
    positions = { a: { x: 10, y: 20 }, b: { x: 30, y: 40 } };
    stubRects();
    const root = document.createElement('div');
    const a = document.createElement('span');
    a.dataset.roadPoint = 'a';
    a.dataset.roadChapter = 'origins';
    const b = document.createElement('span');
    b.dataset.roadPoint = 'b';
    b.dataset.roadFork = 'b';
    root.append(a, b);
    expect(measureRoadPoints(root)).toEqual([
      { id: 'a', chapter: 'origins', x: 10, y: 20 },
      { id: 'b', chapter: 'origins', x: 30, y: 40, fork: 'b' },
    ]);
  });

  it('re-measures when the story resizes and keeps the same object when nothing moved', () => {
    let resize: () => void = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          resize = cb;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    positions = { a: { x: 10, y: 0 }, b: { x: 10, y: 100 }, c: { x: 10, y: 200 } };
    stubRects();

    const seen: (RoadGeometry | null)[] = [];
    const { unmount } = render(<Probe onGeometry={(g) => seen.push(g)} />);
    const first = seen.at(-1);
    expect(first?.route).toMatch(/^M10 0 C/);

    // A resize with no movement: same geometry object, so scenes are not rebuilt.
    act(() => {
      resize();
      resize();
      frames.shift()?.(0);
    });
    expect(frames).toHaveLength(0);
    expect(seen.at(-1)).toBe(first);

    // The layout changed: a new road.
    positions = { a: { x: 50, y: 0 }, b: { x: 50, y: 100 }, c: { x: 50, y: 200 } };
    act(() => {
      resize();
      frames.shift()?.(0);
    });
    expect(seen.at(-1)).not.toBe(first);
    expect(seen.at(-1)?.route).toMatch(/^M50 0 C/);

    act(() => {
      resize();
    });
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
