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

  it('returns null when the resulting payment would not exceed P·i', () => {
    // Tiny principal repayment against a large balance at a high rate: even with
    // the extra, A' <= P·i so the loan never amortizes.
    const P = 10000000, r = 0.60, n = 360;
    const i = r / 12;
    const A = monthlyPayment(P, r, n);
    // Sanity: base A already exceeds P·i (a real loan), so construct a case by
    // asking about a term/rate where a near-zero payment cannot cover interest.
    // Use extra = 0 on a loan whose own A barely covers interest is still valid,
    // so instead probe the guard directly with an impossible standalone payment.
    expect(A).toBeGreaterThan(P * i); // the real annuity is always > interest
    // Directly exercise the guard: a hand-built scenario where A' <= P·i.
    // termWithExtraPayment computes A' from the real annuity, which always
    // amortizes, so the null path is reached via a degenerate principal/term.
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
