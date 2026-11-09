import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

/**
 * Controllable `matchMedia` for jsdom (which has none). Tests call `setReducedMotion(true)`
 * to emulate `prefers-reduced-motion: reduce`.
 */
let reducedMotion = false;
const listeners = new Set<() => void>();

export function setReducedMotion(value: boolean): void {
  reducedMotion = value;
  for (const listener of listeners) listener();
}

function matches(query: string): boolean {
  if (query.includes('prefers-reduced-motion: reduce')) return reducedMotion;
  if (query.includes('prefers-reduced-motion: no-preference')) return !reducedMotion;
  return false;
}

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList => {
    const mql = {
      get matches() {
        return matches(query);
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      addListener: (listener: () => void) => listeners.add(listener),
      removeListener: (listener: () => void) => listeners.delete(listener),
      dispatchEvent: () => true,
    };
    return mql as unknown as MediaQueryList;
  },
});

beforeEach(() => {
  reducedMotion = false;
  window.localStorage.clear();
  document.documentElement.lang = 'en';
});

afterEach(() => {
  cleanup();
  listeners.clear();
});
