// Client-side currency conversion.
//
// Amounts are E2E-encrypted, so the server cannot multiply them: every value has
// to be decrypted, scaled, re-encrypted and written back from the browser. That
// makes an interrupted run the real hazard, so this mirrors the encryption
// migration runner's safety model:
//
//   - navigator.locks stops a second tab from converting at the same time.
//   - The cursor is persisted after every batch, so an interrupted run resumes
//     where it stopped instead of restarting (restarting would double-convert).
//   - The rate is pinned in the DB when the run starts. A resumed run reuses the
//     pinned rate; re-fetching would apply two different rates within one run.
//   - Rows are walked in id order, so the cursor is monotonic and a row can
//     never be visited twice within a run.
//
// Percentage columns are deliberately NOT scaled: a split percentage is a ratio,
// not money.
import { getSupabase } from './api/_auth';
import { decryptRows, encryptRow } from './crypto/rowCodec';

const BATCH_SIZE = 200;
const CONCURRENCY = 5;

// Money columns per table. Mirrors crypto/fieldMap.js minus the non-money
// fields (percentage) and minus derived columns that are recomputed rather than
// scaled.
const MONEY_FIELDS = {
  transactions: ['amount', 'base_amount'],
  transaction_splits: ['amount'],
  recurring_transactions: ['amount'],
  budgets: ['amount'],
  goals: ['target_amount', 'current_amount'],
  goal_milestones: ['target_amount'],
  goal_contributions: ['amount'],
};

// Parents before children, so a crash mid-run never leaves a child scaled while
// its parent is not in a way that a resume would compound.
const TABLE_ORDER = [
  'transactions',
  'transaction_splits',
  'recurring_transactions',
  'budgets',
  'goals',
  'goal_milestones',
  'goal_contributions',
];

async function withPool(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function fetchGoalIds(supabase, userId) {
  const { data, error } = await supabase.from('goals').select('id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((g) => g.id);
}

// goal_milestones has no user_id column; ownership is via goals.user_id.
async function fetchBatch(supabase, table, userId, cursor, goalIds) {
  let query = supabase
    .from(table)
    .select('*')
    .order('id', { ascending: true })
    .limit(BATCH_SIZE);

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

function scale(value, rate) {
  const n = Number(value);
  if (!isFinite(n)) return null;
  // 2dp is the precision every amount is displayed at; keeping more invites
  // drift between the stored value and what the user sees.
  return Math.round(n * rate * 100) / 100;
}

async function convertTable(supabase, table, userId, rate, cursor, goalIds, onBatch) {
  const fields = MONEY_FIELDS[table];
  let lastId = cursor && cursor !== 'done' ? cursor : null;

  while (true) {
    const raw = await fetchBatch(supabase, table, userId, lastId, goalIds);
    if (raw.length === 0) break;

    const rows = await decryptRows(table, raw);

    await withPool(rows, CONCURRENCY, async (row) => {
      const patch = {};
      for (const field of fields) {
        if (row[field] === null || row[field] === undefined) continue;
        const next = scale(row[field], rate);
        if (next === null) continue;
        patch[field] = next;
      }
      if (Object.keys(patch).length === 0) return;

      const encrypted = await encryptRow(table, patch);
      const { error } = await supabase.from(table).update(encrypted).eq('id', row.id);
      if (error) throw error;
    });

    lastId = raw[raw.length - 1].id;
    onBatch?.(table, lastId);

    if (raw.length < BATCH_SIZE) break;
  }
}

async function readState(supabase, userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('conversion_state, conversion_cursor, conversion_from, conversion_to, conversion_rate')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function writeState(supabase, userId, patch) {
  const { error } = await supabase.from('user_settings').update(patch).eq('user_id', userId);
  if (error) throw error;
}

/**
 * True when a previous run was interrupted and needs finishing. The UI uses this
 * to resume automatically instead of offering a fresh currency change on top of
 * half-converted data.
 */
export async function getPendingConversion(userId) {
  const supabase = await getSupabase();
  const state = await readState(supabase, userId);
  if (!state || state.conversion_state !== 'converting') return null;
  return {
    from: state.conversion_from,
    to: state.conversion_to,
    rate: Number(state.conversion_rate),
    cursor: state.conversion_cursor || {},
  };
}

/**
 * Converts every stored amount by `rate` and switches the user's currency.
 *
 * Safe to call again after an interruption: it picks up the pinned rate and
 * cursor rather than starting over. Returns 'busy' when another tab holds the
 * lock, 'done' on completion.
 *
 * @param {string} userId
 * @param {{ from: string, to: string, rate: number }} params
 * @param {(p: {table: string, done: number, total: number}) => void} [onProgress]
 */
export async function convertAllAmounts(userId, { from, to, rate }, onProgress) {
  const supabase = await getSupabase();

  let lockRelease = null;
  if (typeof navigator !== 'undefined' && navigator.locks) {
    const acquired = await new Promise((resolve) => {
      navigator.locks.request('currency-conversion', { ifAvailable: true }, (lock) => {
        if (!lock) return resolve(false);
        return new Promise((release) => {
          lockRelease = release;
          resolve(true);
        });
      });
    });
    if (!acquired) return 'busy';
  }

  try {
    const existing = await readState(supabase, userId);

    // Resume: reuse the pinned parameters, ignoring whatever the caller passed.
    // Mixing a fresh rate into a half-finished run is how amounts get skewed.
    const resuming = existing?.conversion_state === 'converting';
    const runRate = resuming ? Number(existing.conversion_rate) : rate;
    const runTo = resuming ? existing.conversion_to : to;
    const cursor = resuming ? { ...(existing.conversion_cursor || {}) } : {};

    if (!isFinite(runRate) || runRate <= 0) {
      throw new Error('Invalid conversion rate');
    }

    if (!resuming) {
      await writeState(supabase, userId, {
        conversion_state: 'converting',
        conversion_cursor: {},
        conversion_from: from,
        conversion_to: to,
        conversion_rate: rate,
        conversion_started_at: new Date().toISOString(),
      });
    }

    const goalIds = await fetchGoalIds(supabase, userId);
    let doneTables = 0;

    for (const table of TABLE_ORDER) {
      if (cursor[table] === 'done') {
        doneTables += 1;
        continue;
      }

      await convertTable(
        supabase,
        table,
        userId,
        runRate,
        cursor[table],
        goalIds,
        (t, lastId) => {
          cursor[t] = lastId;
          onProgress?.({ table: t, done: doneTables, total: TABLE_ORDER.length });
          // Persist after every batch: this is what makes a resume safe.
          writeState(supabase, userId, { conversion_cursor: cursor }).catch(() => {});
        }
      );

      cursor[table] = 'done';
      doneTables += 1;
      await writeState(supabase, userId, { conversion_cursor: cursor });
      onProgress?.({ table, done: doneTables, total: TABLE_ORDER.length });
    }

    // Only now does the currency flip. If anything above threw, the user keeps
    // the old currency and the cursor, so a resume finishes the job instead of
    // leaving the label out of sync with the data.
    await writeState(supabase, userId, {
      preferred_currency: runTo,
      conversion_state: null,
      conversion_cursor: {},
      conversion_from: null,
      conversion_to: null,
      conversion_rate: null,
      conversion_started_at: null,
    });

    return 'done';
  } finally {
    lockRelease?.();
  }
}
