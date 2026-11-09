import { act, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { cv } from '../content/cv';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { setReducedMotion } from '../test/setup';
import { useReducedMotion } from './useReducedMotion';
import { useScrollScene } from './useScrollScene';

function Scene({ setup }: { setup: (root: HTMLElement) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollScene(ref, setup);
  return (
    <div ref={ref}>
      <p>scene content</p>
    </div>
  );
}

describe('prefers-reduced-motion', () => {
  it('reports the OS preference and follows changes', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => {
      setReducedMotion(true);
    });
    expect(result.current).toBe(true);
  });

  it('skips scroll scenes entirely when motion is reduced', () => {
    setReducedMotion(true);
    const setup = vi.fn();
    render(<Scene setup={setup} />);
    expect(setup).not.toHaveBeenCalled();
    expect(screen.getByText('scene content')).toBeVisible();
  });

  it('runs scenes when motion is allowed and cleans them up on unmount', async () => {
    const { gsap } = await import('./gsap');
    let target: HTMLElement | undefined;
    const setup = vi.fn((root: HTMLElement) => {
      target = root;
      gsap.to(root, { opacity: 0.5, duration: 0 });
    });
    const { unmount } = render(<Scene setup={setup} />);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(target?.style.opacity).toBe('0.5');
    unmount();
    // gsap.matchMedia().revert() undoes everything created in the scene.
    expect(target?.style.opacity).toBe('');
  });

  it('keeps all story content visible and readable with reduced motion', () => {
    setReducedMotion(true);
    const { container } = render(
      <LanguageProvider initial="en">
        <App />
      </LanguageProvider>,
    );
    for (const el of container.querySelectorAll<HTMLElement>('.reveal, [data-chapter]')) {
      expect(el.style.opacity).toBe('');
      expect(el.style.transform).toBe('');
      expect(el).toBeVisible();
    }
    for (const job of cv.jobs) {
      for (const highlight of job.highlights) {
        expect(screen.getByText(highlight.en)).toBeVisible();
      }
    }
  });
});
