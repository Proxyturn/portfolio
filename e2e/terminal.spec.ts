import { expect, test, type Page } from '@playwright/test';
import { jobsChronological } from '../src/content/selectors';
import type { YearMonth } from '../src/content/types';
import { cv, scrollThroughStory, visit } from './helpers';

/** Terminal / code world concept checks (concept/terminal branch). */

const iso = (d: YearMonth) => `${d.year}-${String(d.month).padStart(2, '0')}`;

/** Waits until the lazy scroll scene has run (it drives the deploy bar from the start). */
async function sceneReady(page: Page) {
  await expect(page.locator('.term-deploy__fill')).toHaveAttribute('style', /transform/);
}

const top = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => el.getBoundingClientRect().top);

/** Opacity of every scrubbed log line in the "Now" window. */
const scrubbed = (page: Page) =>
  page
    .locator('[data-now-stage] [data-scrub]')
    .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

async function scrollByPx(page: Page, px: number) {
  await page.evaluate((value) => {
    window.scrollBy({ top: value, behavior: 'instant' });
  }, px);
}

test('every job is in the story in order, the git log with its real dates', async ({ page }) => {
  await visit(page);
  const expected = cv.chapters.flatMap((chapter) =>
    jobsChronological().filter((job) => job.chapter === chapter.id),
  );
  const order = await page
    .locator('[data-job]')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.job));
  expect(order).toEqual(expected.map((job) => job.id));

  await expect(page.locator('#origins .term-cmd').first()).toHaveText('$ git log career');
  for (const job of expected.filter((j) =>
    ['origins', 'enterprise', 'energy'].includes(j.chapter),
  )) {
    const entry = page.locator(`#job-${job.id}`);
    await expect(entry).toHaveClass(/term-commit/);
    const times = entry.locator('h3 time');
    await expect(times).toHaveText([iso(job.start), ...(job.end ? [iso(job.end)] : [])]);
    await expect(times.first()).toHaveAttribute('datetime', iso(job.start));
  }
  await expect(page.locator('#job-novus h3')).toContainText('Novus Automação (2019-10');
  await expect(page.locator('[data-education="computer-science"]')).toContainText('(tag: v1.0.0)');
  await expect(page.locator('[data-education="computer-science"] time')).toHaveText('2022-06');
});

test.describe('the pinned "Now" window', () => {
  test('desktop: a nav jump lands at the top, the log scrubs, then the window releases', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'There is no pin below 768 px.');
    await visit(page);
    await page.evaluate(() => document.fonts.ready);
    await sceneReady(page);
    const stage = page.locator('[data-now-stage]');
    await expect(stage.locator('xpath=..')).toHaveClass(/pin-spacer/);

    const nav = page.getByRole('navigation', { name: 'Chapters' });
    const margin = await page
      .locator('#now')
      .evaluate((el) => parseFloat(getComputedStyle(el).scrollMarginTop));
    expect(margin).toBeGreaterThan(0);
    const landedAtTop = async () => {
      await expect.poll(() => top(page, '#now')).toBeCloseTo(margin, 0);
      await expect(page.locator('#now-title')).toBeInViewport();
      // The very start of the pin: no log line scrubbed in yet.
      await expect.poll(async () => Math.max(...(await scrubbed(page)))).toBeLessThan(0.05);
    };

    await nav.getByRole('link', { name: 'Now' }).click();
    await landedAtTop();

    // Halfway through the pin the window has not moved, and part of the log is in.
    const pinnedAt = await top(page, '[data-now-stage]');
    const distance = await page.evaluate(() => window.innerHeight * 1.2);
    await scrollByPx(page, distance / 2);
    await expect.poll(() => top(page, '[data-now-stage]')).toBeCloseTo(pinnedAt, 0);
    const half = await scrubbed(page);
    expect(half[0]).toBe(1);
    expect(half.at(-1)).toBeLessThan(1);

    // Past the end it releases and scrolls away with the page, with the whole log shown.
    await scrollByPx(page, distance);
    await expect.poll(() => top(page, '[data-now-stage]')).toBeLessThan(pinnedAt - 100);
    expect(await scrubbed(page)).toEqual([1, 1, 1, 1]);

    // A jump back from further down lands at the top of the pinned section again.
    await nav.getByRole('link', { name: 'Contact' }).click();
    await expect(page.locator('#contact h2')).toBeInViewport();
    await nav.getByRole('link', { name: 'Now' }).click();
    await landedAtTop();
  });

  test('mobile: no pin, the output simply scrolls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Below 768 px only.');
    await visit(page);
    await sceneReady(page);
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await page.locator('#now').scrollIntoViewIfNeeded();
    const before = await top(page, '[data-now-stage]');
    await scrollByPx(page, 200);
    await expect.poll(() => top(page, '[data-now-stage]')).toBeCloseTo(before - 200, 0);
  });
});

test('the deploy bar fills with the scroll (scaleX)', async ({ page }) => {
  await visit(page);
  await sceneReady(page);
  const fill = page.locator('.term-deploy__fill');
  const scale = () =>
    fill.evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return { x: m.a, y: m.d };
    });
  await expect.poll(async () => (await scale()).x).toBeLessThan(0.01);

  // Track at 60% of the viewport: the scrub (90% → 35%) is about halfway.
  await page.evaluate(() => {
    const track = document.querySelector('.term-deploy__track');
    if (!track) return;
    const y = track.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.6;
    window.scrollTo({ top: y, behavior: 'instant' });
  });
  await expect.poll(async () => (await scale()).x).toBeGreaterThan(0.3);
  expect((await scale()).x).toBeLessThan(0.8);
  expect((await scale()).y).toBe(1);

  await scrollThroughStory(page);
  await expect.poll(async () => (await scale()).x).toBe(1);
});

test('cursors blink only while lines reveal, and are solid within 5 seconds', async ({ page }) => {
  await visit(page);
  // The boot cursor: a CSS animation of at most 3 blinks, done well under 5 s.
  const boot = page.locator('#hook .term-cursor');
  const timing = await boot.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      name: s.animationName,
      end:
        parseFloat(s.animationDelay) +
        parseFloat(s.animationDuration) * Number(s.animationIterationCount),
    };
  });
  expect(timing.name).toBe('term-blink');
  expect(timing.end).toBeLessThan(5);
  await expect
    .poll(() => boot.evaluate((el) => el.getAnimations().length), { timeout: 5_000 })
    .toBe(0);
  await expect(boot).toHaveCSS('opacity', '1');

  // A window further down blinks when its lines reveal, then stops.
  await sceneReady(page);
  const samples = await page.evaluate(async () => {
    const cursor = document.querySelector('#energy .term-cursor');
    document.getElementById('energy')?.scrollIntoView({ behavior: 'instant' });
    const start = performance.now();
    const out: [number, string][] = [];
    while (cursor && performance.now() - start < 5000) {
      out.push([performance.now() - start, getComputedStyle(cursor).opacity]);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return out;
  });
  const off = samples.filter(([, opacity]) => opacity === '0').map(([t]) => t);
  expect(off.length).toBeGreaterThan(0);
  expect(Math.max(...off)).toBeLessThan(3000);
  expect(samples.filter(([t]) => t > 3000).every(([, opacity]) => opacity === '1')).toBe(true);
});

test('nothing focusable is ever transparent', async ({ page }) => {
  const hiddenFocusables = () =>
    page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'a[href], button, input:not([tabindex="-1"]), textarea, [tabindex="0"]',
        ),
      ]
        .filter((el) => {
          let opacity = 1;
          for (let n: HTMLElement | null = el; n; n = n.parentElement) {
            opacity *= Number(getComputedStyle(n).opacity);
          }
          return opacity < 1;
        })
        .map((el) => el.textContent),
    );
  await visit(page);
  expect(await hiddenFocusables()).toEqual([]);
  await scrollThroughStory(page);
  expect(await hiddenFocusables()).toEqual([]);
});

test('every link and chip names the command and the label it shows', async ({ page }) => {
  await visit(page);
  const contact = page.locator('#contact');
  await expect(contact.locator('.term-cmd').first()).toHaveText('$ ./contact.sh');
  await expect(contact.getByRole('link', { name: /^open linkedin/ })).toHaveAccessibleName(
    'open linkedin · Open LinkedIn (opens in a new tab)',
  );
  await expect(contact.getByRole('link', { name: /^open github/ })).toHaveAccessibleName(
    'open github · Open GitHub (opens in a new tab)',
  );
  await expect(contact.getByRole('link', { name: /Download CV/ })).toHaveAccessibleName(
    'curl -O cv.pdf · Download CV (PDF)',
  );
  await expect(contact.getByRole('button', { name: /Show email/ })).toHaveAccessibleName(
    'reveal email · Show email address',
  );
  await expect(page.getByRole('button', { name: 'Xamarin' })).toHaveAccessibleName('grep Xamarin');

  // In general: what is shown (text plus generated content) is part of the name.
  const controls = page.locator('#contact .contact__links :is(a, button), .skills__chip');
  for (const control of await controls.all()) {
    const visible = await control.evaluate((el) => {
      const before = getComputedStyle(el, '::before').content;
      const prefix = /^"(.*)"$/.exec(before)?.[1] ?? '';
      // The text a sighted visitor reads: without the visually hidden "(opens in a new tab)".
      const shown = el.cloneNode(true) as HTMLElement;
      shown.querySelectorAll('.visually-hidden').forEach((hidden) => {
        hidden.remove();
      });
      return `${prefix}${shown.textContent}`.replace(/\s+/g, ' ').trim();
    });
    const escaped = visible.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(control).toHaveAccessibleName(new RegExp(escaped));
  }
});

test('the grep result prints right below the chips', async ({ page }) => {
  await visit(page);
  await page.getByRole('button', { name: 'Xamarin' }).click();
  const result = page.locator('#toolbox .skills__result[aria-live="polite"]');
  await expect(result.getByRole('link', { name: 'ATOS · CPFL' })).toHaveAttribute(
    'href',
    '#job-atos-cpfl',
  );
  const gap = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('#toolbox .skills__chip')];
    const lastChip = chips.at(-1)?.getBoundingClientRect();
    const box = document.querySelector('#toolbox .skills__result')?.getBoundingClientRect();
    return lastChip && box ? box.top - lastChip.bottom : Infinity;
  });
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThan(40);
});

test('only the Latin subsets of the two approved fonts are downloaded', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fonts.push(new URL(request.url()).pathname);
  });
  await visit(page);
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.fonts.check('700 16px "JetBrains Mono Variable"') &&
          document.fonts.check('400 16px "IBM Plex Sans Variable"'),
      ),
    )
    .toBe(true);
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) {
    expect(font).toMatch(
      /\/assets\/(jetbrains-mono|ibm-plex-sans)-latin-wght-normal-[\w-]+\.woff2$/,
    );
  }
});

test('scrolling ahead of a slow scene download never leaves content hidden', async ({ page }) => {
  // Hold the lazy scene chunk back until the visitor has already scrolled to the toolbox.
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/assets\/scene-[\w-]+\.js$/, async (route) => {
    await held;
    await route.continue();
  });
  // Firefox delays the `load` event until the held chunk arrives, so wait for the DOM only.
  await page.addInitScript(() => {
    window.localStorage.setItem('portfolio.lang', 'en');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-chapter="hook"]')).toBeVisible();
  await page.locator('#toolbox').scrollIntoViewIfNeeded();
  release();
  await sceneReady(page);
  // The boot screen's own first-paint animation (under 1 s) has run its course.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState === 'finished'),
  );
  // Lines above the reveal line (90% of the viewport): never hidden. Lines that were below the
  // fold when the scene loaded wait for their trigger at 90%, like on a normal visit.
  const hidden = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.reveal')]
        .filter((el) => el.getBoundingClientRect().top < window.innerHeight * 0.9)
        .filter((el) => getComputedStyle(el).opacity !== '1')
        .map((el) => el.textContent),
    );
  expect(await hidden()).toEqual([]);
  // "Now" is already above: it is not pinned (no layout jump) and its log is not hidden.
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  // Scrolling back up does not hide or replay anything either.
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(200);
  expect(await hidden()).toEqual([]);
  // And the lines below the toolbox still reveal on the way down.
  await scrollThroughStory(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          [...document.querySelectorAll<HTMLElement>('.reveal')].filter(
            (el) => getComputedStyle(el).opacity !== '1',
          ).length,
      ),
    )
    .toBe(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('everything is shown at once: no transforms, no pin, no blinking', async ({ page }) => {
    await visit(page);
    await page.waitForTimeout(300);
    const moved = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.term-line, .term-deploy__fill, .term-cursor')]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.opacity !== '1' || s.transform !== 'none' || el.style.cssText !== '';
        })
        .map((el) => el.className),
    );
    expect(moved).toEqual([]);
    // No CSS animations at all. (global.css shortens transitions to 0.01 ms instead of removing
    // them, so WebKit can still list a color transition from the theme switch on load.)
    expect(
      await page.evaluate(() =>
        document.getAnimations().filter((a) => !(a instanceof CSSTransition)),
      ),
    ).toHaveLength(0);
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    for (const job of cv.jobs) {
      await expect(page.locator(`[data-job="${job.id}"]`)).toBeVisible();
    }
    // The deploy is complete and the "Now" log is all there.
    await expect(page.locator('.term-deploy__fill')).toHaveCSS('transform', 'none');
    expect(await scrubbed(page)).toEqual([1, 1, 1, 1]);
  });
});

/* ---------------------------------------------------------------------------------------- */
/* Contrast of the computed theme colors (WCAG 2.x)                                         */
/* ---------------------------------------------------------------------------------------- */

type Rgb = readonly [number, number, number];

function parseColor(value: string): Rgb {
  const v = value.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  const hex = short
    ? short
        .slice(1, 4)
        .map((c) => c + c)
        .join('')
    : /^#([0-9a-f]{6})$/.exec(v)?.[1];
  if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  throw new Error(`Unparsed color: ${value}`);
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(parseColor(a)), luminance(parseColor(b))].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

const TOKENS = [
  '--color-bg',
  '--color-surface',
  '--color-text',
  '--color-text-muted',
  '--color-accent',
  '--color-accent-contrast',
  '--color-border',
  '--color-focus',
  '--color-danger',
  '--color-success',
  '--term-warn',
  '--term-info',
] as const;
type Token = (typeof TOKENS)[number];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} OS color scheme`, () => {
    test.use({ colorScheme: scheme });

    test(`the dark terminal palette applies and meets WCAG contrast (${scheme})`, async ({
      page,
    }) => {
      await visit(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'terminal');
      const t = await page.evaluate((names) => {
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
      }, TOKENS);
      const get = (name: Token) => t[name] ?? '';

      // Dark only: the same palette whatever the OS prefers, never the base light/dark one.
      expect(get('--color-bg').toLowerCase()).toBe('#0b0f0c');
      expect(get('--color-surface').toLowerCase()).toBe('#111814');
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
      ).toBe('dark');
      const body = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(ratio(body, get('--color-bg'))).toBeCloseTo(1, 5);
      // The panel behind every window is the surface token.
      const panel = await page
        .locator('.term-window')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(ratio(panel, get('--color-surface'))).toBeCloseTo(1, 5);

      const failures: string[] = [];
      const check = (fg: Token, bg: Token, min: number) => {
        const r = ratio(get(fg), get(bg));
        if (r < min) failures.push(`${fg} on ${bg}: ${r.toFixed(2)} < ${min}`);
      };
      for (const bg of ['--color-bg', '--color-surface'] as const) {
        for (const fg of [
          '--color-text',
          '--color-text-muted',
          '--color-accent',
          '--color-danger',
          '--color-success',
          '--term-warn',
          '--term-info',
        ] as const) {
          check(fg, bg, 4.5);
        }
        check('--color-focus', bg, 3);
        check('--color-border', bg, 3);
      }
      // Text on accent-filled buttons, the pressed grep chip and the active chapter link.
      check('--color-accent-contrast', '--color-accent', 4.5);
      expect(failures).toEqual([]);
    });
  });
}
