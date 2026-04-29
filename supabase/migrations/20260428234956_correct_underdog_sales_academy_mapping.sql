-- Correct the framework/ERP mapping for Underdog-Sales-Academy.
--
-- The backing Supabase project is named "Underdog Academy". The ERP canonical
-- project should be "Underdog-Sales-Academy"; legacy report rows may still
-- arrive as USD-Academy / USD-ACVADEMY because of older local framework state.

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
set
  github_repo_url = null,
  status = 'Done'::public.project_status,
  is_building = true,
  is_pre_production = false,
  is_live = false,
  is_finished = true,
  updated_at = now()
where name = 'AI Sales Coach'
  and lower(coalesce(github_repo_url, '')) = lower('https://github.com/QualiaSolutionsCY/USD-Academy');

update public.session_reports sr
set
  erp_project_id = p.id,
  project_name = 'Underdog-Sales-Academy',
  git_remote = coalesce(sr.git_remote, 'https://github.com/QualiaSolutionsCY/USD-Academy')
from public.projects p
where p.name = 'Underdog-Sales-Academy'
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
