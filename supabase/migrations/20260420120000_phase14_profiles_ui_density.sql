-- Phase 14 — UI remake foundation
-- Add per-user density preference to profiles. Matches the [data-density]
-- attribute on <html> read by client-side DensityProvider.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_density text NOT NULL DEFAULT 'default'
    CHECK (ui_density IN ('compact', 'default', 'spacious'));

COMMENT ON COLUMN public.profiles.ui_density IS
  'User preference for UI density: compact (36px row) / default (44px) / spacious (56px). Applied via <html data-density> attr on client. Phase 14 design remake.';
