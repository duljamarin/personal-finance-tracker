import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Critters from 'critters'

// Injects modulepreload hints for the locale bundle only.
// Recharts is intentionally excluded — it's only needed after DemoWorkspace
// lazy-loads, and preloading it wastes 107 KiB on the landing page critical path.
function resourceHintsPlugin() {
  const collected = { localeEn: '', localeSq: '', landingPage: '' };

  return {
    name: 'resource-hints',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.moduleIds) {
          const ids = chunk.moduleIds.join('|');
          if (ids.includes('locales/en/translation')) collected.localeEn = '/' + fileName;
          if (ids.includes('locales/sq/translation')) collected.localeSq = '/' + fileName;
          if (ids.includes('LandingPage') && !ids.includes('DemoWorkspace')) collected.landingPage = '/' + fileName;
        }
      }
    },
    transformIndexHtml(html, ctx) {
      const isSq = ctx.filename?.includes('sq.html');
      const localeHint = isSq ? collected.localeSq : collected.localeEn;
      let hints = '';
      // Preload LandingPage chunk to eliminate main→LandingPage hop from critical path
      if (collected.landingPage) hints += `  <link rel="modulepreload" href="${collected.landingPage}">\n`;
      if (localeHint) hints += `  <link rel="modulepreload" href="${localeHint}">\n`;
      if (!hints) return html;
      return html.replace('<link rel="preload" as="font"', hints + '  <link rel="preload" as="font"');
    },
  };
}

// Extracts above-the-fold CSS and inlines it, converting the full stylesheet
// to load asynchronously — eliminates the render-blocking CSS penalty.
function criticalCssPlugin() {
  return {
    name: 'critical-css',
    apply: 'build',
    async closeBundle() {
      const path = await import('path');
      const fs = await import('fs');
      const outDir = path.resolve('dist');

      const critters = new Critters({
        path: outDir,
        publicPath: '/',
        preload: 'swap',   // loads full CSS async, no FOUC
        pruneSource: false,
        logLevel: 'silent',
      });

      const htmlFiles = ['index.html', 'en.html', 'sq.html']
        .map(f => path.join(outDir, f))
        .filter(f => fs.existsSync(f));

      for (const file of htmlFiles) {
        const html = fs.readFileSync(file, 'utf8');
        const result = await critters.process(html);
        fs.writeFileSync(file, result);
      }
    },
  };
}

// Prerender a minimal, correct <head> per public tool route.
//
// Why this exists: the app is a pure SPA with only two built shells (index.html
// English, sq.html Albanian). Netlify serves /sq/* → sq.html and /* → index.html,
// so every tool route inherits the LANDING PAGE's static canonical (/ or /sq).
// Google reads that raw-HTML canonical before running JS and concludes each tool
// is a duplicate of the home page, blocking separate indexing. useMetaTags fixes
// the head client-side, but too late for the crawler's first pass.
//
// The fix: emit one static HTML file per tool route per language, cloned from the
// matching language shell with a SELF-referencing canonical, correct og:url,
// reciprocal hreflang, and route-specific title/description baked into the served
// HTML. The React app still boots and hydrates identically — only the crawlable
// head differs. Netlify then maps each route to its own file (see public/_redirects).
//
// SITE and TOOL_SEO are the single source of truth for these routes; keep them in
// sync with the TOOLS registry and the sitemap.
const SITE = 'https://personal-finances.app';
const TOOL_SEO = [
  {
    path: '/tools/salary-calculator',
    en: { title: 'Net/Gross Salary Calculator (Albania) | Personal Finances', desc: 'Albanian salary calculator: work out net pay from gross, gross from net, and the total employer cost, including income tax and social and health insurance.' },
    sq: { title: 'Kalkulator Page Neto/Bruto (Shqipëri) | Personal Finances', desc: 'Kalkulator page për Shqipërinë: llogarit pagën neto nga bruto, bruto nga neto dhe koston totale të punëdhënësit, përfshirë tatimin mbi të ardhurat dhe sigurimet.' },
  },
  {
    path: '/tools/self-employed-calculator',
    en: { title: 'Self-Employed Tax Calculator (Albania) | Personal Finances', desc: 'Self-employed calculator for Albania: work out your take-home with the 0% freelancer profit tax, the fixed monthly contributions and the VAT threshold.' },
    sq: { title: 'Kalkulator për të Vetëpunësuarit (Shqipëri) | Personal Finances', desc: 'Kalkulator për të vetëpunësuarit në Shqipëri: llogarit sa të mbetet me tatimin 0% mbi fitimin, kontributet fikse mujore dhe pragun e TVSH-së.' },
  },
  {
    path: '/tools/loan-calculator',
    en: { title: 'Loan and Mortgage Calculator (Albania) | Personal Finances', desc: 'Free loan and mortgage calculator for Albania. Work out the monthly installment, total interest, a fixed-then-variable rate, the effect of a rate rise and early repayment.' },
    sq: { title: 'Kalkulator Kredie dhe Hipoteke (Shqipëri) | Personal Finances', desc: 'Kalkulator falas kredie dhe hipoteke për Shqipërinë. Llogarit këstin mujor, interesin total, normën fikse pastaj të ndryshueshme, efektin e rritjes dhe shlyerjen para afatit.' },
  },
];

function prerenderToolRoutesPlugin() {
  return {
    name: 'prerender-tool-routes',
    apply: 'build',
    async closeBundle() {
      const path = await import('path');
      const fs = await import('fs');
      const outDir = path.resolve('dist');

      const shellFor = (lang) => {
        const file = path.join(outDir, lang === 'sq' ? 'sq.html' : 'index.html');
        return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      };

      // Rewrite the head of a shell for one concrete route + language.
      const buildPage = (shell, lang, seo, enUrl, sqUrl) => {
        const selfUrl = lang === 'sq' ? sqUrl : enUrl;
        const esc = (s) => s.replace(/"/g, '&quot;');
        let html = shell;

        // canonical: point at THIS route in THIS language (self-referencing).
        html = html.replace(
          /<link rel="canonical"[^>]*>/,
          `<link rel="canonical" href="${selfUrl}">`
        );
        // Replace the whole reciprocal hreflang set with the route's own.
        html = html.replace(
          /<link rel="alternate" hreflang="en"[^>]*>\s*<link rel="alternate" hreflang="sq"[^>]*>\s*<link rel="alternate" hreflang="x-default"[^>]*>/,
          `<link rel="alternate" hreflang="en" href="${enUrl}">\n    <link rel="alternate" hreflang="sq" href="${sqUrl}">\n    <link rel="alternate" hreflang="x-default" href="${enUrl}">`
        );
        // og:url self-references too.
        html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${selfUrl}">`);
        // Title + description (name the tool, not the home page).
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${seo.title}</title>`);
        html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(seo.desc)}">`);
        html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(seo.title)}">`);
        html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(seo.desc)}">`);
        return html;
      };

      // dist file layout: /tools/x → dist/tools/x.html ; /sq/tools/x → dist/sq/tools/x.html
      const enShell = shellFor('en');
      const sqShell = shellFor('sq');
      for (const tool of TOOL_SEO) {
        const enUrl = `${SITE}${tool.path}`;
        const sqUrl = `${SITE}/sq${tool.path}`;
        if (enShell) {
          const enOut = path.join(outDir, `${tool.path.replace(/^\//, '')}.html`);
          fs.mkdirSync(path.dirname(enOut), { recursive: true });
          fs.writeFileSync(enOut, buildPage(enShell, 'en', tool.en, enUrl, sqUrl));
        }
        if (sqShell) {
          const sqOut = path.join(outDir, `sq${tool.path}.html`);
          fs.mkdirSync(path.dirname(sqOut), { recursive: true });
          fs.writeFileSync(sqOut, buildPage(sqShell, 'sq', tool.sq, enUrl, sqUrl));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), resourceHintsPlugin(), criticalCssPlugin(), prerenderToolRoutesPlugin()],
  css: {
    postcss: true,
  },
  esbuild: {
    // Strip noisy console calls from production builds. console.error is preserved
    // for production triage. Dev (vite serve) is unaffected.
    pure: ['console.log', 'console.warn', 'console.debug', 'console.info'],
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        en: 'en.html',
        sq: 'sq.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('supabaseClient')) return 'supabase';
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('recharts') || id.includes('victory-vendor') || id.includes('d3-')) return 'recharts';
          if (id.includes('papaparse')) return 'csv';
          if (id.includes('react-router')) return 'react';
          if (/[\\/]react[\\/]|[\\/]react-dom[\\/]|[\\/]scheduler[\\/]/.test(id)) return 'react';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
          if (id.includes('locales/en/translation')) return 'locale-en';
          if (id.includes('locales/sq/translation')) return 'locale-sq';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('zod') || id.includes('@hookform')) return 'forms';
        },
      },
    },
  },
})
