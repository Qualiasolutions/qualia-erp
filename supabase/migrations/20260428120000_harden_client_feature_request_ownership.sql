-- Harden client feature request ownership.
--
-- The previous policy allowed any client linked to the same project to read,
-- update, or delete another client's request. The app layer already treats
-- requests as owner/admin scoped, so keep the database contract the same.

DROP POLICY IF EXISTS "feature_requests_delete" ON public.client_feature_requests;
DROP POLICY IF EXISTS "feature_requests_insert" ON public.client_feature_requests;
DROP POLICY IF EXISTS "feature_requests_select" ON public.client_feature_requests;
DROP POLICY IF EXISTS "feature_requests_update" ON public.client_feature_requests;

CREATE POLICY "feature_requests_select"
ON public.client_feature_requests
FOR SELECT TO authenticated
USING (
  is_admin()
  OR client_id = (SELECT auth.uid())
);

CREATE POLICY "feature_requests_insert"
ON public.client_feature_requests
FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
  OR client_id = (SELECT auth.uid())
);

CREATE POLICY "feature_requests_update"
ON public.client_feature_requests
FOR UPDATE TO authenticated
USING (
  is_admin()
  OR (
    client_id = (SELECT auth.uid())
    AND status = ANY (ARRAY['pending'::text, 'in_review'::text])
  )
)
WITH CHECK (
  is_admin()
  OR (
    client_id = (SELECT auth.uid())
    AND status = ANY (ARRAY['pending'::text, 'in_review'::text])
  )
);

CREATE POLICY "feature_requests_delete"
ON public.client_feature_requests
FOR DELETE TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS "Feature request attachments: owner/admin upload" ON storage.objects;

CREATE POLICY "Feature request attachments: owner/admin upload"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = 'feature-requests'
  AND (
    (storage.foldername(name))[2] = (SELECT auth.uid())::text
    OR is_admin()
  )
);
