import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cv } from '../../content/cv';
import { en } from '../../i18n/en';
import { ptBR } from '../../i18n/pt-BR';
import { renderWithLang } from '../../test/render';
import { setReducedMotion } from '../../test/setup';
import { JourneyStory } from './JourneyStory';
import { routeStops, sideOf } from './route';

/**
 * jsdom has no layout, so give every road anchor a position: right-lane pins at x 300, others
 * at x 100, each 200 px below the previous one.
 */
function stubLayout() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const anchors = [...document.querySelectorAll('[data-road-point]')];
    const i = anchors.indexOf(this);
    const right = this.closest('[data-side="right"]') !== null;
    const x = i < 0 ? 0 : right ? 300 : 100;
    const y = i < 0 ? 0 : 100 + i * 200;
    return { x, y, left: x, top: y, right: x, bottom: y, width: 0, height: 0 } as DOMRect;
  });
}

describe('JourneyStory', () => {
  beforeEach(() => {
    setReducedMotion(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives every job in the CV a stop on the road', () => {
    const { container } = renderWithLang(<JourneyStory />);
    for (const job of cv.jobs) {
      const stop = container.querySelector<HTMLElement>(`[data-job="${job.id}"]`);
      expect(stop, job.id).not.toBeNull();
      expect(stop?.id).toBe(`job-${job.id}`);
      expect(stop?.querySelector(`[data-road-point="${job.id}"]`), job.id).not.toBeNull();
      expect(stop?.querySelector('[data-road-point]')?.getAttribute('data-road-chapter')).toBe(
        job.chapter,
      );
    }
    // The degree is a landmark beside the road, not a stop on it.
    const degree = container.querySelector('[data-education="computer-science"]');
    expect(degree?.querySelector('[data-road-point]')).toBeNull();
    expect(degree?.querySelector('.journey-flag')).not.toBeNull();
  });

  it('keeps the shared jump contract on every card it renders', () => {
    const { container } = renderWithLang(<JourneyStory />);
    const targets = [
      ...cv.jobs.map((job) => ({ id: `job-${job.id}`, attr: 'data-job', value: job.id })),
      ...cv.education.map((entry) => ({
        id: `edu-${entry.id}`,
        attr: 'data-education',
        value: entry.id,
      })),
    ];
    for (const { id, attr, value } of targets) {
      const target = container.querySelector<HTMLElement>(`#${id}`);
      expect(target, id).not.toBeNull();
      expect(target?.getAttribute(attr), id).toBe(value);
      // The first heading is the one a jump focuses: present and focusable by script only.
      const heading = target?.querySelector('h1, h2, h3, h4, h5, h6');
      expect(heading?.getAttribute('tabindex'), id).toBe('-1');
    }
    // The hook renders its own h1 (ChapterSection's hideTitle), which a jump to #hook focuses.
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1');
    // No other element claims to be a job or education entry.
    expect(container.querySelectorAll('[data-job], [data-education]')).toHaveLength(targets.length);
  });

  it('renders the road SVG with a path through the stops', () => {
    stubLayout();
    const { container } = renderWithLang(<JourneyStory />);
    const svg = container.querySelector('svg[data-road]');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.querySelector('mask rect.journey-road__reveal')).not.toBeNull();
    const route = svg?.querySelector('#journey-route');
    expect(route?.getAttribute('d')).toMatch(/^M100 100 C/);
    expect(svg?.querySelectorAll('.journey-road__seg').length).toBeGreaterThanOrEqual(5);
    expect(svg?.querySelector('.journey-road__seg--enterprise')).not.toBeNull();
    expect(svg?.querySelector('.journey-road__lanes')).not.toBeNull();
    expect(svg?.querySelector('.journey-road__fork')).not.toBeNull();
    expect(svg?.querySelector('.journey-road__power')).not.toBeNull();
    expect(svg?.querySelectorAll('.journey-road__ahead')).toHaveLength(2);
    // At rest the traveler waits at "You are here": the "now" stop's anchor (lane from sideOf).
    const here = routeStops().findIndex((job) => job.chapter === 'now');
    expect(here).toBeGreaterThanOrEqual(0);
    const x = sideOf(here) === 'right' ? 300 : 100;
    expect(svg?.querySelector('.journey-traveler')?.getAttribute('transform')).toBe(
      `translate(${x} ${100 + here * 200})`,
    );
  });

  it('keeps every stop static and visible under reduced motion', () => {
    const { container } = renderWithLang(<JourneyStory />);
    const animated = container.querySelectorAll<HTMLElement>(
      '[data-stop], .journey-pin, .journey-card, .reveal',
    );
    expect(animated.length).toBeGreaterThan(cv.jobs.length * 2);
    for (const el of animated) {
      expect(el.style.opacity).toBe('');
      expect(el.style.transform).toBe('');
      expect(el).toBeVisible();
    }
    expect(container.querySelector('.is-pulsing')).toBeNull();
  });

  it('tells the beats with the Journey copy', () => {
    renderWithLang(<JourneyStory />);
    expect(screen.getByRole('link', { name: en.journey.startTrip })).toHaveAttribute(
      'href',
      '#origins',
    );
    expect(screen.getByText(en.journey.youAreHere)).toBeInTheDocument();
    expect(screen.getByText(en.journey.destination)).toBeInTheDocument();
    expect(screen.getByText(en.journey.glovebox)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: en.journey.travelLog })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: en.journey.phrasebook })).toBeInTheDocument();
    expect(screen.getByText(en.journey.sendPostcard)).toBeInTheDocument();
    for (const topic of cv.education.find((e) => e.id === 'ai-engineering')?.topics ?? []) {
      expect(screen.getByText(topic.en)).toBeInTheDocument();
    }
    // Hours only where the CV gives them.
    const log = screen.getByRole('heading', { name: en.journey.travelLog }).parentElement;
    const withHours = cv.certifications.filter((c) => c.hours !== undefined);
    expect(log?.querySelectorAll('.journey-log__hours')).toHaveLength(withHours.length);
    // The stack of the current job as luggage tags.
    const tags = screen.getByRole('list', { name: en.story.skillsUsed });
    expect(within(tags).getByText('SQL Server')).toBeInTheDocument();
  });

  it('labels the CV download area without changing the link name', () => {
    renderWithLang(<JourneyStory />, 'pt');
    const group = screen.getByRole('group', { name: ptBR.journey.takeTheMap });
    expect(within(group).getByRole('link', { name: ptBR.contact.downloadCv })).toHaveAttribute(
      'href',
      cv.identity.cvPath,
    );
  });

  it('highlights the stops that used a skill on the mini route', async () => {
    const user = userEvent.setup();
    const { container } = renderWithLang(<JourneyStory />);
    const mini = container.querySelector('.journey-miniroute');
    expect(mini).toHaveAttribute('aria-hidden', 'true');
    const matched = () =>
      [...(mini?.querySelectorAll('[data-match="true"]') ?? [])].map((li) =>
        li.getAttribute('data-stop-id'),
      );
    expect(matched()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'React' }));
    expect(matched()).toEqual(['atos-frontend', 'semantix']);
    // The same result, as text, in the live region.
    expect(screen.getByRole('link', { name: 'ATOS' })).toHaveAttribute(
      'href',
      '#job-atos-frontend',
    );

    await user.click(screen.getByRole('button', { name: 'React' }));
    expect(matched()).toEqual([]);
  });

  it('loads the scroll scene only when motion is allowed', async () => {
    setReducedMotion(false);
    // Every stop below the fold, so the scene has something to reveal.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return { top: this.hasAttribute('data-stop') ? 5000 : 0 } as DOMRect;
    });
    const { container, unmount } = renderWithLang(<JourneyStory />);
    const card = container.querySelector<HTMLElement>('.journey-card');
    // Once the lazy scene runs, cards below the fold wait folded and transparent for their
    // scroll trigger.
    await waitFor(() => {
      expect(card?.style.opacity).toBe('0');
    });
    unmount();
    expect(card?.style.opacity).toBe('');
  });
});
