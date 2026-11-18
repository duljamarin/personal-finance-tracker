import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Design harness: renders the REAL authenticated pages with the network,
// auth, crypto and data contexts swapped for in-memory fixtures, so the Bento
// screens can be screenshotted in both themes / languages without an account.
// Test scaffolding only, never part of the app build.
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const root = path.resolve(here, '../..');
const mock = (f) => path.resolve(here, 'mocks', f).split(path.sep).join('/');

const MOCKS = [
  ['src/utils/api/index.js', mock('api.js')],
  ['src/utils/api/userSettings.js', mock('userSettings.js')],
  ['src/utils/supabaseClient.js', mock('supabaseClient.js')],
  ['src/context/AuthContext.jsx', mock('AuthContext.jsx')],
  ['src/context/CryptoContext.jsx', mock('CryptoContext.jsx')],
  ['src/context/SubscriptionContext.jsx', mock('SubscriptionContext.jsx')],
  ['src/context/TransactionContext.jsx', mock('TransactionContext.jsx')],
  ['src/hooks/useDisplayCurrency.js', mock('useDisplayCurrency.js')],
];

function designMocks() {
  return {
    name: 'design-mocks',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || importer.replace(/\\/g, '/').includes('/e2e/design/mocks/')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const id = resolved.id.replace(/\\/g, '/').split('?')[0];
      for (const [target, file] of MOCKS) if (id.endsWith(target)) return file;
      return null;
    },
  };
}

export default defineConfig({
  root: here,
  plugins: [designMocks(), react()],
  css: { postcss: path.resolve(root, 'postcss.config.cjs') },
  server: { port: 5299, strictPort: true, fs: { allow: [root] } },
  publicDir: path.resolve(root, 'public'),
});
