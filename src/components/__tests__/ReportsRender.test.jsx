import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for a real breakage: useDisplayCurrency used to expose a
// `convert()` helper (back when amounts were EUR-normalised and had to be
// converted for display). The app is single-currency now, so the hook returns
// only { currency, symbol, format } — but two Reports components kept
// destructuring `convert` and calling it inside a Recharts tickFormatter. That
// threw at render time and took the whole Financial Reports page down.
//
// A render test does NOT catch this: jsdom gives Recharts no layout, so
// tickFormatter never runs and the component renders "fine". Scanning the
// source is what actually catches it.

const SRC = join(process.cwd(), 'src');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...walk(full));
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('useDisplayCurrency contract', () => {
  it('no component destructures a `convert` helper from the hook', () => {
    const offenders = [];

    for (const file of walk(SRC)) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('useDisplayCurrency')) continue;

      const re = /const\s*\{([^}]*)\}\s*=\s*useDisplayCurrency\(\)/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const names = m[1].split(',').map((s) => s.split(':')[0].trim());
        if (names.includes('convert')) {
          offenders.push(file.replace(process.cwd(), '').replace(/\\/g, '/'));
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('the hook really does not export convert', () => {
    const src = readFileSync(join(SRC, 'hooks', 'useDisplayCurrency.js'), 'utf8');
    // The returned object is the contract callers rely on.
    const returned = /return useMemo\(\(\) => \(\{([^}]*)\}\)/.exec(src);
    expect(returned).not.toBeNull();
    expect(returned[1]).not.toMatch(/\bconvert\b/);
  });
});
