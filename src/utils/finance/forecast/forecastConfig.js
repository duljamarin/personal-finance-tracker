// End-of-month forecast: the only inputs of the feature. Every other number
// is derived from these in forecastEngine.js (see its header for the formulas).

/** Full calendar months before the current month used for "your usual pace". */
export const LOOKBACK_MONTHS = 3;

/** History months needed for 'high' confidence. */
export const CONFIDENCE_FULL_MONTHS = LOOKBACK_MONTHS;

/** Before this day of the month the card shows the "early estimate" note. */
export const EARLY_MONTH_DAYS = 7;

/**
 * What Premium unlocks on the forecast card:
 * 'none'      everything free
 * 'breakdown' headline + range free; breakdown, scheduled list, categories Premium
 * 'all'       the whole card Premium
 */
export const FORECAST_PREMIUM_SCOPE = 'breakdown';

export const FORECAST_CONFIG = {
  LOOKBACK_MONTHS,
  CONFIDENCE_FULL_MONTHS,
  EARLY_MONTH_DAYS,
  FORECAST_PREMIUM_SCOPE,
};
