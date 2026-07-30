// Pure client-side computation for the onboarding "Radiografia Financiare"
// reveal. Runs entirely in memory from the wizard's inputs — nothing is
// persisted here (the wizard separately seeds transactions/recurring/budgets).
// All amounts are normalized to the base currency (EUR) via exchangeRate.

// Static reference shares (a 50/30/20-derived heuristic) used only to frame
// "where you stand" — NOT financial advice. Keyed by a coarse bucket derived
// from the category name; unknown categories fall into 'other'.
const REFERENCE_SHARES = {
  housing: 0.30,
  food: 0.15,
  transport: 0.15,
  other: 0.20,
};

// Map a (translated or raw) category name to a coarse reference bucket.
export function referenceBucket(name = '') {
  const n = String(name).toLowerCase();
  if (/(rent|hous|qira|apartment|mortgage|banes)/.test(n)) return 'housing';
  if (/(food|groc|ushqim|restaurant|dining|market)/.test(n)) return 'food';
  if (/(transport|fuel|car|gas|bus|taxi|udhet|makin)/.test(n)) return 'transport';
  return 'other';
}

// Linear interpolation across an ascending list of [x, y] anchor points.
// Values outside the range clamp to the first/last anchor.
function interpolate(points, x) {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1];
}

// Savings rate -> 0..1. Deliberately never reaches 1.0: saving 30% of income is
// very good but is not a perfect financial life, and a curve that tops out
// early is exactly what made every score read 100.
export function savingsScore(rate) {
  return interpolate(
    [
      [-0.5, 0],    // spending 150% of income
      [-0.1, 0.15], // slightly overspending
      [0, 0.3],     // breaking even
      [0.1, 0.48],
      [0.2, 0.62],  // the common "healthy" target
      [0.3, 0.75],
      [0.5, 0.88],
      [0.7, 0.96],
    ],
    rate
  );
}

// Share of income consumed by fixed bills -> 0..1 (lower share scores higher).
export function fixedCostScore(ratio) {
  return interpolate(
    [
      [0.1, 0.97],
      [0.3, 0.9],
      [0.5, 0.7],  // half of income on fixed bills: mediocre
      [0.65, 0.45],
      [0.8, 0.19],
      [1.0, 0.05],
      [1.3, 0],
    ],
    ratio
  );
}

// income: number (base currency, monthly)
// bills: [{ amount: number, categoryName?: string }] monthly fixed bills (base currency)
// opts: { payday?: number 1-31 }
export function computeSnapshot({ income = 0, bills = [], payday = null } = {}) {
  const totalBills = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const monthlySavings = income - totalBills;
  const savingsRate = income > 0 ? monthlySavings / income : 0;
  const fixedCostRatio = income > 0 ? totalBills / income : (totalBills > 0 ? 1 : 0);

  // Projection to end of calendar year + rolling 12 months.
  const now = new Date();
  const monthsLeftInYear = 12 - now.getMonth(); // includes current month
  const projectedToYearEnd = monthlySavings * monthsLeftInYear;
  const projectedAnnual = monthlySavings * 12;

  // Starting score 0-100 (heuristic; NOT the history-based health RPC).
  //
  // Both components used to be linear ramps that SATURATED at realistic inputs
  // (savings rate >= 20%, fixed costs <= 50% of income), so the overwhelmingly
  // common case — "salary plus two or three fixed bills" — maxed both terms and
  // every user saw exactly 100. The curves below never reach 1.0, so the score
  // stays responsive across the whole realistic range instead of flat-lining.
  //
  //   savings:    piecewise, anchored so 0% -> 0, 20% -> 62, 50% -> 88
  //   fixed cost: piecewise on the share of income eaten by fixed bills,
  //               anchored so 80% -> ~19, 50% -> 70, 30% -> 90
  const hasBillsData = totalBills > 0;
  const savingsComponent = income > 0 ? savingsScore(savingsRate) : 0;
  const fixedComponent = income > 0 && hasBillsData ? fixedCostScore(fixedCostRatio) : 0;

  let score;
  if (income > 0 && hasBillsData) {
    // Full signal: 60% savings rate, 40% fixed-cost discipline.
    score = savingsComponent * 60 + fixedComponent * 40;

    // Confidence damping. The wizard only captures FIXED bills, so every euro
    // the user didn't list looks like savings — someone who enters just "rent"
    // scores like a champion saver. Pull the score toward a neutral 55 when the
    // picture is thin, and trust it more as more bills are listed. Without this
    // the one-or-two-bill case (by far the most common) pins near the ceiling.
    const confidence = interpolate([[1, 0.55], [2, 0.72], [3, 0.87], [4, 1]], bills.length);
    score = Math.round(55 + (score - 55) * confidence);

    // A starting snapshot built from fixed bills alone cannot prove a flawless
    // financial picture (no history, no variable spending, no savings buffer).
    // Reserve the top of the scale for the real history-based health score.
    score = Math.min(92, score);
  } else if (income > 0) {
    // Income only, no bills: the savings-rate term is meaningless (it would be
    // 100%). Score the one thing we do know — that income exists — at a modest
    // baseline that still varies with nothing, so keep it honest and flat.
    score = 55;
  } else if (hasBillsData) {
    // Bills only, no income: we know outgoings but not capacity. Low-confidence
    // baseline, nudged down as the bill load grows in absolute terms.
    score = 40;
  } else {
    score = 0;
  }
  score = Math.max(0, Math.min(100, score));

  // Per-category comparison vs reference share of income; surface the single
  // biggest "opportunity" (category most over its reference share).
  let opportunity = null;
  if (income > 0 && bills.length > 0) {
    for (const b of bills) {
      const bucket = referenceBucket(b.categoryName);
      const refShare = REFERENCE_SHARES[bucket] ?? REFERENCE_SHARES.other;
      const yourShare = Number(b.amount || 0) / income;
      const overBy = yourShare - refShare;
      if (overBy > 0) {
        const potentialMonthly = (yourShare - refShare) * income;
        if (!opportunity || potentialMonthly > opportunity.potentialMonthly) {
          opportunity = {
            categoryName: b.categoryName || '',
            bucket,
            yourShare,
            refShare,
            potentialMonthly,
            potentialAnnual: potentialMonthly * 12,
          };
        }
      }
    }
  }

  // Safe-to-spend per day until payday (or end of month).
  let daysUntilPayday;
  if (payday && payday >= 1 && payday <= 31) {
    const day = now.getDate();
    if (payday > day) daysUntilPayday = payday - day;
    else {
      // next month's payday
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      daysUntilPayday = daysInMonth - day + payday;
    }
  } else {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    daysUntilPayday = daysInMonth - now.getDate() + 1;
  }
  daysUntilPayday = Math.max(1, daysUntilPayday);
  const discretionaryMonthly = Math.max(0, monthlySavings);
  const safeToSpendPerDay = discretionaryMonthly / daysUntilPayday;

  return {
    income,
    totalBills,
    monthlySavings,
    savingsRate,
    fixedCostRatio,
    score,
    projectedToYearEnd,
    projectedAnnual,
    monthsLeftInYear,
    opportunity,
    safeToSpendPerDay,
    daysUntilPayday,
    positive: monthlySavings > 0,
    hasIncome: income > 0,
    billsCount: bills.length,
  };
}
