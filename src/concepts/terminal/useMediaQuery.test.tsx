import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setReducedMotion } from '../../test/setup';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('follows a media query live', () => {
    const { result } = renderHook(() => useMediaQuery('(prefers-reduced-motion: reduce)'));
    expect(result.current).toBe(false);
    act(() => {
      setReducedMotion(true);
    });
    expect(result.current).toBe(true);
  });

  it('is false where matchMedia is missing', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia') ?? {};
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(false);
    } finally {
      Object.defineProperty(window, 'matchMedia', original);
    }
  });
});
