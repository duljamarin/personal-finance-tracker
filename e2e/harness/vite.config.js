import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const root = path.resolve(here, '../..');

// Standalone Vite app for the WebKit overflow harness. Aliases i18n and the
// currency hook to stubs so the real components mount without auth/Supabase.
export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: {
      'react-i18next': path.resolve(here, 'stub-i18next.js'),
      [path.resolve(root, 'src/hooks/useDisplayCurrency')]: path.resolve(here, 'stub-currency.js'),
    },
  },
  server: { port: 5199, strictPort: true },
});
