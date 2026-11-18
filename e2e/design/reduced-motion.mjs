// QA (spec section 7, I3): with prefers-reduced-motion: reduce emulated, no
// element has a running animation and count-ups show their final value on
// the first frame. Needs the design harness (5299) and, for public pages, a
// preview build (4173).
//   node e2e/design/reduced-motion.mjs
import { chromium } from 'playwright';

const PAGES = [
  ['harness dashboard', 'http://localhost:5299/dashboard?lang=en', '[class*="text-kpi"]'],
  ['harness budgets', 'http://localhost:5299/budgets?lang=en', '[class*="text-kpi"]'],
  ['harness goals', 'http://localhost:5299/goals?lang=en', '[class*="text-kpi"]'],
  ['harness networth', 'http://localhost:5299/networth?lang=en', '[class*="text-kpi"]'],
  ['landing', 'http://localhost:4173/', 'h1'],
  ['salary tool', 'http://localhost:4173/tools/salary-calculator', '[class*="text-kpi"]'],
];

const browser = await chromium.launch();
let failures = 0;
for (const [name, url, sel] of PAGES) {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector(sel, { timeout: 15000 });
  const first = await p.locator(sel).first().innerText();
  await p.waitForTimeout(2500);
  const settled = await p.locator(sel).first().innerText();
  const running = await p.evaluate(() => document.getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => `${a.animationName || a.constructor.name} on ${a.effect?.target?.className?.toString().slice(0, 60)}`));
  const ok = running.length === 0 && first === settled;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: running=${running.length}${running.length ? ` ${JSON.stringify(running.slice(0, 3))}` : ''} first="${first.slice(0, 30)}" settled="${settled.slice(0, 30)}"`);
  await ctx.close();
}
await browser.close();
process.exitCode = failures ? 1 : 0;
