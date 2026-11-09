/**
 * Test helper: jsdom has no layout, so place elements by hand. A plain override, not a spy:
 * ScrollTrigger measures hundreds of times per scene, and a spy that records every call makes
 * the tests slow.
 */
export function stubRects(place: (el: HTMLElement) => { top: number; height?: number }): void {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    writable: true,
    value(this: HTMLElement): DOMRect {
      const { top, height = 20 } = place(this);
      return {
        top,
        bottom: top + height,
        height,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: top,
        toJSON: () => ({}),
      };
    },
  });
}

/** Back to jsdom's own (all zeros) rects. */
export function restoreRects(): void {
  Reflect.deleteProperty(HTMLElement.prototype, 'getBoundingClientRect');
}
