// Lazy, resumable, per-user migration of existing plaintext data into
// ciphertext (or back to plaintext on reversal). Runs entirely client-side
// because only the browser holds the unwrapped DEK. Safe to interrupt at any
// point: every reader tolerates mixed plaintext/ciphertext, and new writes
// already encrypt/decrypt correctly regardless of migration progress.
import { getSupabase } from '../api/_auth';
import { updateUserKeys } from '../api/userKeys';
import { getDEK } from './keyring';
import { encryptField, decryptField, isEncrypted } from './cipher';
import { FIELD_MAP } from './fieldMap';

const BATCH_SIZE = 500;
const CONCURRENCY = 5;

// Recurring templates first: processRecurringTransactions() copies
// title/tags verbatim into new transactions, so templates must already be in
// their final (encrypted or decrypted) form before any transaction it
// generates mid-migration.
const TABLE_ORDER = [
  'recurring_transactions',
  'transactions',
  'transaction_splits',
  'goals',
  'goal_milestones',
  'goal_contributions',
  'assets',
  'budgets',
  'net_worth_snapshots',
  'financial_health_scores',
  'notifications',
];

async function withPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function transformValue(direction, dek, value) {
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => transformValue(direction, dek, v)));
  }
  if (direction === 'encrypt') {
    if (isEncrypted(value)) return value; // already migrated
    return encryptField(dek, value);
  }
  // decrypt direction: only touch encrypted values, leave plaintext as-is
  if (!isEncrypted(value)) return value;
  return decryptField(dek, value);
}

function needsWork(direction, row, fields) {
  return fields.some((f) => {
    const v = row[f];
    if (v === null || v === undefined) return false;
    const values = Array.isArray(v) ? v : [v];
    return direction === 'encrypt'
      ? values.some((x) => !isEncrypted(x))
      : values.some((x) => isEncrypted(x));
  });
}

async function fetchGoalIds(supabase, userId) {
  const { data, error } = await supabase.from('goals').select('id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((g) => g.id);
}

// goal_milestones has no user_id column; ownership is via goals.user_id (see
// RLS policy). Cursor pagination still works on id since goal ids are fixed
// for the duration of a migration run.
async function fetchBatch(supabase, table, userId, cursor, goalIds) {
  let query = supabase.from(table).select('*').order('id', { ascending: true }).limit(BATCH_SIZE);
  if (table === 'goal_milestones') {
    if (!goalIds.length) return [];
    query = query.in('goal_id', goalIds);
  } else {
    query = query.eq('user_id', userId);
  }
  if (cursor) query = query.gt('id', cursor);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function migrateTable(direction, supabase, table, userId, dek, cursor, goalIds, onProgress) {
  const fields = FIELD_MAP[table];
  let lastId = cursor && cursor !== 'done' ? cursor : null;

  while (true) {
    const batch = await fetchBatch(supabase, table, userId, lastId, goalIds);
    if (batch.length === 0) break;

    const toUpdate = batch.filter((row) => needsWork(direction, row, fields));

    await withPool(toUpdate, CONCURRENCY, async (row) => {
      const patch = {};
      for (const field of fields) {
        if (row[field] === null || row[field] === undefined) continue;
        patch[field] = await transformValue(direction, dek, row[field]);
      }
      const { error } = await supabase.from(table).update(patch).eq('id', row.id);
      if (error) throw error;
    });

    lastId = batch[batch.length - 1].id;
    onProgress?.(table, lastId);

    if (batch.length < BATCH_SIZE) break;
  }

  return 'done';
}

export async function runMigration(userId, encryptionStatus, onProgress) {
  const direction = encryptionStatus === 'disabling' ? 'decrypt' : 'encrypt';
  const supabase = await getSupabase();
  const dek = await getDEK();
  if (!dek) return; // locked — nothing we can do this session

  let lockRelease = null;
  if (typeof navigator !== 'undefined' && navigator.locks) {
    const acquired = await new Promise((resolve) => {
      navigator.locks.request('e2ee-migration', { ifAvailable: true }, (lock) => {
        if (!lock) return resolve(false);
        return new Promise((release) => {
          lockRelease = release;
          resolve(true);
        });
      });
    });
    if (!acquired) return; // another tab is already migrating
  }

  try {
    const { data: row, error } = await supabase
      .from('user_keys')
      .select('migration_cursor')
      .eq('user_id', userId)
      .single();
    if (error) throw error;

    const cursor = { ...(row?.migration_cursor || {}) };
    const goalIds = await fetchGoalIds(supabase, userId);

    for (const table of TABLE_ORDER) {
      if (cursor[table] === 'done') continue;

      await migrateTable(
        direction,
        supabase,
        table,
        userId,
        dek,
        cursor[table],
        goalIds,
        (t, lastId) => {
          cursor[t] = lastId;
          onProgress?.({ table: t, cursor: lastId });
          // Persist progress after every batch so an interruption resumes cleanly.
          updateUserKeys(userId, { migration_cursor: cursor }).catch(() => {});
        }
      );

      cursor[table] = 'done';
      await updateUserKeys(userId, { migration_cursor: cursor });
    }

    if (direction === 'encrypt') {
      await updateUserKeys(userId, { encryption_status: 'enabled', migration_cursor: {} });
    }
    // 'decrypt' direction completion (disable encryption) is finalized by
    // the caller, which deletes the user_keys row entirely.
  } finally {
    lockRelease?.();
  }
}
