-- Migration: De-duplicate recurring-generated transactions and add partial unique index
-- Prevents future duplicate instances when concurrent client-side generation runs.

-- Step A: De-duplicate existing rows, keep lowest id per (source_recurring_id, date)
DELETE FROM transactions t
USING transactions t2
WHERE t.source_recurring_id IS NOT NULL
  AND t.source_recurring_id = t2.source_recurring_id
  AND t.date = t2.date
  AND t.id > t2.id;

-- Step B: Partial unique index — manual transactions (NULL source_recurring_id) unaffected
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tx_recurring_date
  ON transactions (source_recurring_id, date)
  WHERE source_recurring_id IS NOT NULL;
