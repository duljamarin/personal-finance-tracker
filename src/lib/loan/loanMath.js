/**
 * Loan / mortgage amortization engine — public, unauthenticated.
 *
 * This is pure financial mathematics, NOT tax law. Nothing here is statutory, so
 * there is no year registry and no "truth" to encode: DEFAULTS holds sensible
 * starting values for the UI, never authoritative constants. In particular the
 * EUR<->ALL rate is a user-editable estimate — the app has a live rate source
 * (src/utils/exchangeRate.js) but a logged-out marketing page must not depend on
 * a network fetch to render, and the task deliberately keeps FX user-controlled.
 *
 * Hard rules honoured throughout:
 *  - No solver, no bisection, no convergence loop, no iterative root-finding.
 *    Every quantity below has a closed form.
 *  - The schedule is built with Array.from + the closed-form balanceAfter, never
 *    by accumulating a running balance. Accumulation drifts numerically AND
 *    reintroduces the loop pattern this codebase avoids.
 *  - No rounding inside the engine — full floating-point precision. Rounding is a
 *    display concern only.
 *  - Every division is guarded: i = 0, n = 0 and P = 0 must never yield NaN or
 *    Infinity.
 */

export const DEFAULTS = {
  PRINCIPAL: 5000000,        // ALL
  ANNUAL_RATE: 0.035,        // 3.5% nominal annual
  TERM_YEARS: 20,
  CURRENCY: "ALL",           // "ALL" | "EUR"
  EUR_TO_ALL: 97,            // editable starting value only, NOT a source of truth
  DISBURSEMENT_FEE_PCT: 0.005,
  ANNUAL_INSURANCE: 0,
  UPFRONT_COSTS: 0,
  DTI_WARN: 0.40,            // installment/net-income ratio banks typically cap around
  RATE_SHOCKS: [0.01, 0.02, 0.03],   // +1pp, +2pp, +3pp
  FX_SHOCKS: [0.05, 0.10, 0.15],     // EUR appreciation scenarios

  // Albanian mortgage rate = reference index + bank margin, floored at the NMI
  // (Norma Minimale e Interesit). Starting values only, editable in the UI, NOT
  // authoritative: the real index moves and the margin/floor are per-contract.
  // Loosely modelled on published 2026 KFS ranges (Raiffeisen, Intesa).
  REFERENCE: {
    ALL: { indexLabel: "tbill12m", index: 0.025, margin: 0.023, floor: 0.03 },
    EUR: { indexLabel: "euribor",  index: 0.021, margin: 0.02,  floor: 0.04 },
  },
  // Reference-index shocks include a downward move so the floor becomes visible:
  // when index + margin falls below the NMI, the rate stops falling. That is the
  // whole point of modelling the floor.
  REFERENCE_SHOCKS: [-0.01, 0.01, 0.02, 0.03],

  // Banks apply the annual rate with a days/360 convention (per Intesa's KFS),
  // which lands ~0.7% above the plain /12 annuity. This is an APPROXIMATION of
  // that gap, off by default — the exact convention varies by bank and cannot be
  // derived from a couple of published examples.
  DAY_COUNT_ADJUSTMENT: 365 / 360,

  // Loan-to-value comfort ceiling. Bank policy, not a statute: most banks finance
  // up to roughly 70-80% of the property value.
  LTV_WARN: 0.80,

  // Two-phase mortgage starting values (fixed period, then variable).
  FIXED_YEARS: 3,
  FIXED_RATE: 0.035,
  VARIABLE_RATE: 0.045,
};

/**
 * Monthly annuity installment. Closed form; handles the zero-interest case
 * (a plain equal-principal division) instead of dividing by zero.
 */
export function monthlyPayment(principal, annualRate, months) {
  if (months <= 0 || principal <= 0) return 0;
  const i = annualRate / 12;
  if (i === 0) return principal / months;
  return (principal * i) / (1 - Math.pow(1 + i, -months));
}

/**
 * Remaining balance after m payments — CLOSED FORM, no accumulation.
 *
 *   B(m) = P·(1+i)^m − A·((1+i)^m − 1)/i
 *
 * The zero-interest branch is the straight-line remainder P·(1 − m/n). Guards:
 * months <= 0 returns 0 (nothing is owed on a zero-length loan).
 */
export function balanceAfter(principal, annualRate, months, m) {
  if (months <= 0) return 0;
  const i = annualRate / 12;
  if (i === 0) return principal * (1 - m / months);
  const A = monthlyPayment(principal, annualRate, months);
  const growth = Math.pow(1 + i, m);
  return principal * growth - A * ((growth - 1) / i);
}

/**
 * Full amortization schedule. Built with Array.from + balanceAfter, NOT by
 * accumulating a running balance across rows.
 *
 * Each row derives entirely from the two surrounding closed-form balances:
 *   interest_k  = balance_{k-1} · i
 *   principal_k = payment − interest_k
 *   balance_k   = balanceAfter(..., k)   (clamped to 0 on the final row)
 *
 * Returns [] for a degenerate loan (no principal / no term) rather than a row of
 * NaNs.
 *
 * @returns {{ month:number, payment:number, interest:number, principal:number, balance:number }[]}
 */
export function schedule(principal, annualRate, months) {
  const n = Math.floor(months);
  if (n <= 0 || principal <= 0) return [];
  const i = annualRate / 12;
  const A = monthlyPayment(principal, annualRate, n);

  return Array.from({ length: n }, (_, idx) => {
    const k = idx + 1;
    const prevBalance = balanceAfter(principal, annualRate, n, k - 1);
    const interest = prevBalance * i;                 // i = 0 → interest 0
    const principalPart = A - interest;
    // Snap the final balance to exactly 0: floating-point leaves a sub-cent
    // residue that would otherwise render as "1 lek still owed".
    const balance = k === n ? 0 : balanceAfter(principal, annualRate, n, k);
    return { month: k, payment: A, interest, principal: principalPart, balance };
  });
}

/**
 * Headline totals. totalInterest is DERIVED (A·n − P), never summed from the
 * schedule — summing would couple the number to per-row rounding.
 */
export function totals(principal, annualRate, months) {
  const A = monthlyPayment(principal, annualRate, months);
  const n = months > 0 ? months : 0;
  return {
    monthlyPayment: A,
    totalPaid: A * n,
    totalInterest: A * n - (n > 0 ? principal : 0),
  };
}

/**
 * Total cost of credit in absolute currency (NOT an APR / NEI — that needs
 * root-finding, which is explicitly out of scope). It is interest plus the
 * one-off and recurring costs of taking the loan:
 *
 *   interest + disbursement fee + annual insurance × years + upfront costs
 *
 * @param {object} fees
 * @param {number} [fees.disbursementFeePct] fraction of principal, charged once
 * @param {number} [fees.annualInsurance]    absolute amount per year
 * @param {number} [fees.upfrontCosts]       absolute one-off amount
 */
export function totalCost(principal, annualRate, months, fees = {}) {
  const {
    disbursementFeePct = 0,
    annualInsurance = 0,
    upfrontCosts = 0,
  } = fees;
  const { totalInterest } = totals(principal, annualRate, months);
  const years = months > 0 ? months / 12 : 0;
  const disbursement = principal > 0 ? principal * disbursementFeePct : 0;
  const insurance = annualInsurance * years;
  return {
    interest: totalInterest,
    disbursement,
    insurance,
    upfront: upfrontCosts,
    total: totalInterest + disbursement + insurance + upfrontCosts,
  };
}

/**
 * Early repayment, CLOSED FORM. Paying an extra fixed amount every month raises
 * the installment to A' = A + extra and shortens the term to:
 *
 *   n' = −ln(1 − P·i/A') / ln(1+i)     (valid only when A' > P·i)
 *
 * The zero-interest case is the plain division P/A'. n' is rounded UP to a whole
 * month (you cannot make a fractional final payment schedule).
 *
 * @returns {{ newMonths:number, monthsSaved:number, interestSaved:number } | null}
 */
export function termWithExtraPayment(principal, annualRate, months, extraMonthly) {
  if (months <= 0 || principal <= 0) return null;
  const i = annualRate / 12;
  const A = monthlyPayment(principal, annualRate, months);
  const APrime = A + (extraMonthly > 0 ? extraMonthly : 0);
  if (APrime <= 0) return null;

  // Note: no `A' <= P·i` guard here. A real annuity's A always exceeds P·i (that
  // is what makes it amortize at all), so A' = A + extra does too — the guard
  // would be dead code. The genuine degenerate cases (months <= 0, principal <= 0)
  // are handled above.
  let newMonths;
  if (i === 0) {
    newMonths = Math.ceil(principal / APrime);
  } else {
    newMonths = Math.ceil(-Math.log(1 - (principal * i) / APrime) / Math.log(1 + i));
  }
  if (!Number.isFinite(newMonths) || newMonths <= 0) return null;
  newMonths = Math.min(newMonths, months); // extra payment can only shorten

  const monthsSaved = months - newMonths;
  // Interest saved = old total interest − new total interest, where the new
  // interest is (installments actually paid − principal). Both terms come from
  // closed-form totals; nothing is accumulated.
  //
  // Conservative by design: newMonths is rounded UP (Math.ceil), but the real
  // final payment would be partial, so newInterest here is a slight OVERestimate
  // and interestSaved is UNDERstated by up to ~one installment. Erring toward a
  // smaller advertised saving is the safe direction — do NOT "fix" this to use a
  // fractional final month without understanding it understates on purpose.
  const oldInterest = A * months - principal;
  const newInterest = APrime * newMonths - principal;
  const interestSaved = oldInterest - newInterest;

  return { newMonths, monthsSaved, interestSaved };
}

/**
 * Rate-shock scenarios: re-run monthlyPayment with the rate shifted up by each
 * shock (in percentage points, as a decimal — 0.01 = +1pp). No new math, just
 * the same annuity at a different rate. `delta` is the extra monthly cost vs the
 * base installment.
 */
export function rateShocks(principal, annualRate, months, shocks = []) {
  const base = monthlyPayment(principal, annualRate, months);
  return shocks.map((shock) => {
    const payment = monthlyPayment(principal, annualRate + shock, months);
    return { shock, rate: annualRate + shock, payment, delta: payment - base };
  });
}

/**
 * Effective annual rate under the Albanian bank convention:
 *   rate = max(index + margin, floor)
 * The floor (NMI, Norma Minimale e Interesit) is contractual: the bank never
 * charges below it no matter how far the reference index falls. Omitting it makes
 * downward rate scenarios produce rates that cannot occur.
 */
export function effectiveRate({ index = 0, margin = 0, floor = 0 } = {}) {
  return Math.max(index + margin, floor);
}

/**
 * Rate-shock scenarios under the reference-index model. Unlike rateShocks, the
 * shock moves ONLY the reference index (the market part); the bank margin is
 * fixed and the floor still applies. A negative shock large enough to push
 * index + margin below the floor pins the rate at the floor — the payment then
 * equals the base payment, which is exactly the behaviour that makes the floor
 * visible.
 *
 * @param {{index:number, margin:number, floor:number}} reference
 */
export function referenceRateShocks(principal, reference, months, shocks = []) {
  const baseRate = effectiveRate(reference);
  const base = monthlyPayment(principal, baseRate, months);
  return shocks.map((shock) => {
    const rate = effectiveRate({ ...reference, index: reference.index + shock });
    const payment = monthlyPayment(principal, rate, months);
    return { shock, rate, payment, delta: payment - base };
  });
}

/**
 * Two-phase Albanian mortgage: a fixed-rate period followed by a variable one.
 *
 * Phase 1's installment is the annuity over the FULL term (that is how the bank
 * quotes it), not over the fixed period. At the switch the outstanding balance is
 * re-amortized over the remaining months at the new rate, which is why the second
 * installment differs. A single-rate model cannot show that jump, and the jump is
 * the main risk the borrower is taking.
 *
 * All closed form: phase 1 via monthlyPayment over totalMonths, the switch
 * balance via balanceAfter, phase 2 via monthlyPayment over the remaining months.
 * Nothing is accumulated.
 *
 * Degenerate cases: fixedMonths <= 0 or fixedMonths >= totalMonths collapse to a
 * single-rate loan (phase2 null), never NaN.
 *
 * @returns {{
 *   phase1: { rate:number, months:number, payment:number },
 *   phase2: { rate:number, months:number, payment:number, openingBalance:number } | null,
 *   balanceAtSwitch: number,
 *   totalPaid: number, totalInterest: number,
 *   paymentDelta: number, paymentDeltaPct: number
 * }}
 */
export function twoPhaseLoan(principal, fixedRate, fixedMonths, variableRate, totalMonths) {
  const n = Math.floor(totalMonths);
  const fixedN = Math.floor(fixedMonths);
  const phase1Payment = monthlyPayment(principal, fixedRate, n);

  // Collapse to a single-rate loan when there is no distinct variable phase.
  if (n <= 0 || principal <= 0 || fixedN <= 0 || fixedN >= n) {
    const single = totals(principal, fixedRate, n);
    return {
      phase1: { rate: fixedRate, months: n > 0 ? n : 0, payment: phase1Payment },
      phase2: null,
      balanceAtSwitch: 0,
      totalPaid: single.totalPaid,
      totalInterest: single.totalInterest,
      paymentDelta: 0,
      paymentDeltaPct: 0,
    };
  }

  const balanceAtSwitch = balanceAfter(principal, fixedRate, n, fixedN);
  const remainingMonths = n - fixedN;
  const phase2Payment = monthlyPayment(balanceAtSwitch, variableRate, remainingMonths);

  // totalPaid derived from the two installment streams; totalInterest = paid − P.
  // Never summed from a schedule, so it can't drift with per-row rounding.
  const totalPaid = phase1Payment * fixedN + phase2Payment * remainingMonths;
  const totalInterest = totalPaid - principal;

  const paymentDelta = phase2Payment - phase1Payment;
  const paymentDeltaPct = phase1Payment > 0 ? paymentDelta / phase1Payment : 0;

  return {
    phase1: { rate: fixedRate, months: fixedN, payment: phase1Payment },
    phase2: {
      rate: variableRate,
      months: remainingMonths,
      payment: phase2Payment,
      openingBalance: balanceAtSwitch,
    },
    balanceAtSwitch,
    totalPaid,
    totalInterest,
    paymentDelta,
    paymentDeltaPct,
  };
}

/**
 * Amortization schedule for the two-phase mortgage. Rows up to fixedMonths come
 * from the phase-1 loan (annuity over the full term at the fixed rate); rows
 * after come from a FRESH closed-form amortization of the switch balance over the
 * remaining months at the variable rate. Still Array.from, still no accumulation:
 * each row derives from the two surrounding closed-form balances of its own
 * phase.
 *
 * Falls back to the single-rate schedule() when the loan collapses (no distinct
 * variable phase).
 *
 * @returns {{ month:number, phase:1|2, payment:number, interest:number, principal:number, balance:number }[]}
 */
export function twoPhaseSchedule(principal, fixedRate, fixedMonths, variableRate, totalMonths) {
  const n = Math.floor(totalMonths);
  const fixedN = Math.floor(fixedMonths);
  if (n <= 0 || principal <= 0) return [];
  if (fixedN <= 0 || fixedN >= n) {
    return schedule(principal, fixedRate, n).map((r) => ({ ...r, phase: 1 }));
  }

  const balanceAtSwitch = balanceAfter(principal, fixedRate, n, fixedN);
  const remainingMonths = n - fixedN;
  const iFixed = fixedRate / 12;
  const iVar = variableRate / 12;
  const phase1Payment = monthlyPayment(principal, fixedRate, n);
  const phase2Payment = monthlyPayment(balanceAtSwitch, variableRate, remainingMonths);

  return Array.from({ length: n }, (_, idx) => {
    const k = idx + 1;
    if (k <= fixedN) {
      const prev = balanceAfter(principal, fixedRate, n, k - 1);
      const interest = prev * iFixed;
      return {
        month: k,
        phase: 1,
        payment: phase1Payment,
        interest,
        principal: phase1Payment - interest,
        // Snap the very last row (only reachable if fixedN === n, already excluded)
        balance: balanceAfter(principal, fixedRate, n, k),
      };
    }
    // Phase 2 amortizes balanceAtSwitch over remainingMonths, indexed from 0.
    const j = k - fixedN; // 1..remainingMonths
    const prev = balanceAfter(balanceAtSwitch, variableRate, remainingMonths, j - 1);
    const interest = prev * iVar;
    const balance = k === n ? 0 : balanceAfter(balanceAtSwitch, variableRate, remainingMonths, j);
    return {
      month: k,
      phase: 2,
      payment: phase2Payment,
      interest,
      principal: phase2Payment - interest,
      balance,
    };
  });
}

/**
 * Property price and down payment → loan principal and loan-to-value ratio.
 * Guards a zero price (ltv 0, not NaN). The principal can't go below zero even
 * if the down payment exceeds the price.
 */
export function loanFromProperty(propertyPrice, downPayment) {
  const principal = Math.max(propertyPrice - downPayment, 0);
  const ltv = propertyPrice > 0 ? principal / propertyPrice : 0;
  return {
    principal,
    ltv,
    downPaymentPct: propertyPrice > 0 ? downPayment / propertyPrice : 0,
  };
}

/**
 * FX-shock scenarios for a EUR-denominated loan. Given the installment in EUR
 * and the current EUR->ALL rate, show the ALL installment if EUR appreciates by
 * each shock fraction (0.05 = +5%). `delta` is the extra ALL per month vs today.
 */
export function fxShocks(paymentInEur, rate, shocks = []) {
  const baseAll = paymentInEur * rate;
  return shocks.map((shock) => {
    const shockedRate = rate * (1 + shock);
    const paymentAll = paymentInEur * shockedRate;
    return { shock, rate: shockedRate, paymentAll, delta: paymentAll - baseAll };
  });
}

/**
 * Installment as a share of net monthly income (debt-to-income). Guards a zero
 * or negative income by returning null — a ratio against nothing is undefined,
 * not Infinity.
 *
 * @returns {{ ratio:number } | null}
 */
export function debtToIncome(monthlyPaymentAmount, netMonthlyIncome) {
  if (!(netMonthlyIncome > 0)) return null;
  return { ratio: monthlyPaymentAmount / netMonthlyIncome };
}
