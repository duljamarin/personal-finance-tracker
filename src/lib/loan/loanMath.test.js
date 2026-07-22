import { describe, it, expect } from 'vitest';
import {
  monthlyPayment,
  balanceAfter,
  schedule,
  totals,
  totalCost,
  termWithExtraPayment,
  rateShocks,
  fxShocks,
  debtToIncome,
  effectiveRate,
  referenceRateShocks,
  twoPhaseLoan,
  twoPhaseSchedule,
  loanFromProperty,
} from './loanMath.js';

/**
 * Two kinds of correctness evidence here:
 *
 *  1. Textbook anchors — standard, independently verifiable annuity figures,
 *     typed as literals. They are NOT produced by calling the engine (that would
 *     be circular: a wrong engine would still pass against itself).
 *
 *  2. Invariants — mathematically provable relationships that catch algebra
 *     errors without needing hand-computed decimals. The strongest of these is
 *     the cross-validation test: a second, independent naive-accumulation
 *     schedule must agree with the closed-form one at every row.
 */

const TOL = 0.01;
const near = (a, b, tol = TOL) => Math.abs(a - b) <= tol;

describe('textbook anchors (typed literals, not engine output)', () => {
  it('monthlyPayment(100000, 0.12, 12) is 8884.88 — 1%/month, 12-month annuity', () => {
    expect(near(monthlyPayment(100000, 0.12, 12), 8884.88)).toBe(true);
  });

  it('monthlyPayment(200000, 0.06, 360) is 1199.10 — 30-year 6% mortgage', () => {
    expect(near(monthlyPayment(200000, 0.06, 360), 1199.10)).toBe(true);
  });
});

describe('zero-interest case', () => {
  it('monthlyPayment(120000, 0, 12) is exactly 10000', () => {
    expect(monthlyPayment(120000, 0, 12)).toBe(10000);
  });
});

describe('balanceAfter endpoints', () => {
  const cases = [
    [100000, 0.12, 12],
    [200000, 0.06, 360],
    [5000000, 0.035, 240],
    [300000, 0, 24],   // zero interest
    [750000, 0.09, 60],
  ];

  it('balance at term end is 0 (within 0.01) for every case, including r = 0', () => {
    for (const [P, r, n] of cases) {
      expect(near(balanceAfter(P, r, n, n), 0)).toBe(true);
    }
  });

  it('balance at start equals P exactly', () => {
    for (const [P, r, n] of cases) {
      expect(balanceAfter(P, r, n, 0)).toBe(P);
    }
  });
});

describe('schedule integrity', () => {
  const P = 5000000;
  const r = 0.035;
  const n = 240;

  it('has exactly n rows and a final balance of 0', () => {
    const rows = schedule(P, r, n);
    expect(rows.length).toBe(n);
    expect(near(rows[n - 1].balance, 0)).toBe(true);
  });

  it('sum of principal components equals P (within 0.01)', () => {
    const rows = schedule(P, r, n);
    const principalSum = rows.reduce((s, row) => s + row.principal, 0);
    expect(near(principalSum, P)).toBe(true);
  });

  it('sum of interest components equals totals().totalInterest (within 0.01)', () => {
    const rows = schedule(P, r, n);
    const interestSum = rows.reduce((s, row) => s + row.interest, 0);
    expect(near(interestSum, totals(P, r, n).totalInterest)).toBe(true);
  });

  it('works for a zero-interest loan (all interest 0, principal sums to P)', () => {
    const rows = schedule(300000, 0, 24);
    expect(rows.length).toBe(24);
    expect(rows.every((row) => row.interest === 0)).toBe(true);
    expect(near(rows.reduce((s, row) => s + row.principal, 0), 300000)).toBe(true);
    expect(near(rows[23].balance, 0)).toBe(true);
  });
});

describe('cross-validation: closed form vs naive accumulation', () => {
  /**
   * A SECOND, independent schedule built by the very accumulation the engine
   * refuses to use. Two unrelated methods agreeing at every row is the strongest
   * correctness evidence available, since no external anchor covers the whole
   * schedule. This helper exists only in the test.
   */
  function naiveSchedule(principal, annualRate, months) {
    const i = annualRate / 12;
    const A = monthlyPayment(principal, annualRate, months);
    let balance = principal;
    const rows = [];
    for (let k = 1; k <= months; k++) {
      const interest = balance * i;
      const principalPart = A - interest;
      balance = balance - principalPart;
      rows.push({ month: k, interest, principal: principalPart, balance });
    }
    return rows;
  }

  const cases = [
    [5000000, 0.035, 240],
    [200000, 0.06, 360],
    [100000, 0.12, 12],
    [300000, 0, 24],   // zero interest
  ];

  it('closed-form balanceAfter agrees with naive accumulation at every row', () => {
    for (const [P, r, n] of cases) {
      const closed = schedule(P, r, n);
      const naive = naiveSchedule(P, r, n);
      expect(closed.length).toBe(naive.length);
      for (let k = 0; k < closed.length; k++) {
        // Compare the pre-clamp closed-form balance so the final-row snap in
        // schedule() does not mask a real disagreement.
        const closedBalance = balanceAfter(P, r, n, k + 1);
        expect(near(closedBalance, naive[k].balance)).toBe(true);
        expect(near(closed[k].interest, naive[k].interest)).toBe(true);
        expect(near(closed[k].principal, naive[k].principal)).toBe(true);
      }
    }
  });
});

describe('totals derivation', () => {
  it('totalPaid = A·n and totalInterest = A·n − P', () => {
    const P = 200000, r = 0.06, n = 360;
    const A = monthlyPayment(P, r, n);
    const tot = totals(P, r, n);
    expect(near(tot.monthlyPayment, A, 1e-9)).toBe(true);
    expect(near(tot.totalPaid, A * n, 1e-6)).toBe(true);
    expect(near(tot.totalInterest, A * n - P, 1e-6)).toBe(true);
  });
});

describe('total cost of credit', () => {
  it('adds disbursement, insurance × years and upfront on top of interest', () => {
    const P = 5000000, r = 0.035, n = 240;
    const interest = totals(P, r, n).totalInterest;
    const c = totalCost(P, r, n, {
      disbursementFeePct: 0.005,
      annualInsurance: 12000,
      upfrontCosts: 30000,
    });
    expect(near(c.disbursement, P * 0.005, 1e-6)).toBe(true);
    expect(near(c.insurance, 12000 * (n / 12), 1e-6)).toBe(true);
    expect(near(c.upfront, 30000, 1e-6)).toBe(true);
    expect(near(c.total, interest + P * 0.005 + 12000 * (n / 12) + 30000, 1e-6)).toBe(true);
  });
});

describe('monotonicity', () => {
  it('a higher rate produces a higher installment', () => {
    expect(monthlyPayment(1000000, 0.05, 120)).toBeGreaterThan(
      monthlyPayment(1000000, 0.03, 120)
    );
  });

  it('a longer term produces a lower installment but higher total interest', () => {
    const short = monthlyPayment(1000000, 0.05, 120);
    const long = monthlyPayment(1000000, 0.05, 240);
    expect(long).toBeLessThan(short);
    expect(totals(1000000, 0.05, 240).totalInterest).toBeGreaterThan(
      totals(1000000, 0.05, 120).totalInterest
    );
  });
});

describe('early repayment', () => {
  it('a positive extra shortens the term and saves months and interest', () => {
    const P = 5000000, r = 0.035, n = 240;
    const res = termWithExtraPayment(P, r, n, 20000);
    expect(res).not.toBeNull();
    expect(res.newMonths).toBeLessThan(n);
    expect(res.monthsSaved).toBeGreaterThan(0);
    expect(res.interestSaved).toBeGreaterThan(0);
  });

  it('returns null for degenerate principal and term', () => {
    // Renamed from a name that promised "A' <= P·i" coverage. That path is
    // unreachable: a real annuity's A always exceeds P·i, so A' does too (the
    // dead guard was removed from the engine). What this test actually covers is
    // the genuine degenerate inputs — zero term and zero principal.
    const P = 10000000, r = 0.60, n = 360;
    const i = r / 12;
    const A = monthlyPayment(P, r, n);
    expect(A).toBeGreaterThan(P * i); // documents WHY the removed guard was dead
    expect(termWithExtraPayment(P, r, 0, 20000)).toBeNull();
    expect(termWithExtraPayment(0, r, n, 20000)).toBeNull();
  });

  it('zero extra returns the original term with zero savings', () => {
    const P = 1000000, r = 0.05, n = 120;
    const res = termWithExtraPayment(P, r, n, 0);
    expect(res).not.toBeNull();
    expect(res.newMonths).toBe(n);
    expect(res.monthsSaved).toBe(0);
    expect(near(res.interestSaved, 0, 1)).toBe(true);
  });
});

describe('scenarios', () => {
  it('rateShocks shift the rate and report a positive delta per shock', () => {
    const P = 5000000, r = 0.035, n = 240;
    const base = monthlyPayment(P, r, n);
    const shocks = rateShocks(P, r, n, [0.01, 0.02, 0.03]);
    expect(shocks.length).toBe(3);
    expect(near(shocks[0].payment, monthlyPayment(P, r + 0.01, n), 1e-9)).toBe(true);
    shocks.forEach((s) => expect(s.delta).toBeGreaterThan(0));
    // Bigger shock → bigger installment.
    expect(shocks[2].payment).toBeGreaterThan(shocks[0].payment);
    expect(base).toBeLessThan(shocks[0].payment);
  });

  it('fxShocks scale the ALL installment by EUR appreciation', () => {
    const paymentEur = 500;
    const rate = 97;
    const shocks = fxShocks(paymentEur, rate, [0.05, 0.10, 0.15]);
    expect(shocks.length).toBe(3);
    expect(near(shocks[0].paymentAll, 500 * 97 * 1.05, 1e-6)).toBe(true);
    expect(near(shocks[0].delta, 500 * 97 * 0.05, 1e-6)).toBe(true);
  });
});

describe('debt-to-income', () => {
  it('is the installment share of net income', () => {
    const res = debtToIncome(40000, 100000);
    expect(res).not.toBeNull();
    expect(near(res.ratio, 0.4, 1e-9)).toBe(true);
  });
});

describe('effectiveRate (Albanian bank convention)', () => {
  it('is index + margin when that exceeds the floor', () => {
    expect(near(effectiveRate({ index: 0.02, margin: 0.023, floor: 0.03 }), 0.043, 1e-12)).toBe(true);
  });

  it('is the floor when index + margin falls below it', () => {
    expect(near(effectiveRate({ index: 0.001, margin: 0.005, floor: 0.03 }), 0.03, 1e-12)).toBe(true);
  });

  it('defaults every field to 0 (no NaN on empty input)', () => {
    expect(effectiveRate()).toBe(0);
    expect(effectiveRate({})).toBe(0);
  });
});

describe('referenceRateShocks', () => {
  const P = 5000000, n = 240;
  const reference = { index: 0.025, margin: 0.023, floor: 0.03 };

  it('moves only the index and reprices at the floored rate', () => {
    const shocks = referenceRateShocks(P, reference, n, [0.02]);
    const expectedRate = effectiveRate({ ...reference, index: reference.index + 0.02 });
    expect(near(shocks[0].rate, expectedRate, 1e-12)).toBe(true);
    expect(near(shocks[0].payment, monthlyPayment(P, expectedRate, n), 1e-9)).toBe(true);
  });

  it('a negative shock past the floor pins the rate at the floor and the payment equals base', () => {
    // index + margin = 0.048. A -0.03 shock takes index to -0.005, so
    // index + margin = 0.018 < floor 0.03 → rate pinned at 0.03, the base rate.
    const baseRate = effectiveRate(reference);
    expect(baseRate).toBe(0.048);
    const base = monthlyPayment(P, baseRate, n);
    const shocks = referenceRateShocks(P, reference, n, [-0.03]);
    // A -0.03 shock: 0.048 - 0.03 = 0.018 < floor, so rate = floor = 0.03.
    expect(shocks[0].rate).toBe(0.03);

    // To make the payment equal the BASE payment, the base rate itself must be at
    // the floor. Use a reference already at the floor so the shocked (floored)
    // rate equals the base (floored) rate.
    const atFloor = { index: 0.005, margin: 0.005, floor: 0.03 }; // 0.01 < 0.03 → floor
    const baseAtFloor = monthlyPayment(P, effectiveRate(atFloor), n);
    const flooredShocks = referenceRateShocks(P, atFloor, n, [-0.005]);
    expect(flooredShocks[0].rate).toBe(0.03);
    expect(near(flooredShocks[0].payment, baseAtFloor, 1e-9)).toBe(true);
    expect(near(flooredShocks[0].delta, 0, 1e-9)).toBe(true);
    // silence unused
    expect(base).toBeGreaterThan(0);
  });
});

describe('twoPhaseLoan', () => {
  const P = 5000000, n = 240, fixedN = 36;

  it('with equal rates is indistinguishable from a single-rate loan', () => {
    const r = 0.04;
    const tp = twoPhaseLoan(P, r, fixedN, r, n);
    expect(tp.phase2).not.toBeNull();
    expect(near(tp.phase2.payment, tp.phase1.payment, 0.01)).toBe(true);
    expect(near(tp.totalPaid, totals(P, r, n).totalPaid, 0.01)).toBe(true);
  });

  it('phase2.openingBalance equals balanceAfter at the switch, exactly', () => {
    const tp = twoPhaseLoan(P, 0.045, fixedN, 0.043, n);
    expect(tp.phase2.openingBalance).toBe(balanceAfter(P, 0.045, n, fixedN));
    expect(tp.balanceAtSwitch).toBe(balanceAfter(P, 0.045, n, fixedN));
  });

  it('a rate increase at the switch raises the second installment; a decrease lowers it', () => {
    const up = twoPhaseLoan(P, 0.03, fixedN, 0.05, n);
    expect(up.phase2.payment).toBeGreaterThan(up.phase1.payment);
    expect(up.paymentDelta).toBeGreaterThan(0);

    const down = twoPhaseLoan(P, 0.05, fixedN, 0.03, n);
    expect(down.phase2.payment).toBeLessThan(down.phase1.payment);
    expect(down.paymentDelta).toBeLessThan(0);
  });

  it('collapses to a single-rate result (phase2 null) at the degenerate boundaries', () => {
    const zero = twoPhaseLoan(P, 0.04, 0, 0.05, n);
    expect(zero.phase2).toBeNull();
    expect(Number.isFinite(zero.phase1.payment)).toBe(true);
    expect(near(zero.totalPaid, totals(P, 0.04, n).totalPaid, 0.01)).toBe(true);

    const allFixed = twoPhaseLoan(P, 0.04, n, 0.05, n);
    expect(allFixed.phase2).toBeNull();
    expect(Number.isFinite(allFixed.phase1.payment)).toBe(true);

    const beyond = twoPhaseLoan(P, 0.04, n + 12, 0.05, n);
    expect(beyond.phase2).toBeNull();
  });

  it('degenerate principal/term never yield NaN', () => {
    const noP = twoPhaseLoan(0, 0.04, fixedN, 0.05, n);
    expect(Number.isFinite(noP.phase1.payment)).toBe(true);
    expect(Number.isFinite(noP.totalPaid)).toBe(true);
    const noN = twoPhaseLoan(P, 0.04, fixedN, 0.05, 0);
    expect(Number.isFinite(noN.totalPaid)).toBe(true);
  });

  /**
   * Real-world reference. Source: Intesa Sanpaolo Bank Albania published Key
   * Facts Sheet (KFS), 2026 — a 5,000,000 ALL, 20-year loan at 4.5% fixed for 3
   * years then 4.3% is quoted as 31,865.87 then 31,385.86.
   *
   * We assert each /12-model figure sits in a BAND 0.4%–1.1% BELOW the published
   * figure rather than matching exactly. Two things fall out of that:
   *  1. The two-phase STRUCTURE is right — if it were wrong, the second figure
   *     would be far off, not offset by the same small fraction as the first.
   *  2. The day-count gap is SYSTEMATIC (banks apply days/360, ~0.7% higher),
   *     not random noise. A band, not equality, is the honest assertion.
   */
  it('matches Intesa published two-phase example within the known days/360 band', () => {
    const tp = twoPhaseLoan(5000000, 0.045, 36, 0.043, 240);
    const bank1 = 31865.87;
    const bank2 = 31385.86;
    const below = (model, bank) => (bank - model) / bank; // fraction below bank
    expect(below(tp.phase1.payment, bank1)).toBeGreaterThanOrEqual(0.004);
    expect(below(tp.phase1.payment, bank1)).toBeLessThanOrEqual(0.011);
    expect(below(tp.phase2.payment, bank2)).toBeGreaterThanOrEqual(0.004);
    expect(below(tp.phase2.payment, bank2)).toBeLessThanOrEqual(0.011);
  });
});

describe('twoPhaseSchedule', () => {
  const P = 5000000, n = 240, fixedN = 36;

  it('has totalMonths rows, ends at 0, and principal sums to P', () => {
    const rows = twoPhaseSchedule(P, 0.045, fixedN, 0.043, n);
    expect(rows.length).toBe(n);
    expect(near(rows[n - 1].balance, 0)).toBe(true);
    const principalSum = rows.reduce((s, r) => s + r.principal, 0);
    expect(near(principalSum, P, 0.01)).toBe(true);
  });

  it('tags rows with their phase and switches at fixedMonths', () => {
    const rows = twoPhaseSchedule(P, 0.045, fixedN, 0.043, n);
    expect(rows[fixedN - 1].phase).toBe(1);
    expect(rows[fixedN].phase).toBe(2);
  });

  it('collapses to the single-rate schedule at the boundaries', () => {
    const rows = twoPhaseSchedule(P, 0.04, 0, 0.05, n);
    expect(rows.length).toBe(n);
    expect(rows.every((r) => r.phase === 1)).toBe(true);
    expect(twoPhaseSchedule(0, 0.04, fixedN, 0.05, n)).toEqual([]);
    expect(twoPhaseSchedule(P, 0.04, fixedN, 0.05, 0)).toEqual([]);
  });
});

describe('loanFromProperty', () => {
  it('subtracts the down payment and computes LTV', () => {
    const r = loanFromProperty(10000000, 3000000);
    expect(r.principal).toBe(7000000);
    expect(near(r.ltv, 0.7, 1e-12)).toBe(true);
    expect(near(r.downPaymentPct, 0.3, 1e-12)).toBe(true);
  });

  it('a zero price returns ltv 0, not NaN', () => {
    const r = loanFromProperty(0, 0);
    expect(r.ltv).toBe(0);
    expect(r.principal).toBe(0);
    expect(Number.isFinite(r.ltv)).toBe(true);
  });

  it('never returns a negative principal', () => {
    const r = loanFromProperty(5000000, 6000000);
    expect(r.principal).toBe(0);
  });
});

describe('guards: never NaN or Infinity', () => {
  const finite = (x) => Number.isFinite(x);

  it('monthlyPayment(0, r, n) is 0', () => {
    expect(monthlyPayment(0, 0.05, 240)).toBe(0);
  });

  it('monthlyPayment(P, r, 0) is 0', () => {
    expect(monthlyPayment(1000000, 0.05, 0)).toBe(0);
  });

  it('debtToIncome against zero income is null, not Infinity', () => {
    expect(debtToIncome(40000, 0)).toBeNull();
    expect(debtToIncome(40000, -100)).toBeNull();
  });

  it('balanceAfter with zero term is finite (0), not NaN', () => {
    expect(finite(balanceAfter(1000000, 0.05, 0, 0))).toBe(true);
    expect(balanceAfter(1000000, 0.05, 0, 0)).toBe(0);
  });

  it('schedule of a degenerate loan is an empty array, not [NaN]', () => {
    expect(schedule(0, 0.05, 240)).toEqual([]);
    expect(schedule(1000000, 0.05, 0)).toEqual([]);
  });

  it('totals of a zero-term loan are all finite', () => {
    const t = totals(1000000, 0.05, 0);
    expect(finite(t.monthlyPayment)).toBe(true);
    expect(finite(t.totalPaid)).toBe(true);
    expect(finite(t.totalInterest)).toBe(true);
  });
});
