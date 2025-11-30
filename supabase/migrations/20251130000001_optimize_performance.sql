-- Add indexes for foreign keys to improve join performance

-- Profiles
create index if not exists idx_profiles_role on public.profiles(role);

-- Projects
create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_team_id on public.projects(team_id);
create index if not exists idx_projects_lead_id on public.projects(lead_id);
create index if not exists idx_projects_workspace_id on public.projects(workspace_id);
create index if not exists idx_projects_status on public.projects(status);

-- Issues
create index if not exists idx_issues_project_id on public.issues(project_id);
create index if not exists idx_issues_team_id on public.issues(team_id);
create index if not exists idx_issues_creator_id on public.issues(creator_id);
create index if not exists idx_issues_parent_id on public.issues(parent_id);
create index if not exists idx_issues_workspace_id on public.issues(workspace_id);
create index if not exists idx_issues_status on public.issues(status);

-- Comments
create index if not exists idx_comments_issue_id on public.comments(issue_id);
create index if not exists idx_comments_user_id on public.comments(user_id);

-- Meetings
create index if not exists idx_meetings_project_id on public.meetings(project_id);
create index if not exists idx_meetings_created_by on public.meetings(created_by);
create index if not exists idx_meetings_workspace_id on public.meetings(workspace_id);

-- Teams
create index if not exists idx_teams_workspace_id on public.teams(workspace_id);

-- Activities
create index if not exists idx_activities_workspace_id on public.activities(workspace_id);
create index if not exists idx_activities_actor_id on public.activities(actor_id);
create index if not exists idx_activities_project_id on public.activities(project_id);

-- Create a helper function to get project stats efficiently
create or replace function get_project_stats(p_workspace_id uuid)
returns table (
  id uuid,
  name text,
  status project_status,
  target_date date,
  lead_id uuid,
  lead_full_name text,
  lead_email text,
  total_issues bigint,
  done_issues bigint
) as $$
begin
  return query
  select
    p.id,
    p.name,
    p.status,
    p.target_date,
    pr.id as lead_id,
    pr.full_name as lead_full_name,
    pr.email as lead_email,
    count(i.id) as total_issues,
    count(case when i.status = 'Done' then 1 end) as done_issues
  from
    public.projects p
    left join public.profiles pr on p.lead_id = pr.id
    left join public.issues i on p.id = i.project_id
  where
    (p_workspace_id is null or p.workspace_id = p_workspace_id)
  group by
    p.id, p.name, p.status, p.target_date, pr.id, pr.full_name, pr.email
  order by
    p.created_at desc;
end;
$$ language plpgsql security definer set search_path = public;
