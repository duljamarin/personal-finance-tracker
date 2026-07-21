import { describe, it, expect } from 'vitest';
import {
  monthlyContributions,
  determineTreatment,
  zeroRegimeMonthly,
  vatFlag,
  AVAILABLE_YEARS,
  DEFAULT_YEAR,
} from './freelancerTax.js';

/**
 * Expected values are hand-computed from the statute and typed as literals.
 * Deriving them by calling the engine would make these tests circular — they
 * would pass against a wrong engine.
 */

const Y = 2026;
const TOL = 0.01;

describe('fixed monthly contributions', () => {
  /**
   * Self-employed contributions are FIXED amounts on the minimum declared base,
   * not a percentage of actual income. 23% of 50,000 + 3.4% of 100,000.
   */
  it('are 11,500 social + 3,400 health = 14,900 total', () => {
    const c = monthlyContributions(Y);
    expect(Math.abs(c.social - 11500)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(c.health - 3400)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(c.total - 14900)).toBeLessThanOrEqual(TOL);
  });

  it('do not scale with income', () => {
    // Same figure regardless of what the freelancer earns — that is the point.
    const a = zeroRegimeMonthly(300000, 0, Y);
    const b = zeroRegimeMonthly(1000000, 0, Y);
    expect(a.contribTotal).toBe(b.contribTotal);
  });
});

describe('treatment: the eligibility decision tree', () => {
  it('all-foreign clients keep the 0% regime even at 100% concentration', () => {
    // The Art. 12/1/ç exception disapplies the concentration rule entirely.
    const r = determineTreatment(
      { allClientsForeign: true, singleClientMaxShare: 1.0, topTwoClientsShare: 1.0, annualTurnover: 8000000 },
      Y
    );
    expect(r.status).toBe('ZERO_REGIME');
  });

  it('a single client at 85% reclassifies to employment income', () => {
    const r = determineTreatment(
      { allClientsForeign: false, singleClientMaxShare: 0.85, topTwoClientsShare: 0.85, annualTurnover: 8000000 },
      Y
    );
    expect(r.status).toBe('RECLASSIFIED');
    expect(r.reason).toBe('single_client_80');
  });

  it('two clients at 92% reclassifies, even with no single client over 80%', () => {
    const r = determineTreatment(
      { allClientsForeign: false, singleClientMaxShare: 0.5, topTwoClientsShare: 0.92, annualTurnover: 8000000 },
      Y
    );
    expect(r.status).toBe('RECLASSIFIED');
    expect(r.reason).toBe('fewer_than_three_90');
  });

  it('diversified Albanian clients keep the 0% regime', () => {
    const r = determineTreatment(
      { allClientsForeign: false, singleClientMaxShare: 0.4, topTwoClientsShare: 0.7, annualTurnover: 8000000 },
      Y
    );
    expect(r.status).toBe('ZERO_REGIME');
    expect(r.reason).toBe('diversified_clients');
  });

  it('the turnover cliff is checked BEFORE the foreign-client exception', () => {
    // Foreign clients do not rescue you from exceeding 14M.
    const r = determineTreatment(
      { allClientsForeign: true, singleClientMaxShare: 1.0, topTwoClientsShare: 1.0, annualTurnover: 14000001 },
      Y
    );
    expect(r.status).toBe('OVER_TURNOVER');
    expect(r.reason).toBe('turnover_above_14m');
  });
});

describe('threshold boundaries (inclusive vs strict)', () => {
  it('a single client at exactly 80% reclassifies — the threshold is >=', () => {
    const r = determineTreatment(
      { allClientsForeign: false, singleClientMaxShare: 0.80, topTwoClientsShare: 0.80, annualTurnover: 8000000 },
      Y
    );
    expect(r.status).toBe('RECLASSIFIED');
    expect(r.reason).toBe('single_client_80');
  });

  it('turnover of exactly 14,000,000 stays inside the 0% zone', () => {
    // Only STRICTLY above the ceiling triggers OVER_TURNOVER.
    const r = determineTreatment(
      { allClientsForeign: true, singleClientMaxShare: 1.0, topTwoClientsShare: 1.0, annualTurnover: 14000000 },
      Y
    );
    expect(r.status).not.toBe('OVER_TURNOVER');
    expect(r.status).toBe('ZERO_REGIME');
  });
});

describe('take-home in the 0% regime', () => {
  it('300,000 income with 20,000 admin nets 265,100', () => {
    const r = zeroRegimeMonthly(300000, 20000, Y);
    expect(r.incomeTax).toBe(0);
    expect(Math.abs(r.net - 265100)).toBeLessThanOrEqual(TOL); // 300000 - 14900 - 20000
  });

  it('1,000,000 income with 25,000 admin nets 960,100', () => {
    const r = zeroRegimeMonthly(1000000, 25000, Y);
    expect(r.incomeTax).toBe(0);
    expect(Math.abs(r.net - 960100)).toBeLessThanOrEqual(TOL); // 1000000 - 14900 - 25000
  });
});

describe('VAT flag', () => {
  it('is informational only and triggers strictly above the threshold', () => {
    expect(vatFlag(9000000, Y).mustRegister).toBe(false);
    expect(vatFlag(11000000, Y).mustRegister).toBe(true);
  });
});

describe('year registry', () => {
  it('DEFAULT_YEAR is the newest available year', () => {
    expect(DEFAULT_YEAR).toBe(Math.max(...AVAILABLE_YEARS));
  });

  it('throws on an unknown year rather than falling back', () => {
    expect(() => monthlyContributions(9999)).toThrow();
  });
});
