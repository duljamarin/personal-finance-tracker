// QA helper: every literal t('a.b.c') key used in src must exist in the EN
// locale (plural keys may exist as _one/_other). Catches keys broken by
// refactors. Usage: node e2e/design/check-i18n-keys.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const en = JSON.parse(readFileSync(join(root, 'locales/en/translation.json'), 'utf8'));
const has = (k) => {
  let o = en;
  for (const p of k.split('.')) {
    if (o && typeof o === 'object' && p in o) o = o[p];
    else return false;
  }
  return true;
};
const missing = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (!/__tests__|locales/.test(f)) walk(p);
    } else if (/\.(jsx?|mjs)$/.test(f)) {
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z][^'\n]*)'/g)) {
        const k = m[1];
        if (!k.includes('.')) continue;
        if (!has(k) && !has(`${k}_one`) && !has(`${k}_other`)) missing.push(`${relative(root, p)} :: ${k}`);
      }
    }
  }
})(root);
console.log(missing.length ? missing.join('\n') : 'all literal keys resolve');
process.exitCode = missing.length ? 1 : 0;
