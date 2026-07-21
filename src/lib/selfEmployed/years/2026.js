/**
 * Albania — self-employed (person fizik) tax treatment, tax year 2026.
 *
 * A year file owns BOTH its numbers and its logic. Adding a future year is a
 * new file here plus one line in ./index.js.
 *
 * The hard part of this domain is not arithmetic, it is ELIGIBILITY: whether a
 * freelancer keeps the 0% profit-tax regime at all. determineTreatment() encodes
 * that decision tree explicitly and returns a determinate status — no hidden
 * defaults, no "probably fine" fallthrough.
 *
 * Statutory sources:
 *  - Law 29/2023, Art. 69  — 0% profit tax up to ALL 14,000,000 until 2029-12-31
 *  - Law 29/2023, Art. 12/1/ç — client-concentration reclassification
 *  - Law 29/2023, Art. 24  — progressive employment rates (applied by the salary engine)
 *  - PwC Worldwide Tax Summaries, Albania — other taxes (fixed contributions), VAT threshold
 *
 * NOT encoded, deliberately: the VKM 753/2023 "liberal professions" exclusion
 * list. It was struck down by Constitutional Court decision 52 of 27.06.2024,
 * so no profession-based exclusion exists in this engine.
 *
 * INVARIANT: CONFIG holds the only numeric literals in this file.
 */

const CONFIG = {
  YEAR: 2026,
  LABEL: "2026",
  PROFIT_TAX_FREE_TURNOVER: 14000000, // annual turnover ceiling for 0% (until 2029-12-31)
  ZERO_REGIME_UNTIL: "2029-12-31",
  VAT_THRESHOLD: 10000000,            // annual turnover: VAT registration required above this
  CONTRIB: {
    SOCIAL_RATE: 0.23,               // self-employed social insurance rate
    SOCIAL_BASE: 50000,              // = minimum wage
    HEALTH_RATE: 0.034,              // self-employed health insurance rate
    HEALTH_BASE: 100000,             // = double the minimum wage
  },
  CONCENTRATION: {
    SINGLE_CLIENT_PCT: 0.80,         // >= this from one client -> reclassified
    FEWER_THAN_THREE_PCT: 0.90,      // >= this from fewer than three clients -> reclassified
    FEWER_THAN_THREE_COUNT: 3,       // "fewer than three" = 1 or 2 clients
  },
};

/**
 * Fixed monthly self-employed contributions, charged on the minimum declared
 * base — NOT a percentage of actual income. A freelancer earning 300,000/month
 * and one earning 1,000,000/month pay the identical amount.
 */
function monthlyContributions() {
  const c = CONFIG.CONTRIB;
  const social = c.SOCIAL_RATE * c.SOCIAL_BASE;   // derived, never the literal 11500
  const health = c.HEALTH_RATE * c.HEALTH_BASE;   // derived, never the literal 3400
  return { social, health, total: social + health };
}

/**
 * Determine tax treatment from the client profile.
 *
 * Order matters and is legally load-bearing:
 *   1. Turnover cliff — above the ceiling the 0% regime is gone entirely, so it
 *      is checked before anything else.
 *   2. All-foreign-client exception — disapplies the concentration rule
 *      completely, even at 100% concentration on a single client.
 *   3. Concentration tests — both thresholds are inclusive (>=).
 *
 * @param {{allClientsForeign:boolean, singleClientMaxShare:number, topTwoClientsShare:number, annualTurnover:number}} p
 *   allClientsForeign: true if every client is a non-resident with no PE in Albania
 *   singleClientMaxShare: highest share of income from any one client, 0..1
 *   topTwoClientsShare: combined share from the top one or two clients, 0..1
 *   annualTurnover: annual gross turnover in ALL
 * @returns {{ status: "ZERO_REGIME"|"RECLASSIFIED"|"OVER_TURNOVER", reason: string }}
 */
function determineTreatment(p) {
  // Turnover cliff first: above the ceiling, the 0% regime does not apply at all.
  if (p.annualTurnover > CONFIG.PROFIT_TAX_FREE_TURNOVER) {
    return { status: "OVER_TURNOVER", reason: "turnover_above_14m" };
  }
  // Foreign-only clients: reclassification rule is entirely disapplied.
  if (p.allClientsForeign) {
    return { status: "ZERO_REGIME", reason: "all_clients_foreign" };
  }
  // Has at least one Albanian client: apply the concentration test.
  const k = CONFIG.CONCENTRATION;
  if (p.singleClientMaxShare >= k.SINGLE_CLIENT_PCT) {
    return { status: "RECLASSIFIED", reason: "single_client_80" };
  }
  if (p.topTwoClientsShare >= k.FEWER_THAN_THREE_PCT) {
    return { status: "RECLASSIFIED", reason: "fewer_than_three_90" };
  }
  return { status: "ZERO_REGIME", reason: "diversified_clients" };
}

/**
 * Take-home for the clean 0% business case.
 * adminMonthly is a USER INPUT (accountant, fiscalisation, bank fees) — an
 * estimate, not a statutory figure, which is why it is a parameter.
 */
function zeroRegimeMonthly(monthlyIncome, adminMonthly) {
  const contrib = monthlyContributions();
  return {
    income: monthlyIncome,
    incomeTax: 0,
    contribSocial: contrib.social,
    contribHealth: contrib.health,
    contribTotal: contrib.total,
    adminCosts: adminMonthly,
    net: monthlyIncome - contrib.total - adminMonthly,
  };
}

/**
 * VAT is a COMPLIANCE FLAG, never a deduction from take-home: B2B services
 * exported to foreign clients are zero-rated, so registering costs paperwork,
 * not money out of pocket.
 */
function vatFlag(annualTurnover) {
  return {
    mustRegister: annualTurnover > CONFIG.VAT_THRESHOLD,
    threshold: CONFIG.VAT_THRESHOLD,
  };
}

export const year2026 = {
  year: CONFIG.YEAR,
  label: CONFIG.LABEL,
  config: CONFIG,
  monthlyContributions,
  determineTreatment,
  zeroRegimeMonthly,
  vatFlag,
};
