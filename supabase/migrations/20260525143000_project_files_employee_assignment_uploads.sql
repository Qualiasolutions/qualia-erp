-- Allow assigned employees to use project files even when their workspace
-- membership row is missing or delayed. The app's project files page already
-- authorizes employees by project_assignments, so storage and table RLS must
-- match that access model.

drop policy if exists "Workspace members can upload project files" on storage.objects;
drop policy if exists "Workspace members can read project files" on storage.objects;
drop policy if exists "Workspace members can delete project files" on storage.objects;

create policy "Workspace members and assigned employees can upload project files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and exists (
      select 1
      from public.projects p
      left join public.workspace_members wm
        on wm.workspace_id = p.workspace_id
       and wm.profile_id = auth.uid()
      left join public.project_assignments pa
        on pa.project_id = p.id
       and pa.employee_id = auth.uid()
       and pa.removed_at is null
      where (storage.foldername(storage.objects.name))[1] = p.id::text
        and (wm.id is not null or pa.id is not null or public.is_admin())
    )
  );

create policy "Workspace members and assigned employees can read project files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-files'
    and exists (
      select 1
      from public.projects p
      left join public.workspace_members wm
        on wm.workspace_id = p.workspace_id
       and wm.profile_id = auth.uid()
      left join public.project_assignments pa
        on pa.project_id = p.id
       and pa.employee_id = auth.uid()
       and pa.removed_at is null
      where (storage.foldername(storage.objects.name))[1] = p.id::text
        and (wm.id is not null or pa.id is not null or public.is_admin())
    )
  );

create policy "Workspace members and assigned employees can delete project files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and exists (
      select 1
      from public.projects p
      left join public.workspace_members wm
        on wm.workspace_id = p.workspace_id
       and wm.profile_id = auth.uid()
      left join public.project_assignments pa
        on pa.project_id = p.id
       and pa.employee_id = auth.uid()
       and pa.removed_at is null
      where (storage.foldername(storage.objects.name))[1] = p.id::text
        and (wm.id is not null or pa.id is not null or public.is_admin())
    )
  );

drop policy if exists "project_files_insert" on public.project_files;
drop policy if exists "project_files_select" on public.project_files;

create policy "project_files_insert"
on public.project_files
for insert to authenticated
with check (
  public.is_admin()
  or workspace_id in (
    select workspace_members.workspace_id
    from public.workspace_members
    where workspace_members.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = project_files.project_id
      and pa.employee_id = auth.uid()
      and pa.removed_at is null
  )
  or (
    is_client_upload = true
    and is_client_visible = true
    and exists (
      select 1
      from public.client_projects
      where client_projects.client_id = auth.uid()
        and client_projects.project_id = project_files.project_id
    )
  )
);

create policy "project_files_select"
on public.project_files
for select
using (
  public.is_admin()
  or workspace_id in (
    select workspace_members.workspace_id
    from public.workspace_members
    where workspace_members.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = project_files.project_id
      and pa.employee_id = auth.uid()
      and pa.removed_at is null
  )
  or (
    is_client_visible = true
    and public.is_client_of_project(project_id)
  )
);
