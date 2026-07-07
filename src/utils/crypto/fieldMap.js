// Declarative table -> encrypted-column map. categories.name is intentionally
// excluded (UNIQUE(user_id, name) constraint + server SQL functions read it
// directly for budget/health/benchmark logic). auth.users is out of scope.
//
// NUMERIC_FIELDS lists the subset of each table's encrypted fields that hold
// numbers rather than free text. They are stringified before encryption and
// coerced back to Number on read (see rowCodec). Amounts are only present in
// FIELD_MAP once ENCRYPT_AMOUNTS is on (Phase 0 Step C) — until the DB columns
// are retyped from NUMERIC to text, encrypting them would break inserts.
export const ENCRYPT_AMOUNTS = true;

const AMOUNT_FIELDS = ENCRYPT_AMOUNTS
  ? {
      transactions: ['amount', 'base_amount'],
      transaction_splits: ['amount', 'percentage'],
      recurring_transactions: ['amount'],
      budgets: ['amount'],
      goals: ['target_amount', 'current_amount'],
      goal_milestones: ['target_amount'],
      goal_contributions: ['amount'],
      assets: ['current_value'],
      net_worth_snapshots: ['total_assets', 'total_liabilities', 'net_worth'],
      financial_health_scores: [
        'total_income',
        'total_expenses',
        'savings_amount',
        // Derived scores (0-100) and category counts. Computed entirely
        // client-side (see finance/healthScore.js) and only ever stored/read
        // back by user_id + month_date — no query filters/sorts on their
        // values — so they are safe to encrypt.
        'total_score',
        'budget_adherence_score',
        'income_expense_ratio_score',
        'spending_volatility_score',
        'savings_consistency_score',
        'categories_over_budget',
        'categories_within_budget',
      ],
    }
  : {};

// Numeric encrypted fields per table — used by rowCodec to stringify on write
// and Number()-coerce on read. Always defined (independent of ENCRYPT_AMOUNTS)
// so coercion is stable, but only matters once these fields also live in
// FIELD_MAP.
export const NUMERIC_FIELDS = {
  transactions: ['amount', 'base_amount'],
  transaction_splits: ['amount', 'percentage'],
  recurring_transactions: ['amount'],
  budgets: ['amount'],
  goals: ['target_amount', 'current_amount'],
  goal_milestones: ['target_amount'],
  goal_contributions: ['amount'],
  assets: ['current_value'],
  net_worth_snapshots: ['total_assets', 'total_liabilities', 'net_worth'],
  financial_health_scores: [
    'total_income',
    'total_expenses',
    'savings_amount',
    'total_score',
    'budget_adherence_score',
    'income_expense_ratio_score',
    'spending_volatility_score',
    'savings_consistency_score',
    'categories_over_budget',
    'categories_within_budget',
  ],
};

// JSON encrypted fields per table — object/array-of-object values that are
// JSON.stringify'd into a single ciphertext string on write and JSON.parse'd
// back on read (see rowCodec). Only meaningful once the field also lives in
// FIELD_MAP. financial_health_scores.insights embeds raw money figures
// (savings / overspent amounts), so it must be encrypted like an amount.
export const JSON_FIELDS = {
  financial_health_scores: ['insights'],
};

const TEXT_FIELD_MAP = {
  transactions: ['title', 'tags'],
  recurring_transactions: ['title', 'tags'],
  goals: ['name', 'description'],
  goal_milestones: ['title'],
  goal_contributions: ['note'],
  assets: ['name', 'notes'],
  transaction_splits: ['notes'],
  // Client-generated financial notifications embed amounts in their text.
  // Server-created rows (pre-migration) stay plaintext — decryptRow tolerates
  // mixed rows, so reads never break.
  notifications: ENCRYPT_AMOUNTS ? ['title', 'message'] : [],
};

// Merge text + amount + json fields into the effective encryption map.
export const FIELD_MAP = Object.fromEntries(
  [
    ...new Set([
      ...Object.keys(TEXT_FIELD_MAP),
      ...Object.keys(AMOUNT_FIELDS),
      ...Object.keys(JSON_FIELDS),
    ]),
  ].map((table) => [
    table,
    [
      ...(TEXT_FIELD_MAP[table] || []),
      ...(AMOUNT_FIELDS[table] || []),
      ...(JSON_FIELDS[table] || []),
    ],
  ])
);

// Nested relations returned by a select() that also need decrypting.
// e.g. fetchGoalById() embeds goal_milestones rows under this key.
export const NESTED_RELATIONS = {
  goals: [{ key: 'goal_milestones', table: 'goal_milestones' }],
};

export const ENCRYPTED_TABLES = Object.keys(FIELD_MAP);

// Whether a given field on a table should be coerced back to Number on read.
export function isNumericField(table, field) {
  const list = NUMERIC_FIELDS[table];
  return !!list && list.includes(field);
}

// Whether a given field is a JSON value (stringified before encryption,
// parsed back on read).
export function isJsonField(table, field) {
  const list = JSON_FIELDS[table];
  return !!list && list.includes(field);
}
