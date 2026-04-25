CREATE OR REPLACE FUNCTION public.get_latest_session_per_profile(
  p_workspace_id uuid,
  p_profile_ids uuid[]
)
RETURNS TABLE (
  profile_id uuid,
  ended_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ON (ws.profile_id)
    ws.profile_id,
    ws.ended_at
  FROM public.work_sessions ws
  WHERE ws.workspace_id = p_workspace_id
    AND ws.profile_id = ANY(p_profile_ids)
    AND ws.ended_at IS NOT NULL
  ORDER BY ws.profile_id, ws.ended_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_session_per_profile(uuid, uuid[]) TO authenticated;
