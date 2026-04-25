CREATE OR REPLACE FUNCTION public.get_per_client_project_stats()
RETURNS TABLE (
  client_id uuid,
  project_count bigint,
  active_count bigint,
  last_activity timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.client_id,
    count(*)::bigint AS project_count,
    count(*) FILTER (WHERE p.status IN ('Active', 'Delayed'))::bigint AS active_count,
    max(p.updated_at) AS last_activity
  FROM public.projects p
  WHERE p.client_id IS NOT NULL
  GROUP BY p.client_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_per_client_project_stats() TO authenticated;
