-- Currency change with full value conversion.
--
-- Amounts are E2E-encrypted, so the server cannot convert them: the work runs in
-- the browser (decrypt -> multiply -> re-encrypt -> write) exactly like the
-- existing encryption migration runner. That makes an interrupted run the real
-- hazard — half the rows converted, half not, with no way to tell them apart
-- once currency_code stops being per-row truth.
--
-- These columns are the safety net:
--   conversion_state  - NULL when idle, 'converting' while a run is in flight.
--   conversion_cursor - per-table progress, so a resumed run continues instead
--                       of restarting (restarting would double-convert).
--   conversion_from / conversion_to / conversion_rate - the run's parameters,
--                       pinned at start. A resumed run MUST reuse the pinned
--                       rate, never re-fetch, or rows converted before and after
--                       the interruption would use different rates.
--
-- Idempotency rule: a row is only ever converted once because the cursor
-- advances monotonically by id within each table and is persisted after every
-- batch.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS conversion_state text
    CHECK (conversion_state IS NULL OR conversion_state IN ('converting')),
  ADD COLUMN IF NOT EXISTS conversion_cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS conversion_from text,
  ADD COLUMN IF NOT EXISTS conversion_to text,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric,
  ADD COLUMN IF NOT EXISTS conversion_started_at timestamptz;

COMMENT ON COLUMN public.user_settings.conversion_state IS
  'NULL = idle. ''converting'' = a client-side currency conversion is in flight; the UI blocks a second run and resumes this one.';
COMMENT ON COLUMN public.user_settings.conversion_cursor IS
  'Per-table last-converted id, e.g. {"transactions":"<uuid>","goals":"done"}. Persisted after every batch so an interrupted run resumes without double-converting.';
COMMENT ON COLUMN public.user_settings.conversion_rate IS
  'Rate pinned when the run started. A resumed run reuses it; re-fetching would apply two different rates within one conversion.';
