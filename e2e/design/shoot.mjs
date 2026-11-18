// Screenshot the design harness (spec section 7). Requires the harness server:
//   npx vite --config e2e/design/vite.config.js      (port 5299)
// Usage:
//   node e2e/design/shoot.mjs --pages dashboard,transactions --widths 375,1280 --themes light,dark --langs en,sq
// Writes docs/redesign/screenshots/<page>-<width>-<theme>-<lang>.png and prints
// page errors and horizontal overflow per shot.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return (i > -1 ? process.argv[i + 1] : def).split(',').filter(Boolean);
};
const pages = arg('pages', 'dashboard');
const widths = arg('widths', '375,768,1024,1280,1440').map(Number);
const themes = arg('themes', 'light,dark');
const langs = arg('langs', 'en,sq');
const reduced = process.argv.includes('--reduced');
const base = arg('base', 'http://localhost:5299')[0];
const out = resolve('docs/redesign/screenshots');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
let problems = 0;
for (const page of pages) {
  for (const width of widths) {
    for (const theme of themes) {
      for (const lang of langs) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
        const p = await ctx.newPage();
        const errors = [];
        p.on('pageerror', (e) => errors.push(e.message));
        p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        const [path, query = ''] = page.split('?');
        await p.goto(`${base}/${lang === 'sq' ? 'sq/' : ''}${path}?theme=${theme}&lang=${lang}${query ? `&${query}` : ''}`, { waitUntil: 'networkidle' });
        await p.evaluate(() => document.fonts.ready);
        // Walk the page so scroll reveals fire, then let entrances finish.
        await p.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
          window.scrollTo(0, 0);
        });
        await p.waitForTimeout(reduced ? 200 : 2200);
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const name = `${path.replace(/\//g, '_')}${query ? `_${query.replace(/[=&]/g, '-')}` : ''}-${width}-${theme}-${lang}${reduced ? '-reduced' : ''}.png`;
        await p.screenshot({ path: resolve(out, name), fullPage: true });
        const flag = overflow > 0 || errors.length;
        if (flag) problems += 1;
        console.log(`${flag ? 'WARN' : 'ok  '} ${name}${overflow > 0 ? ` overflow=${overflow}px` : ''}${errors.length ? ` errors=${JSON.stringify(errors.slice(0, 3))}` : ''}`);
        await ctx.close();
      }
    }
  }
}
await browser.close();
process.exitCode = problems ? 1 : 0;
