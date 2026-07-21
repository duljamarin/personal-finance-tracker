/**
 * Albania salary engine.
 *
 * Holds NO tax logic, no tax constant, and no `if (year === ...)`. It resolves
 * a year from the registry and delegates. On an unknown year it throws — it
 * never silently falls back to another year, because a silent fallback would
 * present one year's numbers under another year's label.
 */
import { YEARS } from "./years/index.js";

function resolve(year) {
  const y = YEARS[year];
  if (!y) throw new Error(`Unsupported tax year: ${year}`);
  return y;
}

export function fromGross(gross, year) { return resolve(year).fromGross(gross); }
export function grossFromNet(net, year) { return resolve(year).grossFromNet(net); }
export function grossFromEmployerCost(cost, year) { return resolve(year).grossFromEmployerCost(cost); }
export function incomeTax(gross, year) { return resolve(year).incomeTax(gross); }
export function getConfig(year) { return resolve(year).config; }
export { YEARS, AVAILABLE_YEARS, DEFAULT_YEAR } from "./years/index.js";
