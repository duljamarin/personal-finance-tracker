-- ============================================
-- Promo email send log
-- Records every user who has received a given promo campaign email, so that
-- batch runs never re-send to the same person. The Edge Function looks up this
-- table and only sends to users NOT already present for the campaign.
-- ============================================

CREATE TABLE IF NOT EXISTS public.promo_email_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign    TEXT NOT NULL,
    email       TEXT NOT NULL,
    resend_id   TEXT,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- one row per user per campaign; a re-run cannot insert a duplicate
    UNIQUE (user_id, campaign)
);

CREATE INDEX IF NOT EXISTS idx_promo_email_log_campaign
    ON public.promo_email_log (campaign);

-- RLS: this is an admin/service-only table. Enable RLS with no policies for
-- authenticated/anon (so it is never readable via the Data API by end users);
-- the Edge Function uses the service role key, which bypasses RLS.
ALTER TABLE public.promo_email_log ENABLE ROW LEVEL SECURITY;

-- Data API grants. service_role is what the Edge Function uses.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_email_log TO service_role;
-- No grant to authenticated/anon on purpose: end users must not read the log.
