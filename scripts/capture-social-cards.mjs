import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Regenerates the OG/Twitter social cards from the live landing page.
 *
 * Run the dev server first, then: node scripts/capture-social-cards.mjs
 *
 * The card is the hero, clipped to where the hero section actually ends (that
 * bound is MEASURED at runtime, not hardcoded — a fixed pixel height silently
 * rots every time the hero copy or spacing changes, which is how the previous
 * version ended up with a band of dead space).
 *
 * The capture is faithful to the live hero: no copy or CTA is rewritten at
 * capture time, so the preview always matches the page it links to.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });

const targets = [
  { path: '/',   file: 'social-card-en.png' },
  { path: '/sq', file: 'social-card-sq.png' },
];

const WIDTH = 1600;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  // Tall enough that the whole hero (headline through the artwork) fits without
  // scrolling, so the clip never runs past the rendered viewport.
  viewport: { width: WIDTH, height: 1300 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});

// The app persists theme in localStorage and applies it via a class on <html>.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('darkMode', 'true');
  } catch {}
});

for (const { path, file } of targets) {
  const page = await ctx.newPage();
  const url = `http://localhost:5173${path}`;
  console.log(`→ ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForSelector('h1', { timeout: 10000 });
  await page.waitForTimeout(1200);

  // The card is a faithful capture of the real hero: the actual CTAs
  // ("Filloni Falas" / "Identifikohu") and the real trust line. Nothing is
  // swapped or rewritten at capture time — a preview that differs from the
  // page it links to is a small broken promise to whoever clicks it.

  await page.waitForTimeout(400);

  // Measure the hero's own bounds. Both edges matter: the TOP because the
  // sticky navbar sits above it (cropping from y=0 shaved a sliver of the nav
  // into the card), and the BOTTOM because the section's generous padding reads
  // as dead space in a preview, where the crop is all anyone sees.
  const bounds = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const hero = h1?.closest('section');
    if (!hero) return { top: 0, bottom: 660 };

    const heroRect = hero.getBoundingClientRect();

    // Deepest LEAF element — containers are skipped because their padding is
    // exactly the dead space we are trying to crop away. Images count as
    // leaves, so the hero artwork is included rather than sliced.
    let deepest = 0;
    hero.querySelectorAll('*').forEach((el) => {
      if (el.children.length > 0) return; // containers carry the padding
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.bottom > deepest) deepest = r.bottom;
    });

    const PAD = 44; // breathing room under the last element
    return {
      top: Math.max(0, Math.round(heroRect.top)),
      bottom: Math.round(Math.min(deepest + PAD, heroRect.bottom)),
    };
  });
  const height = bounds.bottom - bounds.top;

  /**
   * Fit the hero to the 1.91:1 OG frame. Shipping the raw content height
   * (~2.7:1) would let WhatsApp/Facebook re-crop on their terms, which is how
   * headlines end up sliced in half.
   *
   * When the hero is shorter than the frame we grow the hero itself rather
   * than extending the crop downward — the next section starts immediately
   * below and would otherwise bleed a stray heading into the card.
   */
  const OG_RATIO = 1.91;
  const target = Math.round(WIDTH / OG_RATIO); // 1600 -> 838

  if (height > target) {
    // Taller than the frame: centre the trim WITHIN the hero, offset from the
    // hero's own top rather than the viewport's, so the navbar never bleeds in.
    const y = bounds.top + Math.round((height - target) / 2);
    var clip = { x: 0, y, width: WIDTH, height: target };
  } else {
    // Shorter: grow the hero itself so it genuinely fills the frame.
    await page.evaluate((h) => {
      const hero = document.querySelector('h1')?.closest('section');
      if (hero) {
        hero.style.minHeight = `${h}px`;
        hero.style.display = 'flex';
        hero.style.flexDirection = 'column';
        hero.style.justifyContent = 'center';
      }
    }, target);
    await page.waitForTimeout(400);
    // Re-measure: growing the hero moves its top edge.
    const heroTop = await page.evaluate(() => {
      const hero = document.querySelector('h1')?.closest('section');
      return hero ? Math.max(0, Math.round(hero.getBoundingClientRect().top)) : 0;
    });
    var clip = { x: 0, y: heroTop, width: WIDTH, height: target };
  }

  const out = resolve(publicDir, file);
  await page.screenshot({
    path: out,
    clip,
    fullPage: false,
  });
  console.log(`  saved → ${out}  (${clip.width}x${clip.height}, ratio ${(clip.width / clip.height).toFixed(2)})`);
  await page.close();
}

await browser.close();
console.log('\nDone.');
