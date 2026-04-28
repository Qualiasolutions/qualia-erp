-- SECURITY DEFINER triage (2026-04-28).
--
-- The Supabase advisor flagged 26 SECURITY DEFINER functions in `public` as
-- callable by `anon` and/or `authenticated` via PostgREST. Most don't need
-- to be — anon should never reach internal helpers, and trigger-only
-- functions shouldn't be RPC-callable at all.
--
-- This migration is the SAFE first pass: it only REVOKEs grants, never
-- changes function bodies, owners, or SECURITY mode. Each REVOKE is
-- idempotent (Postgres tolerates revoking a privilege that isn't held).
--
-- Classification (verified per-function on 2026-04-28):
--
--   A) RLS PREDICATES — called from RLS policies on public tables. Must
--      keep authenticated EXECUTE; never need anon (anon has no auth.uid()
--      so they all fail-safe to false anyway, but the linter flags any
--      anon-callable SECURITY DEFINER function).
--
--   B) APP-CALLABLE RPCs — confirmed `.rpc('name')` call site in repo
--      under app/lib/components. Keep authenticated, revoke anon.
--
--   C) INTERNAL HELPERS — no .rpc() caller in repo, not attached to a
--      trigger; possibly invoked by other SECURITY DEFINER functions or
--      reserved for future use. Revoke anon. Keep authenticated as a
--      conservative default — if a later audit confirms zero authenticated
--      callers, revoke that too.
--
--   D) TRIGGER-ONLY — attached to a pg_trigger row, never invoked via RPC.
--      Revoke from anon, authenticated, AND public. The trigger itself
--      runs with the table-owner's privileges; SECURITY DEFINER on the
--      function body is what matters there.
--
--   *) custom_access_token_hook — already service_role-only, untouched.

begin;

-- ===== Category A — RLS predicates (revoke anon only) =====
revoke execute on function public.can_view_profile(uuid) from anon;
revoke execute on function public.get_my_workspace_ids() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin_or_manager() from anon;
revoke execute on function public.is_client_of_project(uuid) from anon;
revoke execute on function public.is_issue_assignee(uuid) from anon;
revoke execute on function public.is_project_workspace_member(uuid) from anon;
revoke execute on function public.is_super_admin() from anon;
revoke execute on function public.is_system_admin() from anon;
revoke execute on function public.is_team_member(uuid) from anon;
revoke execute on function public.is_workspace_admin(uuid) from anon;
revoke execute on function public.is_workspace_member(uuid) from anon;

-- ===== Category B — App-callable RPCs (revoke anon only) =====
-- batch_update_task_orders: app/actions/inbox.ts:1186
revoke execute on function public.batch_update_task_orders(jsonb) from anon;
-- get_latest_session_per_profile: app/actions/work-sessions.ts:709
revoke execute on function public.get_latest_session_per_profile(uuid, uuid[]) from anon;
-- get_project_stats: enumerated by .rpc() audit
revoke execute on function public.get_project_stats(uuid) from anon;

-- ===== Category C — Internal helpers (revoke anon, keep authenticated) =====
-- These have no .rpc() caller in app code today but are reachable via PostgREST.
-- Revoking anon closes the public surface; authenticated remains in case a
-- trigger or other DEFINER function indirectly grants access.
revoke execute on function public.check_and_award_achievements(uuid) from anon;
revoke execute on function public.log_task_skill_practice(uuid, uuid, text) from anon;
revoke execute on function public.update_user_streak(uuid) from anon;
revoke execute on function public.update_milestone_progress() from anon;
revoke execute on function public.get_per_client_project_stats() from anon;
revoke execute on function public.get_project_pipeline_stats(uuid) from anon;
revoke execute on function public.get_project_task_progress(uuid) from anon;

-- ===== Category D — Trigger-only (revoke from anon, authenticated, public) =====
-- handle_new_user — fires on auth.users INSERT (trigger on_auth_user_created).
revoke execute on function public.handle_new_user() from anon, authenticated, public;
-- mirror_public_booking_to_meeting — fires on public_bookings BEFORE INSERT.
revoke execute on function public.mirror_public_booking_to_meeting() from anon, authenticated, public;
-- update_milestone_progress_on_issue_update — fires on issues AFTER UPDATE.
revoke execute on function public.update_milestone_progress_on_issue_update() from anon, authenticated, public;

commit;

-- Follow-up audit: after this lands, the advisor lint
-- `anon_security_definer_function_executable` should drop from ~25 to 0,
-- and `authenticated_security_definer_function_executable` should drop by 3
-- (the trigger-only functions). The remaining ~22 authenticated entries are
-- intentional — RLS predicates, app RPCs, and the conservative-keep helpers
-- — and need a per-function authenticated review (next pass).
