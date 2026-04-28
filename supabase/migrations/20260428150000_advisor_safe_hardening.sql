-- Safe Supabase advisor hardening (2026-04-28).
--
-- Two low-risk classes of advisor finding from the 2026-04-28 ops diagnosis:
--
--   1. function_search_path_mutable on `public.api_tokens_scope_is_valid`.
--      The function is pure and references no tables, so pinning
--      search_path = '' is a no-op behaviour-wise but closes the
--      "function search_path mutable" linter warning.
--
--   2. rls_enabled_no_policy on four tables that are written exclusively
--      from the server (service_role bypasses RLS, so this works today —
--      we just make the intent explicit so the linter goes quiet and a
--      future developer can't accidentally grant client access).
--
-- Idempotent: DROP POLICY IF EXISTS guards run before each CREATE POLICY,
-- and ALTER FUNCTION ... SET ... is itself idempotent in Postgres.
-- No destructive changes — the four tables already block anon/authenticated
-- via the default-deny effect of RLS-without-policy. We only document the
-- denial explicitly.

begin;

-- 1) Pin search_path on api_tokens_scope_is_valid.
alter function public.api_tokens_scope_is_valid(text) set search_path = '';

-- 2) Explicit deny-all policies on server-only tables. RESTRICTIVE so they
--    AND with any future PERMISSIVE policy and never silently expose data.

-- idempotency_keys: written by app/api/v1/reports/route.ts via service_role.
do $$
begin
  drop policy if exists "service_role_only_deny_all" on public.idempotency_keys;
  create policy "service_role_only_deny_all"
    on public.idempotency_keys
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);
end $$;

-- session_reports: documented service_role-only in CLAUDE.md.
do $$
begin
  drop policy if exists "service_role_only_deny_all" on public.session_reports;
  create policy "service_role_only_deny_all"
    on public.session_reports
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);
end $$;

-- public_bookings + website_leads: dormant tables (no app references). Lock
-- them down explicitly until/unless an admin re-enables a public form.
do $$
begin
  drop policy if exists "service_role_only_deny_all" on public.public_bookings;
  create policy "service_role_only_deny_all"
    on public.public_bookings
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);
end $$;

do $$
begin
  drop policy if exists "service_role_only_deny_all" on public.website_leads;
  create policy "service_role_only_deny_all"
    on public.website_leads
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);
end $$;

commit;
