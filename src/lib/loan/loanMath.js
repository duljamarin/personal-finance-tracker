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
 * When A' <= P·i the extra payment never overtakes the interest accrual, so the
 * loan is not repaid in finite time — we return null rather than a bogus term.
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

  let newMonths;
  if (i === 0) {
    newMonths = Math.ceil(principal / APrime);
  } else {
    if (APrime <= principal * i) return null; // never amortizes
    newMonths = Math.ceil(-Math.log(1 - (principal * i) / APrime) / Math.log(1 + i));
  }
  if (!Number.isFinite(newMonths) || newMonths <= 0) return null;
  newMonths = Math.min(newMonths, months); // extra payment can only shorten

  const monthsSaved = months - newMonths;
  // Interest saved = old total interest − new total interest, where the new
  // interest is (installments actually paid − principal). Both terms come from
  // closed-form totals; nothing is accumulated.
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
