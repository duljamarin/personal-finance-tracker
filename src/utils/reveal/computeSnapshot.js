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
  // 60% weight on savings rate (clamped 0..0.5 → 0..100), 40% on keeping
  // fixed costs reasonable (<=0.5 of income is ideal).
  const savingsComponent = income > 0 ? Math.max(0, Math.min(1, savingsRate / 0.5)) : 0;
  const fixedComponent = income > 0 ? Math.max(0, Math.min(1, (1 - fixedCostRatio) / 0.5)) : 0;
  const score = Math.round((savingsComponent * 0.6 + fixedComponent * 0.4) * 100);

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
