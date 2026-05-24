import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Injects critical resource hints so the browser parallelises fetches:
//   - <link rel="preload" as="style">  for the main CSS (eliminates render-blocking delay)
//   - <link rel="modulepreload">       for recharts (breaks the 4-hop lazy-load chain on LandingPage)
function resourceHintsPlugin() {
  const collected = { css: '', recharts: '', localeEn: '', localeSq: '' };

  return {
    name: 'resource-hints',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.startsWith('assets/main') && fileName.endsWith('.css')) {
          collected.css = '/' + fileName;
        }
        if (fileName.startsWith('assets/recharts') && fileName.endsWith('.js')) {
          collected.recharts = '/' + fileName;
        }
        // Identify locale chunks by their source module paths
        if (chunk.type === 'chunk' && chunk.moduleIds) {
          const ids = chunk.moduleIds.join('|');
          if (ids.includes('locales/en/translation')) collected.localeEn = '/' + fileName;
          if (ids.includes('locales/sq/translation')) collected.localeSq = '/' + fileName;
        }
      }
    },
    transformIndexHtml(html, ctx) {
      let hints = '';
      if (collected.css) {
        hints += `  <link rel="preload" as="style" href="${collected.css}">\n`;
      }
      if (collected.recharts) {
        hints += `  <link rel="modulepreload" href="${collected.recharts}">\n`;
      }
      const isSq = ctx.filename?.includes('sq.html');
      const localeHint = isSq ? collected.localeSq : collected.localeEn;
      if (localeHint) {
        hints += `  <link rel="modulepreload" href="${localeHint}">\n`;
      }
      if (!hints) return html;
      return html.replace('<link rel="preload" as="font"', hints + '  <link rel="preload" as="font"');
    },
  };
}

export default defineConfig({
  plugins: [react(), resourceHintsPlugin()],
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
