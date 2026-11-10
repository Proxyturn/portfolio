/**
 * Worlds camera. Lazy-loaded (see WorldsStory) and only ever called from inside
 * `useScrollScene`, so it never runs under reduced motion and everything it creates (the
 * ScrollTrigger and the quickTo tweens) is reverted on unmount or when the layout changes.
 *
 * An HTML wrapper around the map SVG is panned and zoomed (transform only, origin top left)
 * between district viewpoints, scrubbed by the scroll position: each chapter's viewpoint is
 * reached while the chapter's top travels from 90% to 45% of the viewport height. While
 * keyboard focus is inside the map, the camera shows the whole world instead.
 */
import type { ChapterId } from '../../content/types';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { cameraFor, mixCamera, viewRect, type CameraTransform } from './world';

export interface CameraHandle {
  /** Re-applies the camera, for example after keyboard focus entered or left the map. */
  readonly update: () => void;
}

const ENTER = 0.9;
const SETTLED = 0.45;
const ease = gsap.parseEase('power2.inOut');

export function startCamera(root: HTMLElement, wholeWorld: () => boolean): CameraHandle | null {
  const stage = root.querySelector<HTMLElement>('[data-camera-stage]');
  const camera = root.querySelector<HTMLElement>('[data-camera]');
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-chapter]')];
  if (!stage || !camera || chapters.length === 0) return null;

  let stageW = 0;
  let stageH = 0;
  let stops: { top: number; camera: CameraTransform }[] = [];
  let world: CameraTransform = { x: 0, y: 0, scale: 1 };

  const measure = () => {
    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    world = cameraFor(viewRect('hook'), stageW, stageH);
    stops = chapters.map((el) => ({
      top: el.getBoundingClientRect().top + window.scrollY,
      camera: cameraFor(viewRect(el.dataset.chapter as ChapterId), stageW, stageH),
    }));
  };

  /** Where the scroll position puts the camera. */
  const scrolled = (): CameraTransform => {
    const y = window.scrollY;
    const h = window.innerHeight;
    let current = stops[0]?.camera ?? world;
    for (const stop of stops.slice(1)) {
      const start = stop.top - h * ENTER;
      const end = stop.top - h * SETTLED;
      if (y >= end) current = stop.camera;
      else {
        if (y > start) current = mixCamera(current, stop.camera, ease((y - start) / (end - start)));
        break;
      }
    }
    return current;
  };

  const xTo = gsap.quickTo(camera, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(camera, 'y', { duration: 0.35, ease: 'power3.out' });
  // quickTo needs single properties (the `scale` shorthand can't be retargeted).
  const sxTo = gsap.quickTo(camera, 'scaleX', { duration: 0.35, ease: 'power3.out' });
  const syTo = gsap.quickTo(camera, 'scaleY', { duration: 0.35, ease: 'power3.out' });

  const apply = (instant: boolean) => {
    const target = wholeWorld() ? world : scrolled();
    if (instant) {
      xTo(target.x, target.x);
      yTo(target.y, target.y);
      sxTo(target.scale, target.scale);
      syTo(target.scale, target.scale);
    } else {
      xTo(target.x);
      yTo(target.y);
      sxTo(target.scale);
      syTo(target.scale);
    }
  };

  gsap.set(camera, { transformOrigin: '0 0' });
  const trigger = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: () => {
      apply(false);
    },
    onRefresh: () => {
      measure();
      apply(true);
    },
  });
  measure();
  apply(true);

  return {
    update: () => {
      // After a revert (unmount, layout change) the handle is stale: do nothing.
      if (ScrollTrigger.getAll().includes(trigger)) apply(false);
    },
  };
}
