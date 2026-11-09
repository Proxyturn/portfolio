/**
 * Terminal scroll scenes. Lazy-loaded (see TerminalStory) and only ever called from inside
 * `useScrollScene`, so nothing here runs under reduced motion and everything is reverted on
 * unmount. Only `transform` and `opacity` are animated, and only on whole lines.
 */
import { gsap, ScrollTrigger } from '../../motion/gsap';

/** Lines reveal when their top crosses this fraction of the viewport. */
export const REVEAL_AT = 0.9;
/** How long the "Now" window stays pinned, in viewport heights. */
export const PIN_LENGTH = 1.2;
/** Cursor blink: 6 half-periods of 0.4 s, so 2.4 s at most, ending solid (WCAG 2.2.2). */
const BLINK = { duration: 0.4, repeat: 5 } as const;

export interface SceneOptions {
  /** Pin the "Now" window (wide screens only; the caller decides). */
  readonly pinNow: boolean;
}

/** Sets up every scene of the story. */
export function runScene(root: HTMLElement, { pinNow }: SceneOptions): void {
  // The pin goes first: its spacer moves everything below it, which later triggers measure.
  const pinned = pinNow ? pinNowWindow(root) : null;
  revealLines(root, pinned);
  fillDeployBar(root);
  ScrollTrigger.refresh();
  // Web fonts swap in after the first layout and change line heights.
  if ('fonts' in document) {
    void document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });
  }
}

/** Re-measures every trigger, e.g. after the language changed the text. */
export function refreshScene(): void {
  ScrollTrigger.refresh();
}

/** One blink per window cursor, started by the first reveal in that window. */
export function createBlinker() {
  const tweens = new Map<Element, gsap.core.Tween>();
  return (cursor: Element | null | undefined) => {
    if (!cursor) return;
    let tween = tweens.get(cursor);
    if (!tween) {
      tween = gsap.fromTo(
        cursor,
        { opacity: 1 },
        { opacity: 0, ease: 'steps(1)', yoyo: true, paused: true, ...BLINK },
      );
      tweens.set(cursor, tween);
    }
    if (tween.totalProgress() === 0 && tween.paused()) tween.play();
  };
}

/**
 * Output lines slide up out of their clipped row while fading in, a group (one entry or one
 * command) at a time. Lines inside `exclude` (the pinned window) and the boot screen (a CSS
 * animation on first paint) are left alone.
 */
export function revealLines(root: HTMLElement, exclude: HTMLElement | null = null): void {
  const blink = createBlinker();
  const groups = new Map<Element, HTMLElement[]>();
  for (const line of root.querySelectorAll<HTMLElement>('.term-line.reveal')) {
    if (exclude?.contains(line) || line.closest('.term-window--boot')) continue;
    // This code loads lazily, so the visitor may already be further down the page (fast
    // scroll, deep link, reload). Never hide a line that is already on screen or above it.
    if (line.getBoundingClientRect().top < window.innerHeight) continue;
    const group = line.closest('[data-reveal-group]') ?? line;
    const lines = groups.get(group);
    if (lines) lines.push(line);
    else groups.set(group, [line]);
  }

  for (const lines of groups.values()) {
    const [first] = lines;
    if (!first) continue;
    const cursor = first.closest('.term-window')?.querySelector('.term-cursor');
    // Plays once, also when a fast jump (chapter nav) skips straight past the lines. No
    // `once: true`: triggers that kill themselves during ScrollTrigger's refresh loop break it.
    gsap
      .timeline({
        scrollTrigger: {
          trigger: first,
          start: `top ${REVEAL_AT * 100}%`,
          toggleActions: 'play play play none',
        },
        onStart: () => {
          blink(cursor);
        },
      })
      .from(lines, {
        yPercent: 100,
        opacity: 0,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
      });
  }
}

/**
 * Pins the "Now" stage (its title and the `tail -f` window) and scrubs its log lines with the
 * scroll. The pin starts exactly where the chapter nav lands (the section's scroll margin
 * below the top), so a jump to "Now" lands at the top of the pinned section. Returns the
 * pinned stage, or null when it is not pinned: when the section is already on screen or above
 * it (the scene loaded late), or when the stage would not fit in the viewport.
 */
export function pinNowWindow(root: HTMLElement): HTMLElement | null {
  const section = root.querySelector<HTMLElement>('[data-chapter="now"]');
  const stage = section?.querySelector<HTMLElement>('[data-now-stage]');
  if (!section || !stage) return null;
  const top = section.getBoundingClientRect().top;
  if (top < window.innerHeight) return null;
  const offset = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const box = stage.getBoundingClientRect();
  if (offset + (box.top - top) + box.height > window.innerHeight) return null;

  const blink = createBlinker();
  const cursor = stage.querySelector('.term-cursor');
  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: `top top+=${offset}`,
      end: () => `+=${Math.round(window.innerHeight * PIN_LENGTH)}`,
      pin: stage,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => {
        blink(cursor);
      },
    },
  });
  stage.querySelectorAll<HTMLElement>('[data-scrub]').forEach((line, i) => {
    timeline.from(line, { yPercent: 100, opacity: 0, duration: 1 }, i * 1.25);
  });
  // A short rest at the end, so the last line is read before the window scrolls away.
  timeline.to({}, { duration: 0.75 });
  return stage;
}

/** `deploy --target future`: the bar fills (scaleX) as the visitor scrolls past it. */
export function fillDeployBar(root: HTMLElement): void {
  const track = root.querySelector('.term-deploy__track');
  const fill = track?.querySelector('.term-deploy__fill');
  if (!track || !fill) return;
  gsap.fromTo(
    fill,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: track, start: 'top 90%', end: 'top 35%', scrub: true },
    },
  );
}
