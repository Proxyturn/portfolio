import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/*
 * Project-wide motion setting: animations run on wall-clock time. With GSAP's default lag
 * smoothing, a device that renders slower than 2 fps advances animations by only 33 ms per
 * frame, so revealed content could stay half-transparent for many seconds. Content must never
 * wait on frame rate.
 */
gsap.ticker.lagSmoothing(0);

export { gsap, ScrollTrigger };
