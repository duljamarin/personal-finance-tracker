-- Migration: Track whether a user has already consumed their free trial.
-- Once had_trial = true it is never reset, preventing a second trial on re-subscribe.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS had_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: any subscription that already has a trial_end date has consumed their trial.
UPDATE subscriptions
  SET had_trial = TRUE
  WHERE trial_end IS NOT NULL;

COMMENT ON COLUMN subscriptions.had_trial IS
  'TRUE once the user has consumed their free trial. Never reset on re-subscribe.';
