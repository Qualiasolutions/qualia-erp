-- Link framework reports to canonical ERP projects.
--
-- The old clock-out gate matched /qualia-report rows back to work sessions by
-- free-text project_name. That fails when the framework repo name differs from
-- the ERP project name, e.g. legacy USD-Academy reports belong to
-- Underdog-Sales-Academy.

alter table public.session_reports
  add column if not exists erp_project_id uuid references public.projects(id) on delete set null;

create index if not exists session_reports_erp_project_submitted_idx
  on public.session_reports(erp_project_id, submitted_at desc)
  where erp_project_id is not null;

comment on column public.session_reports.erp_project_id is
  'Canonical ERP project linked during /api/v1/reports ingest. Prefer this over fuzzy project_name matching for report sync and clock-out gates.';

update public.projects
set
  name = 'Underdog-Sales-Academy',
  github_repo_url = 'https://github.com/QualiaSolutionsCY/USD-Academy',
  status = 'Active'::public.project_status,
  is_building = false,
  is_pre_production = true,
  is_live = false,
  is_finished = false,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'framework_aliases',
    jsonb_build_array(
      'Underdog Academy',
      'Underdog Sales Academy',
      'Underdog-Sales-Academy',
      'USD-Academy',
      'USD Academy',
      'USD-ACVADEMY',
      'USD ACVADEMY'
    ),
    'supabase_project_name',
    'Underdog Academy'
  ),
  updated_at = now()
where name in ('Underdog Sales Academy', 'Underdog-Sales-Academy');

update public.projects
set github_repo_url = null,
    updated_at = now()
where name <> 'Underdog-Sales-Academy'
  and lower(coalesce(github_repo_url, '')) = lower('https://github.com/QualiaSolutionsCY/USD-Academy');

update public.session_reports sr
set
  erp_project_id = p.id,
  project_name = 'Underdog-Sales-Academy',
  git_remote = coalesce(sr.git_remote, 'https://github.com/QualiaSolutionsCY/USD-Academy')
from public.projects p
where p.name = 'Underdog-Sales-Academy'
  and sr.erp_project_id is null
  and (
    lower(sr.project_name) in (
      'usd-academy',
      'usd academy',
      'usd-acvademy',
      'usd acvademy',
      'underdog academy',
      'underdog sales academy',
      'underdog-sales-academy'
    )
    or lower(coalesce(sr.framework_project_id, '')) in (
      'usd-academy',
      'usd academy',
      'usd-acvademy',
      'usd acvademy',
      'underdog academy',
      'underdog sales academy',
      'underdog-sales-academy'
    )
    or lower(coalesce(sr.git_remote, '')) like '%qualiasolutionscy/usd-academy%'
    or lower(coalesce(sr.git_remote, '')) like '%qualiasolutionscy/usd-acvademy%'
  );
