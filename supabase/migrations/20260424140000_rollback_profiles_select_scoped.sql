-- INCIDENT: migration 20260424130000 replaced the `profiles` SELECT policy with
-- a scoped version that called is_admin() and EXISTS-queried project_assignments.
-- Both of those read profiles internally, which caused infinite recursion in
-- RLS when any authenticated client tried to read a profile row → 500 on every
-- profile fetch → portal didn't load in production.
--
-- Rolled back live via MCP. This migration is the repo record of that rollback
-- so future `supabase db push` runs don't re-introduce the broken policy.
--
-- A recursion-safe tightening (JWT-claim admin check + SECURITY DEFINER helper
-- function that bypasses the project_assignments RLS loop) is tracked as
-- follow-up work in docs/audits/2026-04-24-readiness-audit.md.

DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);
