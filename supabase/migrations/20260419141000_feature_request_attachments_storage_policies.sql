-- Storage policies for feature request attachments
-- Files live under project-files/feature-requests/<client_id>/<request_id>/<filename>
-- Access rules:
--   - The client who owns the request can read/delete their own attachments
--   - Admins/managers can read/delete any
--   - Uploads: any authenticated user (further gated by server action via assertRequestOwnership)

create policy "Feature request attachments: owner/admin read"
  on storage.objects for select
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = 'feature-requests'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('admin', 'manager')
      )
    )
  );

create policy "Feature request attachments: owner/admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = 'feature-requests'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('admin', 'manager')
      )
    )
  );
