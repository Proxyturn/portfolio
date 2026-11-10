import { expect, test, type Page } from '@playwright/test';
import { cv, visit } from './helpers';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The shared jump behavior (docs/STORYBOARDS.md, "One shared jump behavior"): native hash
 * navigation, focus on the target's heading, and every target landing below the sticky header.
 * Every check polls instead of relying on load-event timing, so it also holds in Firefox.
 */

/** How far the base story's reveal animation moves a card up after it appears. */
const REVEAL_RISE = 26;

interface Landing {
  /** Top of the heading that should have focus, relative to the viewport. */
  readonly headingTop: number;
  /** Bottom of the sticky header, including its progress bar. */
  readonly headerBottom: number;
  /** Target's top minus its scroll margin (0 when it landed exactly). */
  readonly fromMargin: number;
  /** True when the page can't scroll any further (the last targets can't reach the top). */
  readonly atBottom: boolean;
  readonly focused: boolean;
  readonly scrollY: number;
}

/**
 * Waits until scrolling and reveal animations have settled, then measures the landing.
 * The expected focus target is the first h1–h4 with tabindex="-1" inside the target (every
 * jump target in the base story has one), else the target itself. It doesn't reimplement the
 * app's full lookup (h5/h6, untagged headings), which the unit tests cover.
 */
async function settledLanding(page: Page, id: string): Promise<Landing> {
  return page.evaluate(async (targetId) => {
    const target = document.getElementById(targetId);
    if (!target) throw new Error(`No element #${targetId}`);
    const heading =
      target.querySelector<HTMLElement>(
        'h1[tabindex="-1"], h2[tabindex="-1"], h3[tabindex="-1"], h4[tabindex="-1"]',
      ) ?? target;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let last = '';
    let stable = 0;
    for (let i = 0; i < 600 && stable < 10; i++) {
      await frame();
      const now = `${window.scrollY}|${heading.getBoundingClientRect().top}`;
      stable = now === last ? stable + 1 : 0;
      last = now;
    }
    const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
    const progress = document.querySelector('.progress')?.getBoundingClientRect().bottom ?? 0;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop);
    const root = document.documentElement;
    return {
      headingTop: heading.getBoundingClientRect().top,
      headerBottom: Math.max(header, progress),
      fromMargin: target.getBoundingClientRect().top - margin,
      atBottom: window.scrollY + window.innerHeight >= root.scrollHeight - 2,
      focused: document.activeElement === heading,
      scrollY: window.scrollY,
    };
  }, id);
}

async function expectLandedOn(page: Page, id: string) {
  await expect
    .poll(async () => {
      const landing = await settledLanding(page, id);
      return {
        focused: landing.focused,
        belowHeader: landing.headingTop >= landing.headerBottom,
        // Lands at its scroll margin, unless the page can't scroll that far. A card the
        // browser scrolled to while its reveal animation (y: 24px) was still pending then
        // rises by up to that much; the heading must still be below the header.
        atTop: (landing.fromMargin >= -REVEAL_RISE && landing.fromMargin <= 2) || landing.atBottom,
      };
    })
    .toEqual({ focused: true, belowHeader: true, atTop: true });
}

/** A first visit straight to a deep link, in English. */
async function visitDeepLink(page: Page, hash: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem('portfolio.lang', 'en');
  });
  await page.goto(`/${hash}`);
  await expect(page.locator('[data-chapter="hook"]')).toBeAttached();
}

test('chapter navigation updates the URL, lands below the header and focuses the heading', async ({
  page,
}) => {
  await visit(page);
  const nav = page.getByRole('navigation', { name: 'Chapters' });
  for (const [name, id] of [
    ['Energy', 'energy'],
    ['Now', 'now'],
    ['Contact', 'contact'],
  ] as const) {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id} h2`)).toBeFocused();
    await expectLandedOn(page, id);
  }
});

test('a skills explorer result jumps to the job, below the header, with focus', async ({
  page,
}) => {
  await visit(page);
  const skill = cv.skills.find((s) => s.id === 'xamarin');
  const job = cv.jobs.find((j) => j.skills.includes('xamarin'));
  if (!skill || !job) throw new Error('Expected a Xamarin job in the CV.');
  // A concept may show a visible prefix that stays in the accessible name (label in name),
  // such as Terminal's "grep Xamarin". The name must still end with the whole skill name, so
  // "React" could never match a "React Native" chip.
  const chip = page.getByRole('button', {
    name: new RegExp(`(^|\\s)${escapeRegExp(skill.name.en)}$`),
  });
  await expect(chip).toHaveCount(1);
  await chip.click();
  const link = page.locator(`.skills__result a[href="#job-${job.id}"]`);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`#job-${job.id}$`));
  await expect(page.locator(`#job-${job.id} h3`)).toBeFocused();
  await expectLandedOn(page, `job-${job.id}`);
});

for (const id of ['now', 'contact', 'job-atos-bradesco', 'edu-computer-science']) {
  test(`deep link /#${id} lands on its target on load`, async ({ page }) => {
    await visitDeepLink(page, `#${id}`);
    await expectLandedOn(page, id);
  });
}

test('a hash naming a heading inside a chapter lands on the chapter', async ({ page }) => {
  await visitDeepLink(page, '#energy-title');
  await expectLandedOn(page, 'energy');
});

test('reloading a deep link lands on it again', async ({ page }) => {
  await visitDeepLink(page, '#now');
  await expectLandedOn(page, 'now');
  await page.reload();
  await expect(page.locator('#now')).toBeAttached();
  await expectLandedOn(page, 'now');
});

/**
 * Reloading after scrolling away from the hash. Chromium and WebKit try to restore the scroll
 * position before the story has rendered, find the page too short and give up (measured: they
 * end at 0 without the jump code), so the hash wins and the page lands on it. An engine that
 * does restore the position, or has already scrolled to the hash itself (seen in Chromium),
 * leaves scrollY above 0: the jump code then doesn't scroll, but
 * still focuses the hash's heading. Firefox can't run on the development machine, so both
 * outcomes are accepted there.
 */
test('reloading after scrolling away: restored position, or the hash, never the top', async ({
  page,
  browserName,
}) => {
  await visitDeepLink(page, '#now');
  await expectLandedOn(page, 'now');
  const scrolled = await page.evaluate(() => {
    window.scrollTo({ top: window.scrollY + 900, behavior: 'instant' });
    return window.scrollY;
  });
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('#now')).toBeAttached();
  const landing = await settledLanding(page, 'now');
  const restored = Math.abs(landing.scrollY - scrolled) <= 2;
  if (browserName === 'firefox') {
    if (!restored) await expectLandedOn(page, 'now');
    else expect(landing.focused).toBe(true);
  } else {
    await expectLandedOn(page, 'now');
  }
});

test('Back from another page to a deep link lands on it', async ({ page }) => {
  await visitDeepLink(page, '#contact');
  await expectLandedOn(page, 'contact');
  await page.goto('about:blank');
  await page.goBack();
  await expect(page.locator('#contact')).toBeAttached();
  await expectLandedOn(page, 'contact');
});

test('the jump offset uses the measured header height', async ({ page }) => {
  await visit(page);
  const { measured, written } = await page.evaluate(() => ({
    measured: document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0,
    written: document.documentElement.style.getPropertyValue('--site-header-height'),
  }));
  expect(measured).toBeGreaterThan(0);
  expect(written).toBe(`${measured}px`);
});

/**
 * Opens a deep link whose `load` event is held back by a slow image (added at
 * DOMContentLoaded), so a test can act between the jump and `load`, like an engine (Firefox)
 * that handles the fragment again later or a web font that swaps late.
 */
async function visitDeepLinkWithSlowLoad(page: Page, hash: string) {
  await page.route('**/__e2e-slow-load.png', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({ status: 204 });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('portfolio.lang', 'en');
    document.addEventListener('DOMContentLoaded', () => {
      const img = document.createElement('img');
      img.alt = '';
      img.src = '/__e2e-slow-load.png';
      document.body.append(img);
    });
  });
  await page.goto(`/${hash}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#now h2')).toBeFocused();
  expect(await page.evaluate(() => document.readyState)).not.toBe('complete');
}

test('a deep link keeps its focus and position while the page finishes loading', async ({
  page,
}) => {
  await visitDeepLinkWithSlowLoad(page, '#now');
  // What Firefox does at load, and what a late font swap does: focus reset to the document,
  // and the content above the target grows.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document
      .querySelector<HTMLElement>('[data-chapter="hook"]')
      ?.style.setProperty('padding-top', '160px');
  });
  await page.waitForLoadState('load');
  await expectLandedOn(page, 'now');
});

test('once the visitor interacts, settling a deep link stops', async ({ page }) => {
  await visitDeepLinkWithSlowLoad(page, '#now');
  await page.keyboard.press('Shift');
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await page.waitForLoadState('load');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test('without a hash the page stays at the top', async ({ page }) => {
  await visit(page);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('Back after jumps restores each position, and focus follows the restored hash', async ({
  page,
}) => {
  await visit(page);
  const start = await page.evaluate(() => {
    const top = document.getElementById('origins')?.getBoundingClientRect().top ?? 0;
    window.scrollTo({ top: Math.round(window.scrollY + top), behavior: 'instant' });
    return window.scrollY;
  });
  expect(start).toBeGreaterThan(0);
  // Let the scroll position settle so the browser saves it with the history entry.
  await page.waitForTimeout(200);

  const nav = page.getByRole('navigation', { name: 'Chapters' });
  await nav.getByRole('link', { name: 'Energy', exact: true }).click();
  await expect(page).toHaveURL(/#energy$/);
  await expectLandedOn(page, 'energy');
  const energyY = await page.evaluate(() => window.scrollY);

  await nav.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expectLandedOn(page, 'contact');

  // Back to #energy: the browser restores its position, focus returns to its heading.
  await page.goBack();
  await expect(page).toHaveURL(/#energy$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(energyY, -1);
  await expect(page.locator('#energy h2')).toBeFocused();

  // Back to the page without a hash: the position is restored and focus stays where it was.
  await page.goBack();
  await expect(page).not.toHaveURL(/#/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(start, -1);
  await expect(page.locator('#energy h2')).toBeFocused();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('jumps are instant', async ({ page }) => {
    await visit(page);
    await page
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('link', { name: 'Contact', exact: true })
      .click();
    // Two frames after the click the page is already where it ends up.
    const early = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve(window.scrollY);
            });
          });
        }),
    );
    const landing = await settledLanding(page, 'contact');
    expect(landing.scrollY).toBeGreaterThan(0);
    expect(early).toBe(landing.scrollY);
    expect(landing.focused).toBe(true);
  });
});
