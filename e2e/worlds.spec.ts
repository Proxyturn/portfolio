import { expect, test, type Page } from '@playwright/test';
import { en } from '../src/i18n/en';
import { ptBR } from '../src/i18n/pt-BR';
import { PALETTES } from '../src/concepts/worlds/world';
import { cv, visit } from './helpers';

/**
 * Worlds version 2 (docs/STORYBOARDS.md, section 3): the map's links table, the layout gates,
 * the camera and its focus zoom-out, every jump landing below the sticky chrome with focus,
 * reduced motion, and the contrast and size of chips, rings and targets.
 */

const LINKS: readonly (readonly [string, string, string])[] = [
  ['#job-novus', 'Novus Automação', 'Novus Automação'],
  [
    '#edu-computer-science',
    en.worlds.mapLabels.computerScience,
    ptBR.worlds.mapLabels.computerScience,
  ],
  ['#job-atos-bradesco', 'ATOS · Bradesco', 'ATOS · Bradesco'],
  [
    '#job-atos-frontend',
    en.worlds.mapLabels.betweenWorldsAtos,
    ptBR.worlds.mapLabels.betweenWorldsAtos,
  ],
  ['#job-atos-cpfl', 'ATOS · CPFL', 'ATOS · CPFL'],
  ['#job-atos-cemig-cpfl', 'ATOS · CEMIG / CPFL', 'ATOS · CEMIG / CPFL'],
  ['#job-atos-sodexo', 'ATOS · Sodexo', 'ATOS · Sodexo'],
  ['#job-atos-alphaville', 'ATOS · Alphaville', 'ATOS · Alphaville'],
  ['#job-semantix', 'SEMANTIX', 'SEMANTIX'],
  ['#next', en.worlds.districts.ai, ptBR.worlds.districts.ai],
  ['#toolbox', en.worlds.districts.workshop, ptBR.worlds.districts.workshop],
  ['#contact', en.worlds.districts.postOffice, ptBR.worlds.districts.postOffice],
];

const DESKTOP = { width: 1280, height: 720 };
const STRIP = { width: 820, height: 1180 };
const SHORT = { width: 1280, height: 560 };
const PHONE = { width: 320, height: 640 };

const map = (page: Page) => page.locator('#world-map');

function isMobile(projectName: string) {
  return projectName === 'mobile';
}

/** The camera wrapper's current zoom (1 = the whole world). */
async function cameraScale(page: Page): Promise<number> {
  return page.evaluate(() => {
    const camera = document.querySelector<HTMLElement>('[data-camera]');
    if (!camera) return NaN;
    const transform = getComputedStyle(camera).transform;
    return transform === 'none' ? 1 : new DOMMatrix(transform).a;
  });
}

/** Waits until the camera's transform has been stable for 10 frames. */
async function cameraSettled(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const camera = document.querySelector<HTMLElement>('[data-camera]');
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let last = '';
    let stable = 0;
    for (let i = 0; i < 600 && stable < 10; i++) {
      await frame();
      const now = `${window.scrollY}|${camera ? getComputedStyle(camera).transform : ''}`;
      stable = now === last ? stable + 1 : 0;
      last = now;
    }
    return last;
  });
}

async function cameraLoaded(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector<HTMLElement>('[data-camera]')?.style.transform ?? '',
      ),
    )
    .not.toBe('');
}

interface Landing {
  readonly focused: boolean;
  readonly belowChrome: boolean;
  readonly atMargin: boolean;
  readonly detail: string;
}

/**
 * Waits for scrolling to settle, then checks the landing: the target's tabindex="-1" heading
 * has focus, sits below the header (and the map strip, when there is one), and the target is
 * at its scroll margin unless the page can't scroll that far.
 */
async function landing(page: Page, id: string): Promise<Landing> {
  return page.evaluate(async (targetId) => {
    const target = document.getElementById(targetId);
    if (!target) throw new Error(`No element #${targetId}`);
    const heading =
      target.querySelector<HTMLElement>(
        'h1[tabindex="-1"], h2[tabindex="-1"], h3[tabindex="-1"]',
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
    const stage = document.querySelector('.worlds__stage');
    const stageRect = stage?.getBoundingClientRect();
    // The strip layout: a sticky stage across the full width, stuck under the header.
    const strip =
      stage &&
      stageRect &&
      getComputedStyle(stage).position === 'sticky' &&
      stageRect.width >= window.innerWidth - 20 &&
      targetId !== 'world-map'
        ? stageRect.bottom
        : 0;
    const chrome = Math.max(header, strip);
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop);
    const fromMargin = target.getBoundingClientRect().top - margin;
    const atBottom =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const top = heading.getBoundingClientRect().top;
    return {
      focused: document.activeElement === heading,
      belowChrome: top >= chrome,
      // Lands at its margin, unless the page can't scroll that far (top or bottom).
      atMargin: Math.abs(fromMargin) <= 2 || atBottom || (window.scrollY === 0 && fromMargin < 0),
      detail: `heading ${top.toFixed(1)} chrome ${chrome.toFixed(1)} fromMargin ${fromMargin.toFixed(1)}`,
    };
  }, id);
}

async function expectLanded(page: Page, id: string) {
  await expect
    .poll(
      async () => {
        const l = await landing(page, id);
        return { focused: l.focused, belowChrome: l.belowChrome, atMargin: l.atMargin };
      },
      { message: `landing on #${id}` },
    )
    .toEqual({ focused: true, belowChrome: true, atMargin: true });
}

async function toTop(page: Page) {
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await cameraSettled(page);
}

// ---------------------------------------------------------------------------------------

for (const lang of ['en', 'pt'] as const) {
  test(`the map has the twelve building links of the storyboard, in story order (${lang})`, async ({
    page,
    browserName,
  }) => {
    await visit(page, lang);
    const nav = page.getByRole('navigation', {
      name: lang === 'en' ? 'World map' : 'Mapa do mundo',
    });
    await expect(nav).toHaveAttribute('id', 'world-map');
    await expect(nav).toHaveAttribute('data-jump-target', '');
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(LINKS.length);
    for (const [i, [href, nameEn, namePt]] of LINKS.entries()) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAccessibleName(lang === 'en' ? nameEn : namePt);
      // The label is visible text (not only on hover).
      await expect(link.locator('text')).toBeVisible();
    }
    // SVG list semantics (the storyboard's fallback applies if a browser doesn't expose them).
    if (browserName === 'chromium') {
      await expect(nav.getByRole('list')).toHaveCount(1);
      await expect(nav.getByRole('listitem')).toHaveCount(LINKS.length);
    }
    const structure = await page.evaluate(() => {
      const svg = document.querySelector('#world-map svg');
      return {
        svgRole: svg?.getAttribute('role') ?? null,
        svgHidden: svg?.getAttribute('aria-hidden') ?? null,
        styleAttributes: svg
          ? svg.querySelectorAll('[style]').length + (svg.hasAttribute('style') ? 1 : 0)
          : -1,
        drawingsHidden: [...document.querySelectorAll('#world-map .worlds-drawing')].every(
          (g) => g.getAttribute('aria-hidden') === 'true',
        ),
        sceneryHidden: document
          .querySelector('#world-map .worlds-scenery')
          ?.getAttribute('aria-hidden'),
        // Position on the outer group (attribute), lift on an inner group (CSS): never both.
        mixed: [...document.querySelectorAll('#world-map .worlds-lift')].filter((g) =>
          g.hasAttribute('transform'),
        ).length,
        headingFocusable: document.getElementById('world-map-title')?.getAttribute('tabindex'),
      };
    });
    expect(structure).toEqual({
      svgRole: null,
      svgHidden: null,
      styleAttributes: 0,
      drawingsHidden: true,
      sceneryHidden: 'true',
      mixed: 0,
      headingFocusable: '-1',
    });
  });
}

test.describe('layout gates', () => {
  test('≥ 1024 × 600: sticky map stage on the left (60%), panels on the right, camera on', async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'Desktop layout.');
    await page.setViewportSize(DESKTOP);
    await visit(page);
    await cameraLoaded(page);
    const layout = await page.evaluate(() => {
      const stage = document.querySelector('.worlds__stage')?.getBoundingClientRect();
      const panels = document.querySelector('.worlds__panels')?.getBoundingClientRect();
      return {
        position: getComputedStyle(document.querySelector('.worlds__stage') as Element).position,
        stageShare: (stage?.width ?? 0) / window.innerWidth,
        panelsLeft: (panels?.left ?? 0) / window.innerWidth,
        arrangement: document.querySelector('#world-map svg')?.getAttribute('data-arrangement'),
        backLinks: [...document.querySelectorAll('.worlds-back')].filter(
          (a) => getComputedStyle(a).display !== 'none',
        ).length,
      };
    });
    expect(layout.position).toBe('sticky');
    expect(layout.stageShare).toBeCloseTo(0.6, 1);
    expect(layout.panelsLeft).toBeCloseTo(0.6, 1);
    expect(layout.arrangement).toBe('square');
    expect(layout.backLinks).toBe(0);
    // Sticky: still in place after scrolling into the story.
    await page.locator('#energy').scrollIntoViewIfNeeded();
    const top = await page.evaluate(
      () => document.querySelector('.worlds__stage')?.getBoundingClientRect().top ?? -1,
    );
    const header = await page.evaluate(
      () => document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0,
    );
    expect(Math.abs(top - header)).toBeLessThanOrEqual(1);
  });

  test('768–1023 × ≥ 600: sticky strip on top (40% of the height), offset includes it', async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'Tablet layout.');
    await page.setViewportSize(STRIP);
    await visit(page);
    await cameraLoaded(page);
    const layout = await page.evaluate(() => {
      const stage = document.querySelector('.worlds__stage') as HTMLElement;
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
      return {
        position: getComputedStyle(stage).position,
        heightShare: stage.getBoundingClientRect().height / window.innerHeight,
        width: stage.getBoundingClientRect().width,
        offset: parseFloat(
          getComputedStyle(document.getElementById('energy') as Element).scrollMarginTop,
        ),
        expected: header + stage.getBoundingClientRect().height + 24,
      };
    });
    expect(layout.position).toBe('sticky');
    expect(layout.heightShare).toBeCloseTo(0.4, 2);
    expect(layout.width).toBeGreaterThan(STRIP.width - 20);
    expect(Math.abs(layout.offset - layout.expected)).toBeLessThanOrEqual(1.5);
  });

  for (const [name, size, expected] of [
    ['short desktop (1280 × 560)', SHORT, 'wide'],
    ['short tablet (1000 × 600)', { width: 1000, height: 600 }, 'wide'],
    ['landscape phone (844 × 390)', { width: 844, height: 390 }, 'wide'],
    ['phone (320 × 640)', PHONE, 'portrait'],
  ] as const) {
    test(`${name}: overview after the hook, no sticky stage, no camera, Back links`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await visit(page);
      await page.waitForTimeout(500);
      const layout = await page.evaluate(() => ({
        position: getComputedStyle(document.querySelector('.worlds__stage') as Element).position,
        arrangement: document.querySelector('#world-map svg')?.getAttribute('data-arrangement'),
        cameraStyle: document.querySelector<HTMLElement>('[data-camera]')?.style.transform,
        hookAboveMap:
          (document.getElementById('hook')?.getBoundingClientRect().bottom ?? Infinity) <=
          (document.getElementById('world-map')?.getBoundingClientRect().top ?? 0),
        backLinks: [...document.querySelectorAll('.worlds-back')].filter(
          (a) => getComputedStyle(a).display !== 'none',
        ).length,
        vignettes: [...document.querySelectorAll('.worlds-vignette')].filter(
          (v) => getComputedStyle(v).display !== 'none',
        ).length,
      }));
      expect(layout).toEqual({
        position: 'static',
        arrangement: expected,
        cameraStyle: '',
        hookAboveMap: true,
        backLinks: 8,
        vignettes: 8,
      });
    });
  }

  test('reading order: the name, then the map, then the chapters, in every layout', async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'Sizes are set explicitly.');
    for (const size of [DESKTOP, STRIP, SHORT, PHONE]) {
      await page.setViewportSize(size);
      await visit(page);
      const order = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const nav = document.getElementById('world-map');
        const origins = document.getElementById('origins');
        if (!h1 || !nav || !origins) return null;
        return {
          nameFirst: !!(h1.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING),
          mapBeforeChapters: !!(
            nav.compareDocumentPosition(origins) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
        };
      });
      expect(order, `${size.width}×${size.height}`).toEqual({
        nameFirst: true,
        mapBeforeChapters: true,
      });
    }
  });
});

test.describe('camera', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'No camera on phones.');
  });

  test('follows the scroll from district to district, zoom between 1 and 2', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await visit(page);
    await cameraLoaded(page);
    await cameraSettled(page);
    expect(await cameraScale(page)).toBeCloseTo(1, 2);
    for (const chapter of ['origins', 'energy', 'now', 'next']) {
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el)
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.scrollY - 100,
            behavior: 'instant',
          });
      }, chapter);
      await cameraSettled(page);
      const scale = await cameraScale(page);
      expect(scale, chapter).toBeGreaterThan(1.05);
      expect(scale, chapter).toBeLessThanOrEqual(2.0001);
    }
    // The Toolbox chapter shows the whole world.
    await page.evaluate(() => {
      const el = document.getElementById('toolbox');
      if (el)
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 100,
          behavior: 'instant',
        });
    });
    await cameraSettled(page);
    expect(await cameraScale(page)).toBeCloseTo(1, 2);
  });

  test('a deep link opens with the camera already on its district', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(() => {
      window.localStorage.setItem('portfolio.lang', 'en');
    });
    await page.goto('/#now');
    await cameraLoaded(page);
    await cameraSettled(page);
    const centred = await page.evaluate(() => {
      const stage = document.querySelector('[data-camera-stage]')?.getBoundingClientRect();
      const ground = document.querySelector('[data-ground="cement"] rect')?.getBoundingClientRect();
      if (!stage || !ground) return null;
      return {
        visible:
          ground.left >= stage.left - 1 &&
          ground.right <= stage.right + 1 &&
          ground.top >= stage.top - 1 &&
          ground.bottom <= stage.bottom + 1,
        share: (ground.width * ground.height) / (stage.width * stage.height),
      };
    });
    expect(centred?.visible).toBe(true);
    // Zoomed in: the district fills a good part of the stage.
    expect(centred?.share ?? 0).toBeGreaterThan(0.25);
  });

  test('keyboard focus in the map shows the whole world; leaving it returns to the scroll', async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(DESKTOP);
    await visit(page);
    await cameraLoaded(page);
    await page.evaluate(() => {
      const el = document.getElementById('energy');
      if (el)
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 100,
          behavior: 'instant',
        });
    });
    await cameraSettled(page);
    const zoomed = await cameraScale(page);
    expect(zoomed).toBeGreaterThan(1.05);

    // Keyboard: focus the map's heading, then Tab to the first building. (WebKit doesn't Tab to
    // links by default, so it focuses the link directly after a key press.)
    await page.locator('#world-map-title').focus();
    if (browserName === 'webkit') {
      await page.keyboard.press('Shift');
      await page.locator('#world-map a').first().focus();
    } else {
      await page.keyboard.press('Tab');
    }
    await expect(page.locator('#world-map a').first()).toBeFocused();
    await cameraSettled(page);
    expect(await cameraScale(page)).toBeCloseTo(1, 2);
    const allOnStage = await page.evaluate(() => {
      const stage = document.querySelector('[data-camera-stage]')?.getBoundingClientRect();
      if (!stage) return false;
      return [...document.querySelectorAll('#world-map .worlds-hit')].every((hit) => {
        const r = hit.getBoundingClientRect();
        return (
          r.left >= stage.left - 1 &&
          r.right <= stage.right + 1 &&
          r.top >= stage.top - 1 &&
          r.bottom <= stage.bottom + 1
        );
      });
    });
    expect(allOnStage).toBe(true);
    // The focus ring shows on the focused building.
    const ring = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('#world-map a .worlds-ring') as Element).opacity,
    );
    expect(ring).toBe('1');

    // Leaving the map: back to the scroll position's district.
    await page.locator('#energy h2').focus();
    await cameraSettled(page);
    expect(await cameraScale(page)).toBeCloseTo(zoomed, 2);
  });
});

test.describe('jumps', () => {
  for (const [label, size] of [
    ['desktop', DESKTOP],
    ['tablet strip', STRIP],
    ['phone overview', PHONE],
  ] as const) {
    test(`every building link lands its target below the sticky chrome, with focus (${label})`, async ({
      page,
    }, testInfo) => {
      test.skip(isMobile(testInfo.project.name) && label !== 'phone overview', 'Desktop sizes.');
      // Twelve smooth-scroll landings: WebKit on Windows needs more than the default 30 s.
      test.setTimeout(90_000);
      await page.setViewportSize(size);
      await visit(page);
      for (const [href] of LINKS) {
        await toTop(page);
        await map(page).locator(`a[href="${href}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        await expectLanded(page, href.slice(1));
      }
    });
  }

  test('Back to the map lands on the map, focuses its heading, and the next Tab reaches the first building', async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(PHONE);
    await visit(page);
    await page.locator('#energy').scrollIntoViewIfNeeded();
    await page.locator('#energy .worlds-back').click();
    await expect(page).toHaveURL(/#world-map$/);
    await expectLanded(page, 'world-map');
    await expect(page.locator('#world-map-title')).toBeFocused();
    test.skip(browserName === 'webkit', 'WebKit skips links on Tab by default (Safari setting).');
    await page.keyboard.press('Tab');
    await expect(page.locator('#world-map a').first()).toBeFocused();
  });

  for (const [label, size] of [
    ['desktop', DESKTOP],
    ['tablet strip', STRIP],
  ] as const) {
    for (const id of ['now', 'job-atos-frontend', 'edu-computer-science']) {
      test(`deep link /#${id} lands below the sticky chrome (${label})`, async ({
        page,
      }, testInfo) => {
        test.skip(isMobile(testInfo.project.name), 'Desktop sizes.');
        await page.setViewportSize(size);
        await page.addInitScript(() => {
          window.localStorage.setItem('portfolio.lang', 'en');
        });
        await page.goto(`/#${id}`);
        await expect(page.locator(`#${id}`)).toBeAttached();
        await expectLanded(page, id);
      });
    }
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no camera, no ambient touches: the map shows the whole world and the scene code never loads', async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'Desktop layout.');
    const chunks: string[] = [];
    page.on('request', (request) => {
      if (/\/assets\/scene-.*\.js$/.test(request.url())) chunks.push(request.url());
    });
    await page.setViewportSize(DESKTOP);
    await visit(page);
    await page.evaluate(() => {
      const el = document.getElementById('energy');
      if (el)
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 100,
          behavior: 'instant',
        });
    });
    await page.waitForTimeout(600);
    expect(await cameraScale(page)).toBe(1);
    expect(
      await page.evaluate(
        () => document.querySelector<HTMLElement>('[data-camera]')?.style.transform,
      ),
    ).toBe('');
    expect(chunks).toEqual([]);
    // A building jump is instant and lands with focus.
    await page.locator('#world-map a[href="#job-semantix"]').click();
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
    await expectLanded(page, 'job-semantix');
    expect(await page.evaluate(() => window.scrollY)).toBe(early);
  });
});

test.describe('contrast and sizes', () => {
  for (const [label, size] of [
    ['square', DESKTOP],
    ['wide', STRIP],
    ['portrait', PHONE],
  ] as const) {
    for (const lang of ['en', 'pt'] as const) {
      test(`chips, rings, halos, pin and signs (${label}, ${lang})`, async ({ page }, testInfo) => {
        test.skip(isMobile(testInfo.project.name), 'Sizes are set explicitly.');
        await page.setViewportSize(size);
        await visit(page, lang);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('#world-map [data-pin]')).toBeAttached();
        await page.waitForTimeout(200);
        expect(
          await page.evaluate(() =>
            document.querySelector('#world-map svg')?.getAttribute('data-arrangement'),
          ),
        ).toBe(label);
        const report = await page.evaluate(() => {
          const rgb = (value: string) =>
            (value.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
          const lum = ([r = 0, g = 0, b = 0]: number[]) => {
            const c = [r, g, b].map((v) => {
              const s = v / 255;
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
          };
          const ratio = (a: string, b: string) => {
            const [hi, lo] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
            return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
          };
          const inside = (a: DOMRect, b: DOMRect) =>
            a.left >= b.left - 0.5 &&
            a.right <= b.right + 0.5 &&
            a.top >= b.top - 0.5 &&
            a.bottom <= b.bottom + 0.5;
          const overlap = (a: DOMRect, b: DOMRect) =>
            a.left < b.right - 0.5 &&
            b.left < a.right - 0.5 &&
            a.top < b.bottom - 0.5 &&
            b.top < a.bottom - 0.5;
          const items = [...document.querySelectorAll<SVGGElement>('#world-map [data-building]')];
          const grounds = [
            ...document.querySelectorAll<SVGRectElement>('#world-map [data-ground] .worlds-ground'),
          ];
          const groundOf = (box: DOMRect) =>
            grounds.find((g) => inside(box, g.getBoundingClientRect()));
          const problems: string[] = [];
          let minChipText = Infinity;
          let minRing = Infinity;
          let minHalo = Infinity;
          const hits = items.map((item) =>
            (item.querySelector('.worlds-hit') as SVGRectElement).getBoundingClientRect(),
          );
          items.forEach((item, i) => {
            const name = item.dataset.building ?? '?';
            const chip = item.querySelector('.worlds-chip') as SVGRectElement;
            const label = item.querySelector('.worlds-label') as SVGTextElement;
            const ring = item.querySelector('.worlds-ring') as SVGRectElement;
            const halo = item.querySelector('.worlds-halo') as SVGEllipseElement;
            const textRatio = ratio(getComputedStyle(label).fill, getComputedStyle(chip).fill);
            minChipText = Math.min(minChipText, textRatio);
            if (textRatio < 4.5) problems.push(`${name}: chip text ${textRatio.toFixed(2)}`);
            if (!inside(label.getBoundingClientRect(), chip.getBoundingClientRect()))
              problems.push(`${name}: label overflows its chip`);
            // Ring and halo sit on their district's ground and contrast with it.
            const ground = groundOf(ring.getBoundingClientRect());
            if (!ground) problems.push(`${name}: ring leaves its ground`);
            else {
              const fill = getComputedStyle(ground).fill;
              const r = ratio(getComputedStyle(ring).stroke, fill);
              const h = ratio(getComputedStyle(halo).stroke, fill);
              minRing = Math.min(minRing, r);
              minHalo = Math.min(minHalo, h);
              if (r < 3) problems.push(`${name}: ring ${r.toFixed(2)}`);
              if (h < 3) problems.push(`${name}: halo ${h.toFixed(2)}`);
            }
            if (!groundOf(halo.getBoundingClientRect()))
              problems.push(`${name}: halo leaves ground`);
            hits.forEach((other, j) => {
              const mine = hits[i];
              if (j > i && mine && overlap(mine, other))
                problems.push(`${name} target overlaps ${items[j]?.dataset.building ?? '?'}`);
            });
          });
          // The pin and the signs sit on their grounds, clear of every link target.
          for (const selector of ['[data-pin] .worlds-chip', '[data-signs] > g', '.worlds-sign']) {
            for (const el of document.querySelectorAll<SVGGraphicsElement>(
              `#world-map ${selector}`,
            )) {
              const box = el.getBoundingClientRect();
              if (!groundOf(box)) problems.push(`${selector} leaves its ground`);
              if (hits.some((hit) => overlap(hit, box))) problems.push(`${selector} on a target`);
            }
          }
          for (const sign of document.querySelectorAll<SVGTextElement>('#world-map .worlds-sign')) {
            const id = sign.parentElement?.dataset.ground ?? '';
            const decor = document.querySelector(`#world-map [data-detail="${id}"]`);
            const box = sign.getBoundingClientRect();
            for (const piece of decor?.children ?? []) {
              if (piece.id === 'worlds-powerline' || piece.matches('[data-ambient]')) continue;
              if (overlap(box, piece.getBoundingClientRect()))
                problems.push(`${id} sign on its decor`);
            }
          }
          const pinChip = document.querySelector('#world-map [data-pin] .worlds-chip');
          const pinText = document.querySelector('#world-map [data-pin] .worlds-label');
          if (pinChip && pinText) {
            const p = ratio(getComputedStyle(pinText).fill, getComputedStyle(pinChip).fill);
            if (p < 4.5) problems.push(`pin text ${p.toFixed(2)}`);
            if (!inside(pinText.getBoundingClientRect(), pinChip.getBoundingClientRect()))
              problems.push('pin text overflows its chip');
          }
          return { problems, minChipText, minRing, minHalo };
        });
        testInfo.annotations.push({
          type: 'contrast',
          description: `min chip text ${report.minChipText.toFixed(2)}:1, ring ${report.minRing.toFixed(2)}:1, halo ${report.minHalo.toFixed(2)}:1`,
        });
        expect(report.problems).toEqual([]);
      });
    }
  }

  async function sizes(page: Page) {
    return page.evaluate(() => {
      const items = [...document.querySelectorAll<SVGGElement>('#world-map [data-building]')];
      let minFont = Infinity;
      let minW = Infinity;
      let minH = Infinity;
      for (const item of items) {
        const hit = item.querySelector('.worlds-hit') as SVGRectElement;
        const label = item.querySelector('.worlds-label') as SVGTextElement;
        const box = hit.getBoundingClientRect();
        const pxPerUnit = box.width / hit.width.baseVal.value;
        minFont = Math.min(minFont, Number(label.getAttribute('font-size')) * pxPerUnit);
        minW = Math.min(minW, box.width);
        minH = Math.min(minH, box.height);
      }
      // Every district sign that is drawn (William, 2026-11-10: same floor as the labels).
      let minSign = Infinity;
      const signs = [...document.querySelectorAll<SVGTextElement>('#world-map .worlds-sign')];
      for (const sign of signs) {
        const ground = sign.parentElement?.querySelector<SVGRectElement>('.worlds-ground');
        if (!ground) continue;
        const k = ground.getBoundingClientRect().width / ground.width.baseVal.value;
        minSign = Math.min(minSign, Number(sign.getAttribute('font-size')) * k);
      }
      return {
        minFont: Math.round(minFont * 10) / 10,
        minSign: signs.length ? Math.round(minSign * 10) / 10 : null,
        signs: signs.length,
        minW,
        minH,
      };
    });
  }

  /**
   * The label floor (William, 2026-11-10): about 12 px wherever the whole map is shown. In
   * the sticky layouts that is the focus zoom-out view (also the hook and Toolbox views);
   * in the overview it is the map itself. Targets: ≥ 24 px sticky, ≥ 44 px overview.
   */
  for (const [width, height, layout] of [
    [1366, 768, 'split'],
    [1280, 720, 'split'],
    [1024, 768, 'split'],
    [1024, 600, 'split'],
    [820, 1180, 'strip'],
    [768, 1024, 'strip'],
    [1000, 800, 'strip'],
    [1000, 600, 'overview'],
    [320, 640, 'overview'],
    [844, 390, 'overview'],
  ] as const) {
    test(`whole map at ${width} × ${height} (${layout}): labels ≥ 12 px, targets big enough`, async ({
      page,
    }, testInfo) => {
      test.skip(
        isMobile(testInfo.project.name) && width !== 320,
        'Sizes are set explicitly; the phone size runs on mobile too.',
      );
      await page.setViewportSize({ width, height });
      await visit(page, 'pt');
      await page.evaluate(() => document.fonts.ready);
      const sticky = layout !== 'overview';
      expect(
        await page.evaluate(
          () => getComputedStyle(document.querySelector('.worlds__stage') as Element).position,
        ),
      ).toBe(sticky ? 'sticky' : 'static');
      if (sticky) {
        await cameraLoaded(page);
        await page.locator('#world-map-title').focus();
        await page.keyboard.press('Shift');
        await page.locator('#world-map a').first().focus();
        await cameraSettled(page);
        expect(await cameraScale(page)).toBeCloseTo(1, 2);
      }
      await page.waitForTimeout(150);
      const s = await sizes(page);
      testInfo.annotations.push({ type: 'sizes', description: JSON.stringify(s) });
      expect(s.minFont).toBeGreaterThanOrEqual(12);
      expect(s.signs).toBeGreaterThan(0);
      expect(s.minSign ?? 0).toBeGreaterThanOrEqual(12);
      expect(s.minW).toBeGreaterThanOrEqual(sticky ? 24 : 44);
      expect(s.minH).toBeGreaterThanOrEqual(sticky ? 24 : 44);
    });
  }
});

test.describe('life on the map (sticky layouts)', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'No camera, ambient or fade on phones.');
  });

  async function settleIn(page: Page, id: string) {
    await page.evaluate((chapter) => {
      const el = document.getElementById(chapter);
      if (el)
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 100,
          behavior: 'instant',
        });
    }, id);
    await cameraSettled(page);
  }

  test('the other districts fade back; buildings and labels never do', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await visit(page);
    await cameraLoaded(page);
    await expect(page.locator('#world-map [data-detail="energy"]')).toBeAttached();
    await settleIn(page, 'energy');
    const opacity = (selector: string) =>
      page.evaluate(
        (sel) =>
          [...document.querySelectorAll(sel)].map((el) => Number(getComputedStyle(el).opacity)),
        selector,
      );
    await expect.poll(() => opacity('#world-map [data-detail="corporate"]')).toEqual([0.35]);
    expect(await opacity('#world-map [data-detail="energy"]')).toEqual([1]);
    for (const selector of [
      '#world-map [data-building]',
      '#world-map .worlds-label',
      '#world-map .worlds-sign',
      '#world-map [data-pin]',
    ]) {
      expect(
        (await opacity(selector)).every((o) => o === 1),
        selector,
      ).toBe(true);
    }
    // Keyboard focus in the map: the whole world at full strength.
    await page.locator('#world-map-title').focus();
    await page.keyboard.press('Shift');
    await page.locator('#world-map a').first().focus();
    await expect.poll(() => opacity('#world-map [data-detail="corporate"]')).toEqual([1]);
  });

  test('ambient touches play when the camera arrives, once, and end within 5 s', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await visit(page);
    await cameraLoaded(page);
    await expect(page.locator('#world-map [data-ambient="pulse"]')).toHaveCount(3);
    // Nothing plays at the arrival overview.
    const gearAt = () =>
      page.evaluate(
        () =>
          document.querySelector('#world-map [data-ambient="gear"]')?.getAttribute('transform') ??
          '',
      );
    const truckAt = () =>
      page.evaluate(
        () =>
          document.querySelector('#world-map [data-ambient="truck"]')?.getAttribute('transform') ??
          '',
      );
    const pulseShown = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('#world-map [data-ambient="pulse"]')].some(
          (p) => Number(getComputedStyle(p).opacity) > 0,
        ),
      );
    expect(await gearAt()).toBe('');

    await settleIn(page, 'origins');
    await expect.poll(gearAt, { timeout: 2000 }).not.toBe('');
    await settleIn(page, 'energy');
    await expect.poll(pulseShown, { timeout: 2000 }).toBe(true);
    const start = Date.now();
    await expect.poll(pulseShown, { timeout: 5000 }).toBe(false);
    expect(Date.now() - start).toBeLessThan(5000);

    await settleIn(page, 'now');
    await expect.poll(truckAt, { timeout: 2000 }).not.toMatch(/^$|matrix\(1,0,0,1,0,0\)/);
    // The truck parks back where it is drawn, within 5 s.
    await expect
      .poll(truckAt, { timeout: 5000 })
      .toMatch(/^matrix\(1,0,0,1,0,0\)$|^translate\(0(px)?,\s?0(px)?\)$|^$/);
  });

  test('Toolbox: the whole world, and a halo on each building whose job used the skill', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await visit(page);
    await cameraLoaded(page);
    await settleIn(page, 'toolbox');
    await page.getByRole('button', { name: 'Xamarin', exact: true }).click();
    await settleIn(page, 'toolbox');
    expect(await cameraScale(page)).toBeCloseTo(1, 2);
    const halos = () =>
      page.evaluate(() => {
        const out: Record<string, number> = {};
        for (const g of document.querySelectorAll<SVGGElement>('#world-map [data-building]')) {
          out[g.dataset.building ?? '?'] = Number(
            getComputedStyle(g.querySelector('.worlds-halo') as Element).opacity,
          );
        }
        return out;
      });
    await expect.poll(async () => (await halos()).plant).toBe(1);
    const others = Object.entries(await halos()).filter(([id]) => id !== 'plant');
    expect(others.every(([, o]) => o === 0)).toBe(true);
    // The halo is also on screen: the stage shows the whole world.
    await expect(page.locator('#world-map [data-building="plant"] .worlds-halo')).toBeInViewport();
  });
});

test.describe('vignettes', () => {
  test('only the overview layout shows a vignette atop each chapter', async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'Sizes are set explicitly.');
    await page.setViewportSize(DESKTOP);
    await visit(page);
    const shown = () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll('.worlds-vignette')].filter(
            (v) => getComputedStyle(v).display !== 'none',
          ).length,
      );
    expect(await shown()).toBe(0);
    await page.setViewportSize(PHONE);
    expect(await shown()).toBe(8);
    const above = await page.evaluate(() => {
      const v = document.querySelector('#energy .worlds-vignette')?.getBoundingClientRect();
      const h = document.querySelector('#energy h2')?.getBoundingClientRect();
      return !!v && !!h && v.bottom <= h.top;
    });
    expect(above).toBe(true);
  });
});

test('every chapter shows its district name above its heading', async ({ page }) => {
  await visit(page);
  const order = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-chapter]')].map((section) => {
      const district = section.querySelector('.worlds-district');
      const heading = section.querySelector('h1, h2');
      return {
        id: section.id,
        above:
          !!district &&
          !!heading &&
          district.getBoundingClientRect().bottom <= heading.getBoundingClientRect().top + 1,
      };
    }),
  );
  expect(order.every((c) => c.above)).toBe(true);
  // The ATOS Jan–Jun 2023 entry: its own neutral "Between worlds" panel.
  const between = page.locator('[data-job="atos-frontend"]');
  await expect(between.locator('.worlds-card__eyebrow')).toHaveText(
    en.worlds.districts.betweenWorlds,
  );
  const colors = await between.evaluate((el) => ({
    card: getComputedStyle(el).backgroundColor,
    chapter: getComputedStyle(el.closest('[data-chapter]') as Element).backgroundColor,
  }));
  expect(colors.card).toBe('rgb(37, 41, 49)');
  expect(colors.chapter).toBe('rgb(14, 39, 71)');
  expect(cv.jobs.find((j) => j.id === 'atos-frontend')?.sector).toBeUndefined();
});

test('the district palettes in CSS match the palette data the contrast checks use', async ({
  page,
}) => {
  await visit(page);
  const css = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<SVGGElement>('#world-map [data-ground]')].map((g) => {
        const style = getComputedStyle(g);
        // The minifier may shorten #ffffff to #fff: expand three-digit hex before comparing.
        const read = (name: string) =>
          style
            .getPropertyValue(name)
            .trim()
            .toUpperCase()
            .replace(/^#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3');
        const district = [...g.classList].find((c) => c.startsWith('wd-'))?.slice(3) ?? '?';
        return [
          district,
          {
            bg: read('--d-bg'),
            surface: read('--d-surface'),
            text: read('--d-text'),
            muted: read('--d-muted'),
            accent: read('--d-accent'),
            accentContrast: read('--d-accent-contrast'),
          },
        ];
      }),
    ),
  );
  expect(css).toEqual(PALETTES);
});
