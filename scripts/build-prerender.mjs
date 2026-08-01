/**
 * Regenerates the crawler-visible HTML entries (en.html, sq.html) and the meta
 * block of index.html from the per-locale translation.json files.
 *
 * Why this exists: the landing hero, meta tags and FAQ JSON-LD used to be
 * hand-maintained in three HTML files. They drifted from the app's real copy
 * (the live page advertised multi-currency support the app does not have).
 * Deriving them from the same i18n keys the React page renders makes
 * "bot-visible HTML == rendered HTML" a property of the build, not a promise.
 *
 * Run: node scripts/build-prerender.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ORIGIN = 'https://personal-finances.app';

// Must match FAQ_KEYS in src/components/LandingPage.jsx — same order, same set,
// so the structured data matches the accordion a visitor actually sees.
const FAQ_KEYS = ['free', 'albanian', 'howLong', 'encrypted', 'switch', 'advice', 'multidevice', 'cancel'];

const LOCALES = {
  en: { htmlLang: 'en', file: 'en.html', url: `${ORIGIN}/`,   ogLocale: 'en_US', altLocale: 'sq_AL', card: 'social-card-en.png' },
  sq: { htmlLang: 'sq', file: 'sq.html', url: `${ORIGIN}/sq`, ogLocale: 'sq_AL', altLocale: 'en_US', card: 'social-card-sq.png' },
};

const load = (lang) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', lang, 'translation.json'), 'utf8'));

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Secondary-feature keys double as the noscript feature list: one list, so a
// feature cannot appear to crawlers that the page does not also claim.
const FEATURE_KEYS = [
  'recurring', 'goals', 'networth', 'reports',
  'notifications', 'csvImport', 'categories', 'albanian', 'currency', 'encryption',
];

function buildJsonLd(t, cfg, lang) {
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_KEYS.map((k) => ({
      '@type': 'Question',
      name: t.landing.faq.items[k].q,
      acceptedAnswer: { '@type': 'Answer', text: t.landing.faq.items[k].a },
    })),
  };
  // SoftwareApplication with a free offer. No aggregateRating: there are no
  // real ratings, and inventing them would be fabricated proof.
  const app = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Personal Finance Tracker',
    url: cfg.url,
    description: t.meta.description,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    inLanguage: lang,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    featureList: FEATURE_KEYS.map((k) => t.landing.secondaryFeatures.items[k]),
  };
  return [app, faq]
    .map((b) => `    <script type="application/ld+json">\n${JSON.stringify(b, null, 6).replace(/^/gm, '    ')}\n    </script>`)
    .join('\n');
}

function buildHtml(lang) {
  const cfg = LOCALES[lang];
  const t = load(lang);
  const title = t.meta.title;
  const desc = t.meta.description;
  const h1 = `${t.landing.hero.titleLine1} ${t.landing.hero.titleAccent}`;

  return `<!doctype html>
<html lang="${cfg.htmlLang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Apply dark mode before first paint to avoid a light->dark flash (FOUC/CLS).
         Reads the same key useDarkMode writes; React state stays in sync. -->
    <script>try{if(localStorage.getItem('expense_dark_mode')==='1')document.documentElement.classList.add('dark')}catch(e){}</script>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23111113'/%3E%3Ctext x='50%25' y='50%25' dy='.1em' text-anchor='middle' dominant-baseline='middle' font-family='Space Grotesk, Arial, sans-serif' font-size='42' font-weight='700' fill='%230B5D3B'%3E%24%3C/text%3E%3C/svg%3E">
    <link rel="preload" as="font" type="font/woff2" href="/fonts/inter-tight-latin.woff2" crossorigin>
    <link rel="preload" as="font" type="font/woff2" href="/fonts/hanken-grotesk-latin.woff2" crossorigin>
    <link rel="preload" as="font" type="font/woff2" href="/fonts/inter-tight-latin-ext.woff2" crossorigin>
    <link rel="dns-prefetch" href="https://zxihkymybbywxnqfxlql.supabase.co">
    <link rel="dns-prefetch" href="https://gc.zgo.at">
    <link rel="canonical" href="${cfg.url}" />
    <link rel="alternate" hreflang="en" href="${ORIGIN}/" />
    <link rel="alternate" hreflang="sq" href="${ORIGIN}/sq" />
    <link rel="alternate" hreflang="x-default" href="${ORIGIN}/" />

    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#0B5D3B" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:image" content="${ORIGIN}/${cfg.card}" />
    <meta property="og:image:alt" content="${esc(h1)}" />
    <meta property="og:url" content="${cfg.url}" />
    <meta property="og:site_name" content="Personal Finance Tracker" />
    <meta property="og:locale" content="${cfg.ogLocale}" />
    <meta property="og:locale:alternate" content="${cfg.altLocale}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${ORIGIN}/${cfg.card}" />
    <meta name="twitter:image:alt" content="${esc(h1)}" />

${buildJsonLd(t, cfg, lang)}
  </head>
  <body>
    <div id="root"></div>
    <!-- Fallback for crawlers that do not execute JavaScript. Mirrors the
         rendered hero exactly: same H1, same subtitle, same primary action. -->
    <noscript>
      <h1>${esc(h1)}</h1>
      <p>${esc(t.landing.hero.subtitle)}</p>
      <ul>
${FEATURE_KEYS.map((k) => `        <li>${esc(t.landing.secondaryFeatures.items[k])}</li>`).join('\n')}
      </ul>
      <a href="/register">${esc(t.landing.hero.getStarted)}</a> &middot;
      <a href="/pricing">${esc(t.landing.finalCta.secondary)}</a>
    </noscript>
    <script type="module" src="/src/main.jsx"></script>
    <script data-goatcounter="https://marindulja.goatcounter.com/count"
            defer src="//gc.zgo.at/count.js"></script>
  </body>
</html>
`;
}

for (const lang of Object.keys(LOCALES)) {
  const out = path.join(ROOT, LOCALES[lang].file);
  fs.writeFileSync(out, buildHtml(lang));
  console.log('wrote', LOCALES[lang].file);
}

// index.html is the Vite entry: it keeps its own script/module wiring, so only
// its head copy + JSON-LD are regenerated from the English locale.
const idxPath = path.join(ROOT, 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
const en = load('en');
const enH1 = `${en.landing.hero.titleLine1} ${en.landing.hero.titleAccent}`;

const replaceTag = (html, re, val) => html.replace(re, val);
idx = replaceTag(idx, /<title>[^<]*<\/title>/, `<title>${esc(en.meta.title)}</title>`);
idx = replaceTag(idx, /(<meta name="description" content=")[^"]*(")/, `$1${esc(en.meta.description)}$2`);
idx = replaceTag(idx, /(<meta name="theme-color" content=")[^"]*(")/, '$1#0B5D3B$2');
idx = replaceTag(idx, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(en.meta.title)}$2`);
idx = replaceTag(idx, /(<meta property="og:description" content=")[^"]*(")/, `$1${esc(en.meta.description)}$2`);
idx = replaceTag(idx, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(en.meta.title)}$2`);
idx = replaceTag(idx, /(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(en.meta.description)}$2`);

// Swap every existing JSON-LD block for the freshly generated pair. Matching
// from the first block to the last (rather than an exact adjacent pair) keeps
// this working regardless of comments or blank lines between them.
{
  const blocks = [...idx.matchAll(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g)];
  if (blocks.length === 0) throw new Error('index.html: no JSON-LD block found to replace');
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  const start = first.index;
  const end = last.index + last[0].length;
  idx = idx.slice(0, start) + buildJsonLd(en, LOCALES.en, 'en') + '\n' + idx.slice(end);
}

// noscript fallback mirrors the hero.
idx = idx.replace(
  /<noscript>[\s\S]*?<\/noscript>/,
  `<noscript>
      <h1>${esc(enH1)}</h1>
      <p>${esc(en.landing.hero.subtitle)}</p>
      <ul>
${FEATURE_KEYS.map((k) => `        <li>${esc(en.landing.secondaryFeatures.items[k])}</li>`).join('\n')}
      </ul>
      <a href="/register">${esc(en.landing.hero.getStarted)}</a> &middot;
      <a href="/pricing">${esc(en.landing.finalCta.secondary)}</a>
    </noscript>`
);

fs.writeFileSync(idxPath, idx);
console.log('wrote index.html (head + JSON-LD + noscript)');
