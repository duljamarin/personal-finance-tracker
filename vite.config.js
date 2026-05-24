import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
