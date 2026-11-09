import { expect, test, type Page } from '@playwright/test';
import { cv, scrollThroughStory, visit } from './helpers';

/** Journey / road trip concept checks (concept/journey branch). */

/** Distance in px from each road anchor to the nearest drawn road (route, fork or road ahead). */
async function anchorDistances(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg[data-road]');
    if (!svg) return null;
    const box = svg.getBoundingClientRect();
    const paths = [
      ...svg.querySelectorAll<SVGPathElement>(
        '#journey-route, .journey-road__fork, .journey-road__ahead--horizon',
      ),
    ];
    const samples = paths.flatMap((path) => {
      const length = path.getTotalLength();
      return Array.from({ length: 801 }, (_, i) => path.getPointAtLength((length * i) / 800));
    });
    return [...document.querySelectorAll<HTMLElement>('[data-road-point]')].map((el) => {
      const r = el.getBoundingClientRect();
      const x = r.left - box.left;
      const y = r.top - box.top;
      const d = Math.min(...samples.map((p) => Math.hypot(p.x - x, p.y - y)));
      return { id: el.dataset.roadPoint ?? '', d };
    });
  });
}

test('the road SVG renders and passes through every stop', async ({ page }, testInfo) => {
  await visit(page);
  const svg = page.locator('svg[data-road]');
  await expect(svg).toBeAttached();
  await expect(svg).toHaveAttribute('aria-hidden', 'true');
  const route = page.locator('#journey-route');
  await expect(route).toHaveAttribute('d', /^M[\d.]+ [\d.]+ C/);

  const stats = await route.evaluate((el) => {
    const path = el as SVGPathElement;
    const box = path.getBBox();
    return { length: path.getTotalLength(), width: box.width, height: box.height };
  });
  expect(stats.length).toBeGreaterThan(1000);
  expect(stats.height).toBeGreaterThan(1000);
  if (testInfo.project.name === 'mobile') {
    // A straight line along the left edge.
    expect(stats.width).toBeLessThan(1);
  } else {
    // A zigzag between the two lanes.
    expect(stats.width).toBeGreaterThan(60);
  }

  // Every job in the CV has a pin, and the road reaches every pin.
  for (const job of cv.jobs) {
    await expect(page.locator(`[data-job="${job.id}"] [data-road-point="${job.id}"]`)).toHaveCount(
      1,
    );
  }
  // The road is re-measured when web fonts swap in, so wait for the settled layout.
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(async () => {
      const distances = await anchorDistances(page);
      expect(distances?.length).toBe(cv.jobs.length + 5); // + 4 AI signposts + the destination
      return (distances ?? []).filter(({ d }) => d >= 3).map(({ id, d }) => `${id}: ${d}`);
    })
    .toEqual([]);
});

test('the road draws itself on scroll and the traveler drives to "You are here"', async ({
  page,
}) => {
  await visit(page);
  const mask = page.locator('.journey-road__reveal');
  // Elements inside <mask> have no layout box, so read the Y scale from the transform matrix.
  const scale = () =>
    mask.evaluate((el) => {
      const m = /^matrix\(1,0,0,([\d.e-]+),0,0\)$/.exec(el.getAttribute('transform') ?? '');
      return m ? Number(m[1]) : NaN;
    });
  // How far down the road layer the mask reaches, compared with where the road ends.
  const drawn = async () => {
    const s = await scale();
    return page.evaluate((value) => {
      const svg = document.querySelector('svg[data-road]')?.getBoundingClientRect();
      const end = document.querySelector('.journey-destination [data-road-point]');
      if (!svg || !end) return NaN;
      return (value * svg.height) / (end.getBoundingClientRect().top - svg.top);
    }, s);
  };
  // At the top only the start of the story is uncovered; the road (from Origins on) is not.
  await expect.poll(scale).toBeLessThan(0.1);
  expect(await drawn()).toBeLessThan(0.5);

  // Scrubbed with the scroll: by the end the whole road, up to the destination, is drawn.
  await scrollThroughStory(page);
  await expect.poll(drawn, { timeout: 5_000 }).toBeGreaterThan(1);

  // The traveler ends at the "You are here" pin.
  const gap = await page.evaluate(() => {
    const dot = document.querySelector('.journey-traveler__dot')?.getBoundingClientRect();
    const here = document.querySelector('[data-here]')?.getBoundingClientRect();
    if (!dot || !here) return Infinity;
    return Math.hypot(dot.left + dot.width / 2 - here.left, dot.top + dot.height / 2 - here.top);
  });
  expect(gap).toBeLessThan(4);

  // The road ahead has crossfaded to the dotted horizon layer.
  await expect(page.locator('.journey-road__ahead--horizon')).toHaveCSS('opacity', '1');
  await expect(page.locator('.journey-road__ahead--day')).toHaveCSS('opacity', '0');
});

test('the "You are here" pin pulses three times, under 5 seconds in total', async ({ page }) => {
  await visit(page);
  const here = page.locator('[data-here]');
  await expect(here).not.toHaveClass(/is-pulsing/);
  await here.scrollIntoViewIfNeeded();
  await expect(here).toHaveClass(/is-pulsing/);
  const timing = await here.locator('.journey-pin__pulse').evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      name: s.animationName,
      duration: parseFloat(s.animationDuration),
      count: Number(s.animationIterationCount),
    };
  });
  expect(timing.name).toBe('journey-pulse');
  expect(timing.count).toBe(3);
  expect(timing.duration * timing.count).toBeLessThan(5);
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

test('scrolling ahead of a slow scene download never leaves stops hidden', async ({ page }) => {
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
  // The scene has run once it drives the road mask.
  await expect(page.locator('.journey-road__reveal')).toHaveAttribute('transform', /matrix/);
  const hidden = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLElement>('.reveal')].filter(
        (el) => getComputedStyle(el).opacity !== '1',
      ).length,
  );
  expect(hidden).toBe(0);
  // Scrolling back up does not hide or replay anything either.
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(200);
  await expect(page.locator('.journey-card').first()).toHaveCSS('opacity', '1');
});

test('choosing a luggage tag highlights its stops and writes the result as text', async ({
  page,
}) => {
  await visit(page);
  await page.getByRole('button', { name: 'Xamarin' }).click();
  await expect(page.locator('.journey-miniroute [data-match="true"]')).toHaveCount(1);
  await expect(page.locator('.journey-miniroute [data-stop-id="atos-cpfl"]')).toHaveAttribute(
    'data-match',
    'true',
  );
  await expect(
    page.locator('.skills__result[aria-live="polite"]').getByRole('link', { name: 'ATOS · CPFL' }),
  ).toBeVisible();
});

test('the CV download area is labelled "Take the map with you"', async ({ page }) => {
  await visit(page);
  const group = page.getByRole('group', { name: 'Take the map with you' });
  await expect(group.getByRole('link', { name: 'Download CV (PDF)', exact: true })).toBeVisible();
});

test('only the Latin subsets of the two approved fonts are downloaded', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fonts.push(new URL(request.url()).pathname);
  });
  await visit(page);
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('600 16px "Fraunces Variable"')))
    .toBe(true);
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) {
    expect(font).toMatch(/\/assets\/(fraunces|source-sans-3)-latin-wght-normal-[\w-]+\.woff2$/);
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every stop is visible at full opacity with no transforms, and the map is finished', async ({
    page,
  }) => {
    await visit(page);
    const moved = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-stop], .journey-pin, .journey-card')]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.opacity !== '1' || s.transform !== 'none';
        })
        .map((el) => el.className),
    );
    expect(moved).toEqual([]);
    // No parallax either: the terrain layers stay put (they are faint by design, not hidden).
    const drifted = await page.evaluate(() =>
      [...document.querySelectorAll<SVGElement>('.journey-terrain__layer')].filter(
        (el) => getComputedStyle(el).transform !== 'none',
      ),
    );
    expect(drifted).toHaveLength(0);
    for (const job of cv.jobs) {
      await expect(page.locator(`[data-job="${job.id}"]`)).toBeVisible();
    }
    // Road fully drawn (mask not scaled), road ahead already dotted blue, no pulse.
    await expect(page.locator('.journey-road__reveal')).not.toHaveAttribute('transform', /./);
    await expect(page.locator('.journey-road__ahead--horizon')).toHaveCSS('opacity', '1');
    await page.locator('[data-here]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-here]')).not.toHaveClass(/is-pulsing/);
    await expect(page.locator('.journey-pin__pulse')).toHaveCSS('animation-name', 'none');
  });
});

/* ---------------------------------------------------------------------------------------- */
/* Contrast of the computed theme colors (WCAG 2.x)                                         */
/* ---------------------------------------------------------------------------------------- */

type Rgb = readonly [number, number, number];

function parseColor(value: string): Rgb {
  const v = value.trim().toLowerCase();
  // The CSS minifier may shorten #ffffff to #fff.
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
  '--journey-terrain',
  '--journey-horizon',
] as const;

const EXPECTED_BG = { light: '#f4ede0', dark: '#1c1a17' } as const;

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} color scheme`, () => {
    test.use({ colorScheme: scheme });

    test(`theme colors meet WCAG contrast (${scheme})`, async ({ page }) => {
      await visit(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'journey');
      const t = await page.evaluate((names) => {
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
      }, TOKENS);
      const get = (name: (typeof TOKENS)[number]) => t[name] ?? '';

      // The Journey palette (not the base dark override) is what applies.
      expect(get('--color-bg').toLowerCase()).toBe(EXPECTED_BG[scheme]);
      const body = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(ratio(body, get('--color-bg'))).toBeCloseTo(1, 5);

      const failures: string[] = [];
      const check = (fg: string, bg: string, min: number) => {
        const r = ratio(get(fg as (typeof TOKENS)[number]), get(bg as (typeof TOKENS)[number]));
        if (r < min) failures.push(`${fg} on ${bg}: ${r.toFixed(2)} < ${min}`);
      };
      for (const bg of ['--color-bg', '--color-surface']) {
        // Text: AA 4.5:1.
        for (const fg of [
          '--color-text',
          '--color-text-muted',
          '--color-accent',
          '--color-danger',
          '--color-success',
          '--journey-terrain',
          '--journey-horizon',
        ]) {
          check(fg, bg, 4.5);
        }
        // Focus rings and input borders: 3:1 (WCAG 1.4.11).
        check('--color-focus', bg, 3);
        check('--color-border', bg, 3);
      }
      // Text on accent-filled buttons, the active chapter link and the "You are here" badge.
      check('--color-accent-contrast', '--color-accent', 4.5);
      expect(failures).toEqual([]);
    });
  });
}
