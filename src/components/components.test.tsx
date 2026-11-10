import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cv } from '../content/cv';
import { renderWithLang } from '../test/render';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { Avatar } from './Avatar';
import { ChapterSection } from './ChapterSection';
import { ChapterNav } from './ChapterNav';
import { EmailReveal } from './EmailReveal';
import { Footer } from './Footer';
import { ScrollProgress } from './ScrollProgress';
import { SkillsExplorer } from './SkillsExplorer';

describe('EmailReveal', () => {
  it('keeps the address out of the DOM until clicked, then focuses the link', async () => {
    const user = userEvent.setup();
    const { container } = renderWithLang(<EmailReveal />);
    expect(container.textContent).not.toContain('@');
    await user.click(screen.getByRole('button', { name: 'Show email address' }));
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(
      `mailto:${['william.a.finardi', 'gmail.com'].join('@')}`,
    );
    expect(link).toHaveFocus();
  });
});

describe('SkillsExplorer', () => {
  it('highlights the jobs that used a skill and toggles off', async () => {
    const user = userEvent.setup();
    renderWithLang(<SkillsExplorer />);
    expect(screen.getByText('Pick a skill to see where it was used.')).toBeInTheDocument();

    const xamarin = screen.getByRole('button', { name: 'Xamarin' });
    await user.click(xamarin);
    expect(xamarin).toHaveAttribute('aria-pressed', 'true');
    const link = screen.getByRole('link', { name: 'ATOS · CPFL' });
    expect(link).toHaveAttribute('href', '#job-atos-cpfl');

    await user.click(xamarin);
    expect(xamarin).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('link', { name: 'ATOS · CPFL' })).not.toBeInTheDocument();
  });

  it('explains skills not tied to a specific job, in Portuguese too', async () => {
    const user = userEvent.setup();
    renderWithLang(<SkillsExplorer />, 'pt');
    await user.click(screen.getByRole('button', { name: 'Metodologias ágeis' }));
    expect(screen.getByText(/não está ligada a um cargo específico/)).toBeInTheDocument();
  });

  it('reports selection changes to an optional listener', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithLang(<SkillsExplorer onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'React' }));
    await user.click(screen.getByRole('button', { name: 'Mendix' }));
    await user.click(screen.getByRole('button', { name: 'Mendix' }));
    expect(onChange.mock.calls).toEqual([['react'], ['mendix'], [null]]);
  });

  it('groups every skill', () => {
    renderWithLang(<SkillsExplorer />);
    expect(screen.getAllByRole('button')).toHaveLength(cv.skills.length);
  });
});

describe('ChapterNav', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('marks the chapter in view as current', () => {
    let callback: IntersectionObserverCallback = () => undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const section = document.createElement('section');
    section.id = 'energy';
    section.dataset.chapter = 'energy';
    document.body.append(section);

    const { unmount } = renderWithLang(<ChapterNav />);
    const nav = screen.getByRole('navigation', { name: 'Chapters' });
    expect(within(nav).getByRole('link', { name: 'Intro' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(observe).toHaveBeenCalledWith(section);

    act(() => {
      callback(
        [{ isIntersecting: true, target: section } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(within(nav).getByRole('link', { name: 'Energy' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(nav).getByRole('link', { name: 'Intro' })).not.toHaveAttribute('aria-current');

    unmount();
    expect(disconnect).toHaveBeenCalled();
    section.remove();
  });
});

describe('ScrollProgress', () => {
  it('scales the bar with scroll position', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    const { container } = renderWithLang(<ScrollProgress />);
    const bar = container.querySelector<HTMLElement>('.progress__bar');
    expect(bar?.style.transform).toBe('scaleX(0)');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
    window.dispatchEvent(new Event('scroll'));
    expect(bar?.style.transform).toBe('scaleX(0.5)');
  });
});

describe('Footer and Avatar', () => {
  it('shows only the city as location', () => {
    renderWithLang(<Footer />, 'pt');
    expect(screen.getByText('Porto Alegre, RS, Brasil')).toBeInTheDocument();
    expect(screen.getByText(/Todos os direitos reservados/)).toBeInTheDocument();
  });

  it('renders an accessible avatar image', () => {
    renderWithLang(<Avatar size={96} />);
    const img = screen.getByRole('img', { name: cv.identity.name });
    expect(img).toHaveAttribute('width', '96');
  });
});

describe('ChapterSection', () => {
  it('renders an optional eyebrow before the heading, and nothing extra without it', () => {
    const { container, rerender } = renderWithLang(
      <ChapterSection id="energy" eyebrow="District">
        <p>Body</p>
      </ChapterSection>,
    );
    const section = container.querySelector('[data-chapter="energy"]');
    const eyebrow = section?.firstElementChild;
    expect(eyebrow).toHaveClass('chapter__eyebrow');
    expect(eyebrow).toHaveTextContent('District');
    expect(eyebrow?.nextElementSibling?.tagName).toBe('H2');
    expect(screen.getByRole('region', { name: 'Powering energy' })).toBe(section);

    rerender(
      <LanguageProvider initial="en">
        <ChapterSection id="energy">
          <p>Body</p>
        </ChapterSection>
      </LanguageProvider>,
    );
    expect(container.querySelector('.chapter__eyebrow')).toBeNull();
    expect(container.querySelector('[data-chapter="energy"]')?.firstElementChild?.tagName).toBe(
      'H2',
    );

    for (const empty of ['', null, false]) {
      rerender(
        <LanguageProvider initial="en">
          <ChapterSection id="energy" eyebrow={empty}>
            <p>Body</p>
          </ChapterSection>
        </LanguageProvider>,
      );
      expect(container.querySelector('.chapter__eyebrow')).toBeNull();
    }
  });
});
