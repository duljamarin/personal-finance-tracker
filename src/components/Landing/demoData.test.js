import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import {
  INCOME, SPENDING, KEPT, KEPT_LAST_12, HEALTH, HEALTH_PARTS, HEALTH_PREV, HEALTH_DELTA,
  CATEGORIES, BALANCE, BALANCE_LAST_12, YEAR_TOTALS, HERO, FEATURES,
  budgetPct, benchmarkPct, budgetsKeptPct, goalsOnTrack, category, money,
} from './demoData';
import HeroPreview from './HeroPreview';
import { MiniHealthScore, MiniBudgetForecast } from './FeatureMinis';

// Keys come back as text so the rendered numbers are the only digits that
// matter; interpolation values are appended so amounts stay visible.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts ? `${key} ${Object.values(opts).join(' ')}` : key),
    i18n: { language: 'en' },
  }),
}));
vi.mock('../../i18n', () => ({ default: { t: (k) => k, language: 'en' } }));

const food = category('food');

describe('demoData: derived values', () => {
  it('KEPT = INCOME - SPENDING, and SPENDING sums the categories', () => {
    expect(SPENDING).toBe(CATEGORIES.reduce((s, c) => s + c.spent, 0));
    expect(SPENDING).toBe(1402);
    expect(KEPT).toBe(INCOME - SPENDING);
  });

  it('the last of KEPT_LAST_12 is this month: KEPT', () => {
    expect(KEPT_LAST_12).toHaveLength(12);
    expect(KEPT_LAST_12.at(-1)).toBe(KEPT);
  });

  it('health is the sum of its parts and its change is against HEALTH_PREV', () => {
    expect(HEALTH).toBe(Object.values(HEALTH_PARTS).reduce((s, v) => s + v, 0));
    expect(HEALTH).toBe(70);
    expect(HEALTH_DELTA).toBe(HEALTH - HEALTH_PREV);
  });

  it('the 12-month view never contradicts the all-time balance', () => {
    expect(BALANCE_LAST_12.at(-1)).toBeCloseTo(BALANCE, 6);
    expect(YEAR_TOTALS.kept).toBeLessThanOrEqual(BALANCE);
    expect(YEAR_TOTALS.income - YEAR_TOTALS.spending).toBe(YEAR_TOTALS.kept);
  });

  it('derived formulas match the spec', () => {
    expect(budgetPct(food)).toBe(Math.round((412 / 600) * 100));
    expect(benchmarkPct(food)).toBe(Math.round(((412 - 349) / 349) * 100));
    expect(benchmarkPct({ spent: 5, normal: 0 })).toBe(0);
    expect(budgetsKeptPct).toBe(100);
    expect(goalsOnTrack).toBe('2/2');
  });
});

describe('D1: one health score on the page', () => {
  it('hero and feature tile use HEALTH', () => {
    expect(HERO.health).toBe(HEALTH);
    expect(FEATURES.score.health).toBe(HEALTH);
  });

  it('rendered hero and score tile both show HEALTH and no other score', () => {
    for (const el of [createElement(HeroPreview), createElement(MiniHealthScore)]) {
      const { container, unmount } = render(el);
      const exact = [...container.querySelectorAll('span, p, dd')].filter((n) => n.textContent.trim() === String(HEALTH));
      expect(exact.length).toBeGreaterThanOrEqual(1);
      expect(container.textContent).not.toMatch(/\b78\b/); // the old hero score
      unmount();
    }
  });
});

describe('D2: one food budget on the page', () => {
  it('hero food percentage is budgetPct(food) and the budgets mini shows the same spent/limit', () => {
    const heroFood = HERO.budgets.find((b) => b.key === 'food');
    const miniFood = FEATURES.forecast.find((b) => b.key === 'food');
    expect(heroFood.pct).toBe(budgetPct(food));
    expect([miniFood.spent, miniFood.limit]).toEqual([heroFood.spent, heroFood.limit]);
  });

  it('rendered: same spent/limit text in both, hero bar width = budgetPct(food)', () => {
    const label = `${money(food.spent)} / ${money(food.limit)}`;
    const hero = render(createElement(HeroPreview));
    const heroRow = hero.container.querySelector('[data-budget="food"]');
    expect(heroRow.textContent).toContain(label);
    const fill = heroRow.querySelector('.bar-w');
    expect(fill.style.width).toBe(`${budgetPct(food)}%`);
    hero.unmount();

    const mini = render(createElement(MiniBudgetForecast));
    expect(mini.container.querySelector('[data-budget="food"]').textContent).toContain(label);
    mini.unmount();
  });
});
