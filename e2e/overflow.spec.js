import { test, expect } from '@playwright/test';

// iOS Safari horizontal-overflow suite. Runs in WebKit (see playwright.config.js)
// because Chromium's line-breaker is more forgiving with unbreakable runs than
// WebKit's, which is exactly why this bug reproduced on iPhone but not Android.

const WIDTHS = [320, 375, 390, 430];
const LANGS = ['sq', 'en'];

// Public routes reachable without auth.
const PUBLIC_ROUTES = [
  ['landing', '/'],
  ['pricing', '/pricing'],
  ['login', '/login'],
  ['register', '/register'],
];

// Authed pages are covered by the component harness instead of a live account.
const HARNESS_SECTIONS = [
  'budget-card',
  'goal-card',
  'category-card',
  'report-summary',
  'dashboard-summary',
  'delete-modal',
];

const PHASE = process.env.OVERFLOW_PHASE || 'after';

/**
 * Guard against vacuous passes. An empty page trivially satisfies every
 * overflow assertion, so a blank render (a bad import, a thrown effect) would
 * look like a green suite. This asserts the page actually painted content
 * before any overflow claim is trusted.
 */
async function expectPageRendered(page, label, minChars = 20) {
  const stats = await page.evaluate(() => ({
    text: (document.body.innerText || '').trim().length,
    els: document.querySelectorAll('body *').length,
    errors: window.__PAGE_ERRORS__ || [],
  }));
  expect(stats.errors, `${label}: page errors\n${JSON.stringify(stats.errors, null, 2)}`).toEqual([]);
  expect(stats.els, `${label}: only ${stats.els} elements - page did not render`).toBeGreaterThan(5);
  expect(stats.text, `${label}: only ${stats.text} chars of text - page did not render`)
    .toBeGreaterThanOrEqual(minChars);
}

/** Assertion 1: the document must not scroll horizontally. */
async function expectNoDocumentOverflow(page, label) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `${label}: document.scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`)
    .toBeLessThanOrEqual(innerWidth);
}

/**
 * Assertion 2: no element's right edge may exceed its offsetParent's right edge
 * by more than 1px. Elements inside a deliberate horizontal-scroll container
 * are exempt - that is a designed affordance, not an overflow bug.
 */
async function findChildOverflows(page) {
  return page.evaluate(() => {
    const TOL = 1;
    const bad = [];
    const inScroller = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll('body *')) {
      const parent = el.offsetParent;
      if (!parent || parent === document.body) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (inScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // A fixed-position element is laid out against the viewport, not its
      // offsetParent, so the viewport is the correct containing edge for it.
      // Skipping these entirely would exempt every modal from the suite.
      const pr =
        cs.position === 'fixed'
          ? { right: window.innerWidth }
          : parent.getBoundingClientRect();
      const overflowBy = r.right - pr.right;
      if (overflowBy > TOL) {
        bad.push({
          overflowBy: Math.round(overflowBy * 100) / 100,
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.toString?.() || '').slice(0, 90),
          text: (el.textContent || '').trim().slice(0, 50),
        });
      }
    }
    return bad;
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__PAGE_ERRORS__ = [];
    window.addEventListener('error', (e) => window.__PAGE_ERRORS__.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => window.__PAGE_ERRORS__.push('unhandled: ' + String(e.reason)));
  });
});

test.describe('iOS Safari (WebKit) horizontal overflow', () => {
  for (const width of WIDTHS) {
    for (const lang of LANGS) {
      test.describe(`${width}px / ${lang}`, () => {
        test.use({ viewport: { width, height: 900 } });

        for (const [name, path] of PUBLIC_ROUTES) {
          test(`public: ${name}`, async ({ page }) => {
            await page.addInitScript((l) => {
              try { localStorage.setItem('i18nextLng', l); } catch {}
            }, lang);
            await page.goto(path, { waitUntil: 'networkidle' });
            await page.waitForTimeout(300);

            await page.screenshot({
              path: `e2e/screenshots/${PHASE}/${name}-${width}-${lang}.png`,
              fullPage: true,
            });

            const label = `${name} @${width} ${lang}`;
            await expectPageRendered(page, label);
            await expectNoDocumentOverflow(page, label);
            const bad = await findChildOverflows(page);
            expect(bad, `${label}: ${bad.length} child overflow(s)\n${JSON.stringify(bad, null, 2)}`)
              .toEqual([]);
          });
        }

        for (const section of HARNESS_SECTIONS) {
          test(`harness: ${section}`, async ({ page }) => {
            await page.goto(`http://localhost:5199/?c=${section}&lang=${lang}`, {
              waitUntil: 'networkidle',
            });
            // The delete modal renders as a fixed-position overlay, so its
            // wrapper <section> has zero height. Attachment, not visibility, is
            // the correct readiness signal for it.
            await page.waitForSelector(`[data-harness="${section}"]`, {
              state: 'attached',
              timeout: 10000,
            });
            await page.waitForTimeout(300);

            await page.screenshot({
              path: `e2e/screenshots/${PHASE}/${section}-${width}-${lang}.png`,
              fullPage: true,
            });

            const label = `${section} @${width} ${lang}`;
            await expectPageRendered(page, label);
            await expectNoDocumentOverflow(page, label);
            const bad = await findChildOverflows(page);
            expect(bad, `${label}: ${bad.length} child overflow(s)\n${JSON.stringify(bad, null, 2)}`)
              .toEqual([]);
          });
        }

        // Invariant 4: the hostile seed strings must still be fully present in
        // the DOM and laid out, not silently clipped to zero size.
        test('seed content remains fully readable', async ({ page }) => {
          await page.goto(`http://localhost:5199/?c=full-content&lang=${lang}`, {
            waitUntil: 'networkidle',
          });
          for (const seed of ['category', 'title', 'email']) {
            const el = page.locator(`[data-seed="${seed}"]`);
            const text = (await el.textContent()).trim();
            expect(text.length, `${seed} seed shorter than 40 chars`).toBeGreaterThanOrEqual(40);
            const box = await el.boundingBox();
            expect(box.height, `${seed} collapsed to zero height`).toBeGreaterThan(0);
            expect(box.width, `${seed} exceeds viewport`).toBeLessThanOrEqual(width);
          }
        });
      });
    }
  }
});

// Invariant 2: no visual change at desktop widths.
test.describe('desktop unchanged', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const lang of LANGS) {
    test(`1440px / ${lang} baseline`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `e2e/screenshots/${PHASE}/desktop-landing-1440-${lang}.png`, fullPage: true });
      await expectNoDocumentOverflow(page, `desktop ${lang}`);
    });
    test(`1440px / ${lang} harness`, async ({ page }) => {
      await page.goto(`http://localhost:5199/?lang=${lang}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `e2e/screenshots/${PHASE}/desktop-harness-1440-${lang}.png`, fullPage: true });
    });
  }
});
