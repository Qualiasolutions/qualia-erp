ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS internal_onboarding_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.internal_onboarding_version IS
'Current internal onboarding walkthrough version completed by the user. Used to show the suite walkthrough once per account.';

COMMENT ON COLUMN public.profiles.internal_onboarding_completed_at IS
'Timestamp when the current internal onboarding walkthrough was completed or dismissed.';
