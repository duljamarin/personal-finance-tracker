// Declarative table -> encrypted-column map. categories.name is intentionally
// excluded (UNIQUE(user_id, name) constraint + server SQL functions read it
// directly for budget/health/benchmark logic). auth.users is out of scope.
export const FIELD_MAP = {
  transactions: ['title', 'tags'],
  recurring_transactions: ['title', 'tags'],
  goals: ['name', 'description'],
  goal_milestones: ['title'],
  goal_contributions: ['note'],
  assets: ['name', 'notes'],
  transaction_splits: ['notes'],
};

// Nested relations returned by a select() that also need decrypting.
// e.g. fetchGoalById() embeds goal_milestones rows under this key.
export const NESTED_RELATIONS = {
  goals: [{ key: 'goal_milestones', table: 'goal_milestones' }],
};

export const ENCRYPTED_TABLES = Object.keys(FIELD_MAP);
