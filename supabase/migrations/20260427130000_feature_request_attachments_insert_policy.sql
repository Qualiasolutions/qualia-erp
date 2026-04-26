-- Storage: allow clients to upload feature-request attachments to their own folder.
-- Matches the existing SELECT/DELETE policies. Path layout:
--   feature-requests/<auth.uid()>/<request_id>/<filename>
-- Without this INSERT policy, clients hit RLS and uploadRequestAttachment
-- returns "Failed to upload file".

CREATE POLICY "Feature request attachments: owner/admin upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = 'feature-requests'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  )
);
