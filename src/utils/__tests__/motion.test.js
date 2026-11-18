import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  D_FAST, D_ENTER, D_TILE, D_DATA, D_COUNT, TOAST_LIFETIME,
  tileDelay, rowDelay, dataDelay,
} from '../motion';

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
const cssMs = (name) => {
  const m = css.match(new RegExp(`${name}:\\s*(\\d+)ms`));
  return m ? Number(m[1]) : NaN;
};

describe('motion tokens', () => {
  it('JS durations mirror the CSS custom properties (single source)', () => {
    expect(cssMs('--d-fast')).toBe(D_FAST);
    expect(cssMs('--d-enter')).toBe(D_ENTER);
    expect(cssMs('--d-tile')).toBe(D_TILE);
    expect(cssMs('--d-data')).toBe(D_DATA);
    expect(cssMs('--d-count')).toBe(D_COUNT);
  });

  it('derives delays from the formulas', () => {
    expect(tileDelay(0)).toBe(0);
    expect(tileDelay(3)).toBe(240);
    expect(tileDelay(20)).toBe(tileDelay(8)); // MAX_STAGGERED
    expect(rowDelay(2, 100)).toBe(190);
    expect(rowDelay(12, 0)).toBe(rowDelay(8, 0));
    expect(dataDelay(1)).toBe(80 + 300);
    expect(TOAST_LIFETIME).toBe(2600);
  });
});
