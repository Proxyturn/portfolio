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
  // Each measurement waits for 10 stable frames; on a heavy concept in a software-rendered
  // browser frames can take 300–500 ms, so allow several measurements.
  await expect
    .poll(
      async () => {
        const landing = await settledLanding(page, id);
        return {
          focused: landing.focused,
          belowHeader: landing.headingTop >= landing.headerBottom,
          // Lands at its scroll margin, unless the page can't scroll that far. A card the
          // browser scrolled to while its reveal animation (y: 24px) was still pending then
          // rises by up to that much; the heading must still be below the header.
          atTop:
            (landing.fromMargin >= -REVEAL_RISE && landing.fromMargin <= 2) || landing.atBottom,
        };
      },
      { timeout: 20_000 },
    )
    .toEqual({ focused: true, belowHeader: true, atTop: true });
}

/**
 * Waits until the page's web fonts are in and two frames have passed, so the reflow a font
 * swap causes (and its scroll anchoring) is over. Tests that make a move of their own use it
 * so that their move is the only one (a font reflow at the same moment is a different case).
 */
async function fontsSettled(page: Page) {
  await page.evaluate(async () => {
    // Each face the page uses (not \`document.fonts.ready\`, which WebKit only resolves once the
    // document has loaded, and these tests hold the load back).
    await Promise.all(
      [...document.fonts]
        .filter((face) => face.status !== 'unloaded')
        .map((face) => face.loaded.catch(() => face)),
    );
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
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

/**
 * Reloading a deep link. Usually the jump code lands it again. Sometimes (Chromium, a slow
 * CPU) the browser applies its own scroll restore before any app code runs; a restored
 * position wins, so then the page stays where the browser put it, with the heading focused
 * and below the header, and not far from the landing. A concept's late reflow can leave a
 * restore off by some px: Worlds in CI (run 43141100013) ended 27 px off after a reload, and
 * its trace shows that concept's first load moving the page by 245 px after the jump (4411 to
 * 4166) as its layout settled. 60 px allows that and still catches a real miss.
 */
test('reloading a deep link lands on it again', async ({ page }) => {
  await visitDeepLink(page, '#now');
  await expectLandedOn(page, 'now');
  const before = await page.evaluate(() => window.scrollY);
  await page.reload();
  await expect(page.locator('#now')).toBeAttached();
  const landing = await settledLanding(page, 'now');
  const strict = landing.fromMargin >= -REVEAL_RISE && landing.fromMargin <= 2;
  const detail = `scrollY before reload ${String(before)}, after ${String(landing.scrollY)}, fromMargin ${String(landing.fromMargin)}`;
  expect(landing.focused, detail).toBe(true);
  expect(landing.headingTop >= landing.headerBottom, detail).toBe(true);
  expect(strict || Math.abs(landing.fromMargin) <= 60, detail).toBe(true);
});

/**
 * Reloading after scrolling away from the hash. Whether the browser restores the scroll
 * position depends on timing, not only on the engine: usually Chromium and WebKit try before
 * the story has rendered, find the page too short and give up, so the jump code scrolls to the
 * hash; but when the story commits in the same task as a pending restore (seen in Chromium,
 * often on a slow CPU), the restored position is applied before any app code runs. The rule in
 * jump.ts is that a restored position wins (the code then only focuses). So in every engine the
 * page ends either at the hash's landing or at the restored position, never at the top, and the
 * hash's heading has focus either way.
 */
test('reloading after scrolling away: restored position, or the hash, never the top', async ({
  page,
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
  // A restore is not pixel-exact: Chromium restores a few px off, and a late 1 px reflow (a
  // font swap) then makes scroll anchoring move it a few px more (5–7 px seen under a 4×
  // slower CPU). The hash's landing is 900 px away, so allowing up to the jump gap (24 px)
  // can't mistake one outcome for the other.
  const restored = Math.abs(landing.scrollY - scrolled) <= 24;
  if (restored) {
    expect(
      landing.focused,
      `restored to ${String(landing.scrollY)} (scrolled to ${String(scrolled)})`,
    ).toBe(true);
  } else {
    await expectLandedOn(page, 'now');
  }
  expect(landing.scrollY).toBeGreaterThan(0);
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
 * Opens a deep link whose `load` event is held back by an image (added at DOMContentLoaded)
 * that is only served when the test calls the returned `finishLoading`. So a test can act
 * between the jump and `load` at any runner speed, like an engine (Firefox) that handles the
 * fragment again later or a web font that swaps late.
 */
async function visitDeepLinkWithHeldLoad(page: Page, hash: string, focused = '#now h2') {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/__e2e-held-load.png', async (route) => {
    await held;
    await route.fulfill({ status: 204 });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('portfolio.lang', 'en');
    document.addEventListener('DOMContentLoaded', () => {
      const img = document.createElement('img');
      img.alt = '';
      img.src = '/__e2e-held-load.png';
      document.body.append(img);
    });
  });
  await page.goto(`/${hash}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator(focused)).toBeFocused();
  expect(await page.evaluate(() => document.readyState)).not.toBe('complete');
  return async function finishLoading() {
    release();
    await page.waitForLoadState('load');
  };
}

test('a deep link keeps its focus and position while the page finishes loading', async ({
  page,
}) => {
  const finishLoading = await visitDeepLinkWithHeldLoad(page, '#now');
  // What Firefox does at load, and what a late font swap does: focus reset to the document,
  // and the content above the target grows.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document
      .querySelector<HTMLElement>('[data-chapter="hook"]')
      ?.style.setProperty('padding-top', '160px');
  });
  await finishLoading();
  await expectLandedOn(page, 'now');
});

test('a script scroll right after load that is not a fragment scroll wins', async ({ page }) => {
  const finishLoading = await visitDeepLinkWithHeldLoad(page, '#now');
  // The page moves by 120 px right after the jump code's own load check, to a place where
  // neither the hash's element nor the target is at its scroll margin: that's not an engine's
  // fragment scroll, so (like find in page) it is respected. Late layout changes (a scene
  // inserting a pin spacer) are still followed; see the "content inserted above" test.
  // The page may not be exactly at the landing by then (a concept's font reflow at load can
  // leave it a few px off before the next check), so the test compares with where the script
  // scrolled from rather than with the landing.
  await page.evaluate(() => {
    window.addEventListener('load', () => {
      (window as unknown as { __scrolledFrom?: number }).__scrolledFrom = window.scrollY;
      window.scrollBy({ top: 120, behavior: 'instant' });
    });
  });
  await fontsSettled(page);
  await finishLoading();
  await page.waitForTimeout(500);
  const landing = await settledLanding(page, 'now');
  const from = await page.evaluate(
    () => (window as unknown as { __scrolledFrom?: number }).__scrolledFrom ?? Number.NaN,
  );
  expect(landing.scrollY - from).toBeCloseTo(120, -1);
  expect(landing.focused).toBe(true);
});

/**
 * Makes every animation frame take about 300 ms for a while (a busy loop in
 * requestAnimationFrame), like a heavy concept in a software-rendered browser: then a reflow's
 * scroll event, its ResizeObserver report and the layout check can be hundreds of ms apart.
 */
async function slowFrames(page: Page, forMs = 2500) {
  await page.evaluate((duration) => {
    const until = performance.now() + duration;
    const slow = () => {
      const start = performance.now();
      while (performance.now() - start < 300) {
        // Busy: this frame takes 300 ms.
      }
      if (performance.now() < until) requestAnimationFrame(slow);
    };
    requestAnimationFrame(slow);
  }, forMs);
}

for (const [kind, style, slow] of [
  ['grows', { letterSpacing: '0.04em', lineHeight: '1.85' }, false],
  ['shrinks', { letterSpacing: '-0.02em', lineHeight: '1.35' }, false],
  // Fails without the decision/layout-check ordering in WebKit (and on Journey); the other
  // engines pass either way, so it is regression coverage there.
  ['grows, on slow frames', { letterSpacing: '0.04em', lineHeight: '1.85' }, true],
] as const) {
  test(`a deep link stays at its landing when the whole page reflows after load (${kind})`, async ({
    page,
  }) => {
    // Like a web-font swap: every line above the target changes height, partly above the
    // scroll-anchoring node (compensated by the browser) and partly below it (not).
    const finishLoading = await visitDeepLinkWithHeldLoad(page, '#now');
    await finishLoading();
    if (slow) await slowFrames(page);
    await page.evaluate((values) => {
      document.body.style.setProperty('letter-spacing', values.letterSpacing);
      document.body.style.setProperty('line-height', values.lineHeight);
    }, style);
    await expectLandedOn(page, 'now');
  });
}

test('a deep link stays at its landing when content changes above and below the anchor', async ({
  page,
}) => {
  const finishLoading = await visitDeepLinkWithHeldLoad(page, '#now');
  await finishLoading();
  await page.evaluate(() => {
    // Far above (compensated by scroll anchoring), right above the target (between an anchor
    // in the previous chapter and the target), and inside the target above its focused
    // heading (anchoring on that heading moves the page more than the target moved).
    document
      .querySelector<HTMLElement>('[data-chapter="hook"]')
      ?.style.setProperty('padding-bottom', '120px');
    document.getElementById('breadth')?.style.setProperty('padding-bottom', '200px');
    document.getElementById('now')?.style.setProperty('padding-top', '160px');
  });
  await expectLandedOn(page, 'now');
});

test('a deep link whose target moves after load (content inserted above) follows it', async ({
  page,
}) => {
  const finishLoading = await visitDeepLinkWithHeldLoad(page, '#now');
  await finishLoading();
  await fontsSettled(page);
  // Like a pin spacer or a late image above the target: 200 px more content before it.
  await page.evaluate(() => {
    document
      .querySelector<HTMLElement>('[data-chapter="hook"]')
      ?.style.setProperty('padding-top', '200px');
  });
  await expectLandedOn(page, 'now');
});

for (const [kind, by] of [
  ['near (find in page, just below the fold)', 80],
  ['far (a scrollbar drag, or a late scroll restore)', -1500],
] as const) {
  test(`a ${kind} scroll without pointer or keys is not pulled back`, async ({ page }) => {
    const finishLoading = await visitDeepLinkWithHeldLoad(page, '#now');
    await fontsSettled(page);
    await page.evaluate((offset) => {
      window.scrollTo({ top: window.scrollY + offset, behavior: 'instant' });
    }, by);
    await finishLoading();
    // Once settling has judged the scroll (it waits for the page to be still), a later layout
    // change would have been realigned before; now the visitor's place wins. (A reflow within
    // that short wait is an accepted false positive, see settleDeepLink.)
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document
        .querySelector<HTMLElement>('[data-chapter="hook"]')
        ?.style.setProperty('padding-bottom', '200px');
    });
    await page.waitForTimeout(500);
    const landing = await settledLanding(page, 'now');
    expect(Math.abs(landing.fromMargin)).toBeGreaterThan(60);
    expect(landing.focused).toBe(true);
  });
}

/**
 * What Firefox does at load: it scrolls to the fragment's own element (here the chapter's
 * heading, `#energy-title`) after the jump, smoothly under `scroll-behavior: smooth`, and
 * without any input. The chapter must still end at its landing, also when the heading sits far
 * below the chapter's top (as under the Worlds overview's vignette).
 */
// The slow-frame variant is regression coverage: it passes in every engine without the
// decision/layout-check ordering too. The ordering itself is proven by the slow-frame reflow
// test (which failed without it in WebKit) and by the unit tests.
for (const [kind, extra, slow] of [
  ['', 0, false],
  [' with the heading far below the chapter top', 400, false],
  [' on slow frames', 0, true],
] as const) {
  test(`an engine's late scroll to the fragment's heading is realigned${kind}`, async ({
    page,
  }) => {
    const finishLoading = await visitDeepLinkWithHeldLoad(page, '#energy-title', '#energy h2');
    if (slow) await slowFrames(page);
    await page.evaluate((padding) => {
      if (padding) {
        document.getElementById('energy')?.style.setProperty('padding-top', `${String(padding)}px`);
      }
    }, extra);
    await expectLandedOn(page, 'energy');
    await page.evaluate(() => {
      document.getElementById('energy-title')?.scrollIntoView();
    });
    await finishLoading();
    await expectLandedOn(page, 'energy');
  });
}

test('once the visitor interacts, settling a deep link stops', async ({ page }) => {
  const finishLoading = await visitDeepLinkWithHeldLoad(page, '#now');
  await page.keyboard.press('Shift');
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await finishLoading();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test('without a hash the page stays at the top', async ({ page }) => {
  await visit(page);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

/**
 * Waits until the page has stayed at `y` for several frames and a scroll event has been
 * processed, so the browser has committed the position to the current history entry.
 */
async function expectScrollSettledAt(page: Page, y: number) {
  await expect
    .poll(() =>
      page.evaluate(async (expected) => {
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        for (let i = 0; i < 5; i++) {
          await frame();
          if (Math.abs(window.scrollY - expected) > 1) return false;
        }
        return true;
      }, y),
    )
    .toBe(true);
  await page.waitForTimeout(300);
}

/**
 * Instant jumps (reduced motion): with smooth scrolling, Chromium sometimes records the page's
 * position for the entry being left while the smooth scroll to the next chapter is already
 * under way (about 1 run in 50 under load), so Back to that entry restored the wrong place.
 * That is the browser's bookkeeping, not this code; the test is about Back and focus.
 */
test.describe('Back after jumps', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Back after jumps restores each position, and focus follows the restored hash', async ({
    page,
  }) => {
    await visit(page);
    // Start only once the page has loaded (ScrollTrigger refreshes at load), so nothing but this
    // test moves the page while the browser records the entry's scroll position.
    await page.waitForLoadState('load');
    const start = await page.evaluate(() => {
      const top = document.getElementById('origins')?.getBoundingClientRect().top ?? 0;
      window.scrollTo({ top: Math.round(window.scrollY + top), behavior: 'instant' });
      return window.scrollY;
    });
    expect(start).toBeGreaterThan(0);
    await expectScrollSettledAt(page, start);

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
