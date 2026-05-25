import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Critters from 'critters'

// Injects modulepreload hints for the locale bundle only.
// Recharts is intentionally excluded — it's only needed after DemoWorkspace
// lazy-loads, and preloading it wastes 107 KiB on the landing page critical path.
function resourceHintsPlugin() {
  const collected = { localeEn: '', localeSq: '' };

  return {
    name: 'resource-hints',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.moduleIds) {
          const ids = chunk.moduleIds.join('|');
          if (ids.includes('locales/en/translation')) collected.localeEn = '/' + fileName;
          if (ids.includes('locales/sq/translation')) collected.localeSq = '/' + fileName;
        }
      }
    },
    transformIndexHtml(html, ctx) {
      const isSq = ctx.filename?.includes('sq.html');
      const localeHint = isSq ? collected.localeSq : collected.localeEn;
      if (!localeHint) return html;
      const hint = `  <link rel="modulepreload" href="${localeHint}">\n`;
      return html.replace('<link rel="preload" as="font"', hint + '  <link rel="preload" as="font"');
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
        preload: 'media',  // media=print trick — most reliable non-blocking method
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

export default defineConfig({
  plugins: [react(), resourceHintsPlugin(), criticalCssPlugin()],
  css: {
    postcss: true,
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
