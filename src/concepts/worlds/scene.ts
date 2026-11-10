/**
 * Worlds scroll scene. Lazy-loaded (see WorldsStory) and only ever called from inside
 * `useScrollScene`, so it never runs under reduced motion or in the overview layout, and
 * everything it creates (the ScrollTrigger, the quickTo tweens, the ambient tweens) is
 * reverted on unmount or when the layout changes. Only `transform` and `opacity` move.
 *
 * - Camera: an HTML wrapper around the map SVG pans and zooms (origin top left) between
 *   district viewpoints, scrubbed by scroll: each chapter's viewpoint is reached while its top
 *   travels from 90% to 45% of the viewport height. While keyboard focus is inside the map,
 *   the camera shows the whole world instead.
 * - Active district: once the camera has arrived, the SVG gets `data-active` (the chapter's
 *   grounds) and CSS fades the other districts' decor a little. Buildings, labels, signs and
 *   the pin never fade. No fade on whole-world views.
 * - Ambient touches: the factory gear turns, pulses travel the power line, the truck drives
 *   into the cargo yard. Each starts when the camera arrives at its district, runs at most
 *   once per visit, and ends within 5 seconds.
 */
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import type { ChapterId } from '../../content/types';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import {
  CHAPTER_VIEW,
  cameraFor,
  mixCamera,
  viewRect,
  type Arrangement,
  type CameraTransform,
  type GroundId,
} from './world';

gsap.registerPlugin(MotionPathPlugin);

export interface SceneHandle {
  /** Re-applies the scene, for example after keyboard focus entered or left the map. */
  readonly update: () => void;
}

const ENTER = 0.9;
const SETTLED = 0.45;
const ease = gsap.parseEase('power2.inOut');

/** Longest ambient touch, in seconds (WCAG 2.2.2 allows up to 5). */
export const AMBIENT_MAX_SECONDS = 4;

/** Builds and plays one ambient touch inside `svg`; returns its timeline, or null. */
export function playAmbient(svg: SVGSVGElement, ground: GroundId): gsap.core.Timeline | null {
  const tl = gsap.timeline();
  if (ground === 'industrial') {
    const gear = svg.querySelector('[data-ambient="gear"]');
    if (!gear) return null;
    tl.fromTo(
      gear,
      { rotation: 0 },
      { rotation: 360, duration: 3, ease: 'power1.inOut', transformOrigin: '50% 50%' },
    );
  } else if (ground === 'energy') {
    const line = svg.querySelector<SVGPathElement>('#worlds-powerline');
    const pulses = [...svg.querySelectorAll('[data-ambient="pulse"]')];
    if (!line || pulses.length === 0) return null;
    pulses.forEach((pulse, i) => {
      tl.fromTo(pulse, { opacity: 0 }, { opacity: 1, duration: 0.2 }, i * 0.45)
        .to(pulse, { motionPath: { path: line }, duration: 1.8, ease: 'none' }, i * 0.45)
        .to(pulse, { opacity: 0, duration: 0.3 }, i * 0.45 + 1.6);
    });
  } else if (ground === 'cement') {
    const truck = svg.querySelector('[data-ambient="truck"]');
    const path = svg.querySelector<SVGPathElement>('[data-ambient-path="truck"]');
    if (!truck || !path) return null;
    tl.to(truck, { motionPath: { path }, duration: 3.5, ease: 'power2.out' });
  } else {
    return null;
  }
  return tl;
}

export function startScene(
  root: HTMLElement,
  arrangement: Arrangement,
  wholeWorld: () => boolean,
): SceneHandle | null {
  const stage = root.querySelector<HTMLElement>('[data-camera-stage]');
  const camera = root.querySelector<HTMLElement>('[data-camera]');
  const svg = camera?.querySelector('svg') ?? null;
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-chapter]')];
  if (!stage || !camera || !svg || chapters.length === 0) return null;

  let stageW = 0;
  let stageH = 0;
  let stops: { top: number; chapter: ChapterId; camera: CameraTransform }[] = [];
  let world: CameraTransform = { x: 0, y: 0, scale: 1 };

  const measure = () => {
    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    world = cameraFor(viewRect('hook', arrangement), stageW, stageH, arrangement);
    stops = chapters.map((el) => {
      const chapter = el.dataset.chapter as ChapterId;
      return {
        top: el.getBoundingClientRect().top + window.scrollY,
        chapter,
        camera: cameraFor(viewRect(chapter, arrangement), stageW, stageH, arrangement),
      };
    });
  };

  /** Where the scroll position puts the camera, and the chapter it has arrived at. */
  const scrolled = (): { camera: CameraTransform; chapter: ChapterId | null } => {
    const y = window.scrollY;
    const h = window.innerHeight;
    let current = stops[0]?.camera ?? world;
    let chapter = stops[0]?.chapter ?? null;
    for (const stop of stops.slice(1)) {
      const start = stop.top - h * ENTER;
      const end = stop.top - h * SETTLED;
      if (y >= end) {
        current = stop.camera;
        chapter = stop.chapter;
      } else {
        if (y > start) {
          current = mixCamera(current, stop.camera, ease((y - start) / (end - start)));
          chapter = null;
        }
        break;
      }
    }
    return { camera: current, chapter };
  };

  const xTo = gsap.quickTo(camera, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(camera, 'y', { duration: 0.35, ease: 'power3.out' });
  // quickTo needs single properties (the `scale` shorthand can't be retargeted).
  const sxTo = gsap.quickTo(camera, 'scaleX', { duration: 0.35, ease: 'power3.out' });
  const syTo = gsap.quickTo(camera, 'scaleY', { duration: 0.35, ease: 'power3.out' });

  let active: readonly GroundId[] = [];
  const playing = new Map<GroundId, gsap.core.Timeline>();

  const arrive = (grounds: readonly GroundId[]) => {
    const fresh = grounds.filter((g) => !active.includes(g));
    active = grounds;
    if (grounds.length > 0) svg.setAttribute('data-active', grounds.join(' '));
    else svg.removeAttribute('data-active');
    // A new visit: play each district's ambient touch once.
    for (const ground of fresh) {
      playing.get(ground)?.progress(1).kill();
      const tl = playAmbient(svg, ground);
      if (tl) playing.set(ground, tl);
    }
  };

  const apply = (instant: boolean) => {
    const whole = wholeWorld();
    const { camera: target, chapter } = whole ? { camera: world, chapter: null } : scrolled();
    const view = chapter ? CHAPTER_VIEW[chapter] : 'world';
    // Only a district viewpoint the camera has arrived at is active; whole-world views fade
    // nothing. A transition keeps the current state until it settles. While keyboard focus is
    // in the map the fade is lifted but the visit goes on, so leaving the map doesn't replay
    // the district's ambient touch.
    if (whole) svg.removeAttribute('data-active');
    else if (chapter) arrive(view === 'world' ? [] : view);
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

  // WorldsStory clears `data-active` when the scene is reverted (see its effect).
  return {
    update: () => {
      // After a revert the handle is stale: do nothing.
      if (ScrollTrigger.getAll().includes(trigger)) apply(false);
    },
  };
}
