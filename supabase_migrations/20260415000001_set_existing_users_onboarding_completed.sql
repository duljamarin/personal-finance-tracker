-- Mark existing users (who already have transactions) as onboarding completed
-- so they skip the new onboarding wizard.
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"onboarding_completed": true}'::jsonb
WHERE id IN (SELECT DISTINCT user_id FROM public.transactions);
