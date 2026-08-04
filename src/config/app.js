// Application-wide configuration constants
export const APP_CONFIG = {
  // Toast notifications
  TOAST_DURATION: 3000,

  // Greeting display duration
  GREETING_DURATION: 3500,

  // Currency settings
  BASE_CURRENCY: 'EUR',
  DEFAULT_EXCHANGE_RATE: 1.0,

  // Authentication
  MIN_PASSWORD_LENGTH: 6,
  MIN_USERNAME_LENGTH: 3,

  // Validation
  MIN_AMOUNT: 0.01,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,

  // Subscription — free-tier caps.
  // These are mirrored by the SQL limit triggers (see the latest
  // supabase_migrations/*_free_tier_limits / *_limit_triggers_* migration).
  // Changing a number here REQUIRES a matching migration, otherwise the client
  // and the database disagree about what a free user may create.
  FREE_TRANSACTION_LIMIT: 30,
  FREE_BUDGET_LIMIT: 10,
  FREE_RECURRING_LIMIT: 20,
  FREE_GOAL_LIMIT: 10,
  GRACE_PERIOD_DAYS: 30,
  TRIAL_DAYS: 7,

  // Dashboard quota bar visibility. The bar stays hidden until the user is
  // this far into their monthly transaction allowance, so a new user is never
  // shown a cap before they have seen any value from the app.
  QUOTA_VISIBLE_AT_FRACTION: 0.7,
};

// Transaction count at which the dashboard quota bar becomes visible.
// Derived, never hardcoded: changing FREE_TRANSACTION_LIMIT alone moves this.
export const QUOTA_VISIBLE_AT = Math.ceil(
  APP_CONFIG.FREE_TRANSACTION_LIMIT * APP_CONFIG.QUOTA_VISIBLE_AT_FRACTION
);
