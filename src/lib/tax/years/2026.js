/**
 * Albania — employment income, monthly, tax year 2026.
 *
 * A year file owns BOTH its numbers and its calculation logic, because Albania
 * can change the shape of a rule, not only its values. Adding a future year is
 * a new file here plus one line in ./index.js — no edits to the engine or UI.
 *
 * Statutory source: PwC Worldwide Tax Summaries, Albania, taxes on personal
 * income (individual employment income), 2026.
 * https://taxsummaries.pwc.com/albania/individual/taxes-on-personal-income
 *
 * INVARIANT: every statutory figure appears exactly once, inside CONFIG.
 * CONFIG holds the only numeric literals in this file. Every other value is
 * derived by formula. A derived number written as a literal is a bug.
 */

const CONFIG = {
  YEAR: 2026,
  LABEL: "2026",
  INCOME_TAX: {
    ZERO_CEILING: 50000,          // gross <= this: tax is 0
    MID_CEILING: 60000,           // upper edge of the middle band
    ALLOWANCE_MID: 35000,         // exempt portion when 50,000 < gross <= 60,000
    ALLOWANCE_HIGH: 30000,        // exempt portion when gross > 60,000
    HIGH_RATE_THRESHOLD: 200000,  // above this the higher rate applies
    RATE_LOW: 0.13,
    RATE_HIGH: 0.23,
  },
  CONTRIB: {
    EMPLOYEE_SOCIAL: 0.095,       // sigurime shoqërore, employee share
    EMPLOYEE_HEALTH: 0.017,       // sigurime shëndetësore, employee share
    EMPLOYER_SOCIAL: 0.15,        // employer social share
    EMPLOYER_HEALTH: 0.017,       // employer health share
    BASE_MIN: 50000,              // contribution base floor (2026)
    BASE_MAX: 186416,             // social-insurance base cap (2026); health is NOT capped
  },
};

// ---- Forward ----

/**
 * Monthly income tax (TAP) on GROSS salary — not on gross minus contributions.
 * Expressed only through CONFIG.
 */
function incomeTax(gross) {
  const c = CONFIG.INCOME_TAX;
  if (gross <= c.ZERO_CEILING) return 0;
  if (gross <= c.MID_CEILING) return c.RATE_LOW * (gross - c.ALLOWANCE_MID);
  if (gross <= c.HIGH_RATE_THRESHOLD) return c.RATE_LOW * (gross - c.ALLOWANCE_HIGH);
  const lowBandTax = c.RATE_LOW * (c.HIGH_RATE_THRESHOLD - c.ALLOWANCE_HIGH); // derived, never a literal
  return lowBandTax + c.RATE_HIGH * (gross - c.HIGH_RATE_THRESHOLD);
}

/**
 * Social insurance base: floor AND cap.
 * This asymmetry vs healthBase() is legally correct — do not "simplify" it.
 */
function socialBase(gross) {
  const c = CONFIG.CONTRIB;
  return Math.min(Math.max(gross, c.BASE_MIN), c.BASE_MAX);
}

/**
 * Health insurance base: floor only, NO upper cap.
 * Above BASE_MAX, health is charged on the full gross.
 */
function healthBase(gross) {
  const c = CONFIG.CONTRIB;
  return Math.max(gross, c.BASE_MIN);
}

function employeeContrib(gross) {
  const c = CONFIG.CONTRIB;
  const social = c.EMPLOYEE_SOCIAL * socialBase(gross);
  const health = c.EMPLOYEE_HEALTH * healthBase(gross);
  return { social, health, total: social + health }; // total is a sum, never a blended rate literal
}

function employerContrib(gross) {
  const c = CONFIG.CONTRIB;
  const social = c.EMPLOYER_SOCIAL * socialBase(gross);
  const health = c.EMPLOYER_HEALTH * healthBase(gross);
  return { social, health, total: social + health };
}

/**
 * Full breakdown from a gross salary. No rounding — full float precision.
 * Rounding happens only at display time in the component.
 *
 * @param {number} gross
 * @returns {{gross:number, incomeTax:number, employeeSocial:number, employeeHealth:number,
 *   employeeContribTotal:number, net:number, employerSocial:number, employerHealth:number,
 *   employerContribTotal:number, employerCost:number}}
 */
function fromGross(gross) {
  const tax = incomeTax(gross);
  const ee = employeeContrib(gross);
  const er = employerContrib(gross);
  return {
    gross,
    incomeTax: tax,
    employeeSocial: ee.social,
    employeeHealth: ee.health,
    employeeContribTotal: ee.total,
    net: gross - tax - ee.total,
    employerSocial: er.social,
    employerHealth: er.health,
    employerContribTotal: er.total,
    employerCost: gross + er.total,
  };
}

// ---- Inverses (closed-form, no solver loops) ----

/**
 * net(gross) is piecewise-linear: net = m*gross + b per band, with m and b
 * derived from CONFIG. Solving each band is one division — no bisection,
 * no convergence loop. The only iteration is this fixed scan over 5 bands.
 *
 * The tax notches at ZERO_CEILING and MID_CEILING make net(gross)
 * non-monotonic, so some net values map to more than one gross. Convention:
 * return the LOWEST gross — scan bands from lowest gross upward and return the
 * first whose inverse lands inside its own gross range.
 */
function grossFromNet(targetNet) {
  const t = CONFIG.INCOME_TAX;
  const c = CONFIG.CONTRIB;
  const eeTotal = c.EMPLOYEE_SOCIAL + c.EMPLOYEE_HEALTH;
  const lowBandTax = t.RATE_LOW * (t.HIGH_RATE_THRESHOLD - t.ALLOWANCE_HIGH);

  const bands = [
    // Band 0: gross <= BASE_MIN (contributions on the floored base, no tax)
    { m: 1,
      b: -eeTotal * c.BASE_MIN,
      lo: 0, hi: c.BASE_MIN },
    // Band 1: BASE_MIN < gross <= MID_CEILING (mid allowance)
    { m: 1 - t.RATE_LOW - eeTotal,
      b: t.RATE_LOW * t.ALLOWANCE_MID,
      lo: c.BASE_MIN, hi: t.MID_CEILING },
    // Band 2: MID_CEILING < gross <= BASE_MAX (high allowance, both contributions on gross)
    { m: 1 - t.RATE_LOW - eeTotal,
      b: t.RATE_LOW * t.ALLOWANCE_HIGH,
      lo: t.MID_CEILING, hi: c.BASE_MAX },
    // Band 3: BASE_MAX < gross <= HIGH_RATE_THRESHOLD (social frozen at cap, health on gross)
    { m: 1 - t.RATE_LOW - c.EMPLOYEE_HEALTH,
      b: t.RATE_LOW * t.ALLOWANCE_HIGH - c.EMPLOYEE_SOCIAL * c.BASE_MAX,
      lo: c.BASE_MAX, hi: t.HIGH_RATE_THRESHOLD },
    // Band 4: gross > HIGH_RATE_THRESHOLD (higher rate, social still frozen at cap)
    { m: 1 - t.RATE_HIGH - c.EMPLOYEE_HEALTH,
      b: -lowBandTax + t.RATE_HIGH * t.HIGH_RATE_THRESHOLD - c.EMPLOYEE_SOCIAL * c.BASE_MAX,
      lo: t.HIGH_RATE_THRESHOLD, hi: Infinity },
  ];

  const EPS = 1e-9;
  for (const band of bands) {
    const gross = (targetNet - band.b) / band.m;
    if (gross > band.lo - EPS && gross <= band.hi + EPS) return gross;
  }
  return NaN; // unreachable: bands cover every net value
}

/**
 * employerCost(gross) has no notches (employer contributions are pure rates on
 * a monotonic base), so it is monotonic and inverts in three plain branches.
 */
function grossFromEmployerCost(targetCost) {
  const c = CONFIG.CONTRIB;
  const erTotal = c.EMPLOYER_SOCIAL + c.EMPLOYER_HEALTH;
  const costAtMin = c.BASE_MIN * (1 + erTotal);
  const costAtMax = c.BASE_MAX * (1 + erTotal);

  if (targetCost <= costAtMin) return targetCost - erTotal * c.BASE_MIN;           // gross <= BASE_MIN
  if (targetCost <= costAtMax) return targetCost / (1 + erTotal);                  // BASE_MIN < gross <= BASE_MAX
  return (targetCost - c.EMPLOYER_SOCIAL * c.BASE_MAX) / (1 + c.EMPLOYER_HEALTH);  // gross > BASE_MAX
}

// Named export implementing the shared year shape.
export const year2026 = {
  year: CONFIG.YEAR,
  label: CONFIG.LABEL,
  config: CONFIG,
  incomeTax,
  fromGross,
  grossFromNet,
  grossFromEmployerCost,
};
