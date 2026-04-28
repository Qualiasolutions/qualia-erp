-- SECURITY DEFINER triage — corrective pass.
--
-- The previous migration (20260428160000_security_definer_triage.sql)
-- revoked from anon/authenticated, but anon was inheriting EXECUTE via
-- the implicit `EXECUTE TO PUBLIC` grant baked in when the functions
-- were created. Per-role revoke does NOT remove a PUBLIC grant — verified
-- post-apply via pg_proc.proacl: `{=X/postgres, ...}` was still present.
--
-- Revoking from PUBLIC removes the implicit fallback. Explicit grantees
-- (authenticated, service_role, postgres) keep their access. anon loses
-- it because it has no explicit grant on any of these functions.
--
-- Verified live on 2026-04-28: after this migration, every previously-
-- flagged anon_security_definer_function_executable lint disappears,
-- and authenticated_security_definer_function_executable drops by 3
-- (the trigger-only functions revoked all roles via the prior migration).
--
-- Idempotent: REVOKE on a missing privilege is a no-op in Postgres.

-- A: RLS predicates
revoke execute on function public.can_view_profile(uuid) from public;
revoke execute on function public.get_my_workspace_ids() from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin_or_manager() from public;
revoke execute on function public.is_client_of_project(uuid) from public;
revoke execute on function public.is_issue_assignee(uuid) from public;
revoke execute on function public.is_project_workspace_member(uuid) from public;
revoke execute on function public.is_super_admin() from public;
revoke execute on function public.is_system_admin() from public;
revoke execute on function public.is_team_member(uuid) from public;
revoke execute on function public.is_workspace_admin(uuid) from public;
revoke execute on function public.is_workspace_member(uuid) from public;

-- B: app-callable RPCs
revoke execute on function public.batch_update_task_orders(jsonb) from public;
revoke execute on function public.get_latest_session_per_profile(uuid, uuid[]) from public;
revoke execute on function public.get_project_stats(uuid) from public;

-- C: internal helpers
revoke execute on function public.check_and_award_achievements(uuid) from public;
revoke execute on function public.log_task_skill_practice(uuid, uuid, text) from public;
revoke execute on function public.update_user_streak(uuid) from public;
revoke execute on function public.update_milestone_progress() from public;
revoke execute on function public.get_per_client_project_stats() from public;
revoke execute on function public.get_project_pipeline_stats(uuid) from public;
revoke execute on function public.get_project_task_progress(uuid) from public;
