-- Merge project resources into project files as first-class link rows.
-- Files, folder-uploaded files, and links now share the same project_files UI.

alter table public.project_files
  add column if not exists file_kind text not null default 'file'
    check (file_kind in ('file', 'link')),
  add column if not exists link_url text,
  add column if not exists link_type text not null default 'other'
    check (link_type in ('github', 'vercel', 'supabase', 'railway', 'social', 'other'));

create index if not exists project_files_kind_idx
  on public.project_files(project_id, file_kind, created_at desc);

insert into public.project_files (
  project_id,
  workspace_id,
  name,
  original_name,
  storage_path,
  file_size,
  mime_type,
  uploaded_by,
  description,
  is_client_visible,
  is_client_upload,
  file_kind,
  link_url,
  link_type
)
select
  p.id,
  p.workspace_id,
  coalesce(resource->>'label', resource->>'url', 'Project link'),
  coalesce(resource->>'label', resource->>'url', 'Project link'),
  'link:' || p.id::text || ':' || coalesce(resource->>'id', md5(resource::text)),
  0,
  'text/uri-list',
  null,
  resource->>'url',
  true,
  false,
  'link',
  resource->>'url',
  case
    when resource->>'type' in ('github', 'vercel', 'supabase', 'railway', 'social', 'other')
      then resource->>'type'
    else 'other'
  end
from public.projects p
cross join lateral jsonb_array_elements(coalesce(p.metadata->'resources', '[]'::jsonb)) resource
where resource ? 'url'
  and coalesce(resource->>'url', '') <> ''
  and not exists (
    select 1
    from public.project_files pf
    where pf.project_id = p.id
      and pf.file_kind = 'link'
      and pf.link_url = resource->>'url'
  );

drop policy if exists "project_files_delete" on public.project_files;

create policy "project_files_delete"
on public.project_files
for delete to authenticated
using (public.is_admin());

drop policy if exists "Workspace members and assigned employees can delete project files" on storage.objects;
drop policy if exists "Workspace members can delete project files" on storage.objects;

create policy "Admins can delete project files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_admin()
  );
