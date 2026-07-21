/**
 * Albania self-employed (freelancer) engine.
 *
 * Holds NO tax logic, no tax constant, and no `if (year === ...)`. It resolves a
 * year from the registry and delegates. Throws on an unknown year rather than
 * silently falling back — a fallback would present one year's rules under
 * another year's label.
 *
 * Note on the reclassified branch: employment tax is NOT re-implemented here.
 * Callers import `incomeTax` from ../tax/albaniaSalary.js so there is exactly
 * one copy of the Art. 24 progressive brackets in the codebase. Two copies that
 * can drift apart is a bug, not a convenience.
 */
import { YEARS } from "./years/index.js";

function resolve(year) {
  const y = YEARS[year];
  if (!y) throw new Error(`Unsupported tax year: ${year}`);
  return y;
}

export function monthlyContributions(year) { return resolve(year).monthlyContributions(); }
export function determineTreatment(profile, year) { return resolve(year).determineTreatment(profile); }
export function zeroRegimeMonthly(monthlyIncome, adminMonthly, year) {
  return resolve(year).zeroRegimeMonthly(monthlyIncome, adminMonthly);
}
export function vatFlag(annualTurnover, year) { return resolve(year).vatFlag(annualTurnover); }
export function getConfig(year) { return resolve(year).config; }
export { YEARS, AVAILABLE_YEARS, DEFAULT_YEAR } from "./years/index.js";
