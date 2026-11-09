/**
 * Journey scroll scenes. Lazy-loaded (see JourneyStory) and only ever called from inside
 * `useScrollScene`, so nothing here runs under reduced motion and everything is reverted on
 * unmount. Only `transform` and `opacity` are animated.
 */
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { gsap, ScrollTrigger } from '../../motion/gsap';
import { progressAtY, type RoadGeometry } from './geometry';
import { ROUTE_ID } from './Road';

gsap.registerPlugin(MotionPathPlugin);

/** The road's drawing head sits this far down the viewport. */
const HEAD = 'top 65%';
/** Stops reveal when their top crosses this fraction of the viewport. */
const REVEAL_AT = 0.85;

/** Pins drop in, cards unfold, the "You are here" pin pulses, the terrain drifts. */
export function revealStops(root: HTMLElement): void {
  const startLine = window.innerHeight * REVEAL_AT;
  for (const stop of root.querySelectorAll<HTMLElement>('[data-stop]')) {
    // This code loads lazily, so the visitor may already be further down the page (fast
    // scroll, deep link, reload). Never hide a stop that is already on screen or above it.
    if (stop.getBoundingClientRect().top < startLine) continue;
    const pin = stop.querySelector('.journey-pin');
    const card = stop.querySelector('.journey-card');
    // Plays once, also when a fast jump (chapter nav) skips straight past the stop. No
    // `once: true`: triggers that kill themselves during ScrollTrigger's refresh loop break it.
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: stop,
        start: `top ${REVEAL_AT * 100}%`,
        toggleActions: 'play play play none',
      },
    });
    if (pin) timeline.from(pin, { y: -36, opacity: 0, duration: 0.55, ease: 'bounce.out' });
    if (card) {
      timeline.from(
        card,
        {
          scaleY: 0.55,
          scaleX: 0.94,
          opacity: 0,
          transformOrigin: '50% 0%',
          duration: 0.55,
          ease: 'power2.out',
        },
        pin ? '-=0.3' : 0,
      );
    }
  }

  // The pulse itself is a CSS animation (3 iterations, 4.2 s); it starts when the pin arrives.
  const here = root.querySelector<HTMLElement>('[data-here]');
  if (here) {
    ScrollTrigger.create({
      trigger: here,
      start: 'top 75%',
      // Adding the class again is a no-op, so the pulse runs only the first time.
      onEnter: () => {
        here.classList.add('is-pulsing');
      },
    });
  }

  // Parallax: each contour layer drifts up at its own rate. The layers are only one viewport
  // tall (plus a tile), so the drift wraps every pattern tile and the seam never shows.
  for (const layer of root.querySelectorAll<SVGElement>('.journey-terrain__layer')) {
    const tile = Number(layer.dataset.tile);
    const rate = Number(layer.dataset.rate);
    if (!(tile > 0 && rate > 0)) continue;
    const wrap = gsap.utils.wrap(-tile, 0);
    gsap.fromTo(
      layer,
      { y: 0 },
      {
        y: () => -root.offsetHeight * rate,
        ease: 'none',
        modifiers: { y: (y: string) => `${wrap(parseFloat(y))}px` },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  }
}

/**
 * The road draws itself (a mask rectangle scaled on Y, scrubbed to scroll), the traveler
 * drives it along the MotionPath, and the road ahead crossfades from terracotta to the dotted
 * horizon-blue layer.
 */
export function driveRoad(root: HTMLElement, geometry: RoadGeometry): void {
  const svg = root.querySelector<SVGSVGElement>('[data-road]');
  const reveal = svg?.querySelector('.journey-road__reveal');
  if (!svg || !reveal || geometry.height <= 0) return;

  const route = svg.querySelector<SVGPathElement>(`#${ROUTE_ID}`);
  const traveler = svg.querySelector('.journey-traveler');
  const travel =
    route && traveler
      ? gsap.to(traveler, { motionPath: { path: route }, ease: 'none', paused: true })
      : null;

  // Keeps the traveler at the drawing head: where the mask currently ends on the road.
  const follow = () => {
    const head = Number(gsap.getProperty(reveal, 'scaleY')) * geometry.height;
    travel?.progress(progressAtY(geometry, head));
  };

  gsap.fromTo(
    reveal,
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: 'none',
      transformOrigin: '50% 0%',
      scrollTrigger: { trigger: svg, start: HEAD, end: 'bottom 65%', scrub: 0.4 },
      onUpdate: follow,
    },
  );
  follow();

  const day = svg.querySelector('.journey-road__ahead--day');
  const horizon = svg.querySelector('.journey-road__ahead--horizon');
  const here = root.querySelector('[data-road-point][data-road-chapter="now"]');
  const ahead = root.querySelector('[data-road-point][data-road-chapter="next"]');
  if (day && horizon && here && ahead) {
    gsap
      .timeline({
        scrollTrigger: { trigger: here, start: HEAD, endTrigger: ahead, end: HEAD, scrub: true },
      })
      .fromTo(day, { opacity: 1 }, { opacity: 0, ease: 'none' }, 0)
      .fromTo(horizon, { opacity: 0 }, { opacity: 1, ease: 'none' }, 0);
  }

  // The road was rebuilt because the layout changed: re-measure every trigger on the page.
  ScrollTrigger.refresh();
}
