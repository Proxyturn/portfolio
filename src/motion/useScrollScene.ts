import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from './gsap';

/**
 * Runs GSAP / ScrollTrigger setup scoped to `scope`, only when the visitor has not asked for
 * reduced motion. Everything created inside `setup` (tweens, timelines, ScrollTriggers) is
 * reverted on unmount or when the motion preference changes, so no instances leak.
 *
 * Contract for scene authors:
 * - The resting (no-JS, reduced-motion) state of the markup must be fully visible.
 *   Animate *from* hidden states (`gsap.from`), never leave content hidden by CSS.
 * - Animate only `transform` and `opacity` to stay at 60 fps.
 */
export function useScrollScene(
  scope: RefObject<HTMLElement | null>,
  setup: (root: HTMLElement) => void,
  deps: readonly unknown[] = [],
): void {
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return undefined;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      setup(root);
    });
    return () => {
      mm.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls re-runs via deps
  }, deps);
}
