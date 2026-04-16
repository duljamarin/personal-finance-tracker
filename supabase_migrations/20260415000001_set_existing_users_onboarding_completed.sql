-- Mark existing users (who already have transactions) as onboarding completed
-- so they skip the new onboarding wizard.
-- The IS NOT TRUE guard makes this idempotent: users who already have
-- onboarding_completed set (true or false) intentionally are not overwritten.
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"onboarding_completed": true}'::jsonb
WHERE id IN (SELECT DISTINCT user_id FROM public.transactions)
  AND (raw_user_meta_data ->> 'onboarding_completed')::boolean IS NOT TRUE;
