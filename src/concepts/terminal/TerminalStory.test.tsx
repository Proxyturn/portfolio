import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cv } from '../../content/cv';
import { jobsChronological } from '../../content/selectors';
import { en } from '../../i18n/en';
import { ptBR } from '../../i18n/pt-BR';
import { renderWithLang } from '../../test/render';
import { setReducedMotion } from '../../test/setup';
import { CMD, isoMonth, LINK_CMD, OPS_LOG, STACK_LINE } from './code';
import { TerminalStory } from './TerminalStory';
import { restoreRects, stubRects } from './testLayout';

const GIT_LOG_CHAPTERS = ['origins', 'enterprise', 'energy'] as const;

/** Visible text of an element, with whitespace collapsed. */
const text = (el: Element | null | undefined) =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/**
 * Accessible-name matcher that ignores whitespace: jsdom's name computation drops the spaces at
 * inline element edges that browsers keep (the E2E suite checks the real names).
 */
const named = (expected: string) => (name: string) =>
  name.replace(/\s+/g, '') === expected.replace(/\s+/g, '');

describe('TerminalStory', () => {
  beforeEach(() => {
    setReducedMotion(true);
  });
  afterEach(() => {
    restoreRects();
  });

  it('boots with whoami, cat role.txt, the message of the day and cat README.md', () => {
    renderWithLang(<TerminalStory />);
    const hook = document.getElementById('hook');
    const rows = [...(hook?.querySelectorAll('.term-window__body > .term-row') ?? [])];
    const paragraphs = (row: Element | undefined) =>
      [...(row?.querySelectorAll('p') ?? [])].map(text);
    expect(rows.map(text)).toEqual([
      `$ ${CMD.whoami}`,
      cv.identity.name,
      `$ ${CMD.role}`,
      `${cv.role.en} · ${cv.identity.location.en}`,
      en.terminal.motd + cv.hook.en,
      `$ ${CMD.readme}`,
      cv.summary.map((p) => p.en).join(''),
      '$',
    ]);
    expect(paragraphs(rows[4])).toEqual([en.terminal.motd, cv.hook.en]);
    expect(paragraphs(rows[6])).toEqual(cv.summary.map((p) => p.en));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(cv.identity.name);
  });

  it('tells Origins to Energy as one git log, in story order, with real dates', () => {
    const { container } = renderWithLang(<TerminalStory />);
    expect(text(document.querySelector('#origins .term-cmd'))).toBe(`$ ${CMD.log}`);
    const expected = GIT_LOG_CHAPTERS.flatMap((chapter) =>
      jobsChronological().filter((job) => job.chapter === chapter),
    );
    const entries = [...container.querySelectorAll<HTMLElement>('.term-commit[data-job]')];
    expect(entries.map((el) => el.dataset.job)).toEqual(expected.map((job) => job.id));
    for (const job of expected) {
      const entry = container.querySelector(`#job-${job.id}`);
      expect(entry?.closest('[data-chapter]')?.id).toBe(job.chapter);
      const dates = [...(entry?.querySelectorAll('time') ?? [])].map((t) => t.dateTime);
      expect(dates).toEqual([isoMonth(job.start), job.end ? isoMonth(job.end) : '']);
    }
    // The first entry, exactly as storyboarded, with the highlights as the commit body.
    const novus = container.querySelector('#job-novus');
    expect(text(novus?.querySelector('h3'))).toBe('Novus Automação (2019-10 – 2021-10)');
    expect(text(novus?.querySelector('.term-commit__role'))).toBe(
      'Role: Intern / Tester / Developer',
    );
    expect([...(novus?.querySelectorAll('.term-commit__body li') ?? [])].map(text)).toEqual(
      cv.jobs.find((job) => job.id === 'novus')?.highlights.map((h) => h.en),
    );
  });

  it('marks the degree with the v1.0.0 tag and its date', () => {
    const { container } = renderWithLang(<TerminalStory />);
    const tag = container.querySelector('#origins [data-education="computer-science"]');
    expect(text(tag)).toBe(
      "(tag: v1.0.0) Bachelor's in Computer Science · UniRitter (Laureate International Universities) (2022-06)",
    );
  });

  it('uses the storyboarded commit types, the kiosk commit and the ops log', () => {
    const { container } = renderWithLang(<TerminalStory />);
    const subject = (id: string) => text(container.querySelector(`#job-${id} h3`));
    expect(subject('atos-bradesco')).toBe('feat(bradesco): ATOS · Bradesco (2021-11 – 2023-01)');
    expect(subject('atos-frontend')).toBe('feat(frontend): ATOS (2023-01 – 2023-06)');
    expect(subject('atos-cpfl')).toBe('feat(cpfl): ATOS · CPFL (2023-06 – 2024-10)');
    expect(text(container.querySelector('#job-atos-cpfl .term-commit__subject--extra'))).toBe(
      'feat(kiosk): Xamarin kiosk app',
    );
    expect(subject('atos-cemig-cpfl')).toBe(
      'ops(cemig/cpfl): ATOS · CEMIG / CPFL (2025-10 – 2026-03)',
    );
    const ops = [...container.querySelectorAll('#job-atos-cemig-cpfl .term-ops li')].map(text);
    expect(ops).toEqual([
      'support: development team',
      'maintain: production servers, processing queues',
      'review code',
      'oversee deploy: test',
      'oversee deploy: production',
      'keep critical systems stable',
    ]);
    // Facts rule: no numbers or timestamps in the log.
    for (const line of ops) expect(line).not.toMatch(/\d/);
    // The log is code; assistive tech gets the CV highlights themselves instead.
    const cemig = container.querySelector('#job-atos-cemig-cpfl');
    expect(cemig?.querySelector('.term-ops')).toHaveAttribute('aria-hidden', 'true');
    expect([...(cemig?.querySelectorAll('.visually-hidden li') ?? [])].map(text)).toEqual(
      cv.jobs.find((job) => job.id === 'atos-cemig-cpfl')?.highlights.map((h) => h.en),
    );
    expect(Object.keys(OPS_LOG)).toEqual(['atos-cemig-cpfl']);
  });

  it('shows Breadth as a split editor with the two storyboarded tabs', () => {
    const { container } = renderWithLang(<TerminalStory />);
    const panes = [...container.querySelectorAll<HTMLElement>('#breadth .term-pane')];
    expect(panes.map((pane) => pane.dataset.job)).toEqual(['atos-sodexo', 'atos-alphaville']);
    expect(panes.map((pane) => text(pane.querySelector('.term-pane__tab')))).toEqual([
      'sodexo.mendix',
      'alphaville/legacy-backend',
    ]);
    expect(text(panes[0]?.querySelector('h3'))).toBe('// ATOS · Sodexo (2024-10 – 2025-01)');
  });

  it('tails the current job with exactly one incident pair and the stack line', () => {
    const { container } = renderWithLang(<TerminalStory />);
    const now = container.querySelector('#now');
    expect(now).toHaveAttribute('aria-label', 'Now');
    expect(screen.getByRole('heading', { level: 2, name: 'Now' })).toBeInTheDocument();
    expect(text(now?.querySelector('.term-cmd'))).toBe(`$ ${CMD.tail}`);
    const entry = now?.querySelector('#job-semantix');
    expect(text(entry?.querySelector('h3'))).toBe(
      'SEMANTIX (formerly ATOS) · VCIMENTOS / VPAR, CBA, Votorantim',
    );
    expect(text(entry?.querySelector('.term-now__period'))).toBe('Mar 2026 – Present');
    expect(now?.querySelectorAll('.term-incident')).toHaveLength(1);
    expect(now?.querySelectorAll('.term-resolved')).toHaveLength(1);
    const lines = [...(now?.querySelectorAll('.term-log__line') ?? [])].map(text);
    expect(lines).toEqual([
      'Develop and support applications using React, TypeScript, JavaScript (Angular), and C# in a team serving corporate clients.',
      '[INCIDENT][RESOLVED] Respond rapidly to incidents and work with SQL Server databases.',
      'Fix and optimize legacy systems, kiosks, and client applications in the cargo, trucks, and cement sector.',
      STACK_LINE,
    ]);
    // Every log line is scrubbed by the pinned window; the title and period are not.
    expect(now?.querySelectorAll('.term-log [data-scrub]')).toHaveLength(4);
    expect(now?.querySelectorAll('[data-scrub]')).toHaveLength(4);
  });

  it('checks out the AI branch with a TODO list in progress and deploys to the future', () => {
    const { container } = renderWithLang(<TerminalStory />);
    const next = container.querySelector('#next');
    const commands = [...(next?.querySelectorAll('.term-cmd:not(.term-cmd--idle)') ?? [])];
    expect(commands.map(text)).toEqual([`$ ${CMD.checkout}`, `$ ${CMD.deploy}`]);
    const course = cv.education.find((entry) => entry.id === 'ai-engineering');
    expect(text(next?.querySelector('.term-branch__title'))).toBe(
      `${course?.title.en ?? ''} · ${course?.institution ?? ''}`,
    );
    const todo = [...(next?.querySelectorAll('.term-todo li') ?? [])].map(text);
    expect(todo).toEqual((course?.topics ?? []).map((topic) => `[ ] ${topic.en} In progress`));
    expect(text(next?.querySelector('.term-deploy__label'))).toBe(en.terminal.deploying);
    const track = next?.querySelector('.term-deploy__track');
    expect(track).toHaveAttribute('aria-hidden', 'true');
    expect(track?.querySelector('.term-deploy__fill')).not.toBeNull();
  });

  it('prints a grep result right below the chips, then ls certs/ and locale', async () => {
    const user = userEvent.setup();
    const { container } = renderWithLang(<TerminalStory />);
    const toolbox = container.querySelector<HTMLElement>('#toolbox');
    expect(text(toolbox?.querySelector('.term-cmd'))).toBe(`$ ${CMD.man}`);
    await user.click(screen.getByRole('button', { name: 'Xamarin' }));
    const result = toolbox?.querySelector('.skills__result');
    expect(result).toHaveAttribute('aria-live', 'polite');
    // The live region comes right after the last group of chips.
    expect(result?.previousElementSibling).toHaveClass('skills__group');
    expect(
      within(result as HTMLElement).getByRole('link', { name: 'ATOS · CPFL' }),
    ).toHaveAttribute('href', '#job-atos-cpfl');
    expect(container.querySelector('#job-atos-cpfl')).not.toBeNull();

    expect(
      screen.getByRole('heading', { name: named(`${CMD.certs} ${en.story.certifications}`) }),
    ).toBeInTheDocument();
    for (const cert of cv.certifications) {
      const line = text(container.querySelector(`[data-cert="${cert.id}"]`));
      expect(line).toBe(
        cert.hours === undefined ? cert.title.en : `${cert.title.en} ${String(cert.hours)} hours`,
      );
    }
    expect(
      screen.getByRole('heading', { name: named(`${CMD.locale} ${en.story.spokenLanguages}`) }),
    ).toBeInTheDocument();
    expect([...container.querySelectorAll('.term-locale li')].map(text)).toEqual([
      'Portuguese: Native',
      'English: Fluent',
      'Spanish: Basic',
    ]);
  });

  it('runs ./contact.sh with links whose names contain the command and the label', () => {
    renderWithLang(<TerminalStory />);
    expect(text(document.querySelector('#contact .term-cmd'))).toBe(`$ ${CMD.contact}`);
    const linkedin = screen.getByRole('link', {
      name: named(`${LINK_CMD.linkedin} · ${en.terminal.openLinkedIn} ${en.a11y.opensInNewTab}`),
    });
    expect(linkedin).toHaveAttribute('href', cv.identity.links.linkedin);
    expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer');
    expect(
      screen.getByRole('link', {
        name: named(`${LINK_CMD.github} · ${en.terminal.openGitHub} ${en.a11y.opensInNewTab}`),
      }),
    ).toHaveAttribute('href', cv.identity.links.github);
    // Their command comes from terminal.css (checked in code.test.ts).
    expect(screen.getByRole('link', { name: en.contact.downloadCv }).parentElement).toHaveClass(
      'term-contact__cv',
    );
    expect(screen.getByRole('button', { name: en.contact.revealEmail }).parentElement).toHaveClass(
      'term-contact__email',
    );
    expect(screen.getByRole('form', { name: en.contact.form.legend })).toBeInTheDocument();
  });

  it('keeps commands in English and translates descriptions in Portuguese', () => {
    const { container } = renderWithLang(<TerminalStory />, 'pt');
    expect(text(container.querySelector('#origins .term-cmd'))).toBe(`$ ${CMD.log}`);
    expect(screen.getByText(ptBR.terminal.motd)).toBeInTheDocument();
    expect(screen.getByText(ptBR.terminal.deploying)).toBeInTheDocument();
    expect(text(container.querySelector('#job-novus .term-commit__body li'))).toBe(
      cv.jobs.find((job) => job.id === 'novus')?.highlights[0]?.pt,
    );
    expect(text(container.querySelector('#job-atos-cpfl h3'))).toBe(
      'feat(cpfl): ATOS · CPFL (2023-06 – 2024-10)',
    );
    expect(container.querySelector('.term-ops')).toHaveAttribute('lang', 'en');
    for (const code of container.querySelectorAll('code')) {
      expect(code).toHaveAttribute('lang', 'en');
    }
    expect(text(container.querySelector('.term-now__period'))).toBe('mar. 2026 – Atual');
    expect(
      screen.getByRole('link', {
        name: named(
          `${LINK_CMD.linkedin} · ${ptBR.terminal.openLinkedIn} ${ptBR.a11y.opensInNewTab}`,
        ),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: named(`${LINK_CMD.github} · ${ptBR.terminal.openGitHub} ${ptBR.a11y.opensInNewTab}`),
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.term-todo__status')[0]).toHaveTextContent(
      ptBR.story.inProgress,
    );
  });

  it('decorations stay out of the accessibility tree', () => {
    const { container } = renderWithLang(<TerminalStory />);
    for (const el of container.querySelectorAll(
      '.term-window__bar, .term-prompt, .term-arrow__icon, .term-todo__box, .term-cmd--idle',
    )) {
      expect(el.closest('[aria-hidden="true"]'), el.className).not.toBeNull();
    }
  });

  it('keeps every line static and visible under reduced motion', () => {
    const { container } = renderWithLang(<TerminalStory />);
    const lines = container.querySelectorAll<HTMLElement>('.term-line, .term-deploy__fill');
    expect(lines.length).toBeGreaterThan(40);
    for (const el of lines) {
      expect(el.style.opacity).toBe('');
      expect(el.style.transform).toBe('');
    }
    expect(container.querySelector('.pin-spacer')).toBeNull();
  });

  // jsdom computes styles slowly for the hundred lines the scene hides; see scene.test.tsx.
  it(
    'loads the scroll scene only when motion is allowed, and reverts it on unmount',
    { timeout: 20_000 },
    async () => {
      setReducedMotion(false);
      // Every line below the fold, so the scene has something to reveal.
      stubRects((el) => ({ top: el.classList.contains('term-line') ? 5000 : 0 }));
      const { container, unmount } = renderWithLang(<TerminalStory />);
      const line = container.querySelector<HTMLElement>('#job-novus .term-line');
      const boot = container.querySelector<HTMLElement>('#hook .term-line');
      await waitFor(() => {
        expect(line?.style.opacity).toBe('0');
      });
      // The boot screen is a CSS animation on first paint; the scene never touches it.
      expect(boot?.style.opacity).toBe('');
      unmount();
      expect(line?.style.opacity).toBe('');
      expect(line?.style.transform).toBe('');
    },
  );
});
