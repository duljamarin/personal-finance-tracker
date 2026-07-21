import { year2026 } from "./2026.js";

// Adding a future year = import it + add one entry here. Nothing else changes.
const YEAR_LIST = [year2026];

export const YEARS = Object.fromEntries(YEAR_LIST.map((y) => [y.year, y]));
export const AVAILABLE_YEARS = YEAR_LIST.map((y) => y.year).sort((a, b) => b - a); // newest first
export const DEFAULT_YEAR = AVAILABLE_YEARS[0]; // computed, not hardcoded
