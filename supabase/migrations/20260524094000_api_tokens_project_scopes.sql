-- Allow Framework project read/write scopes used by work-packet pull and
-- project snapshot upload. Keep the existing space-separated scope model.

CREATE OR REPLACE FUNCTION public.api_tokens_scope_is_valid(p_scope text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  part text;
  allowed text[] := array[
    'reports:write',
    'reports:read',
    'projects:read',
    'projects:write',
    'mcp:read',
    'mcp:write',
    'admin',
    '*'
  ];
  parts text[];
BEGIN
  IF p_scope IS NULL OR length(trim(p_scope)) = 0 THEN
    RETURN false;
  END IF;
  parts := regexp_split_to_array(p_scope, '\s+');
  FOREACH part IN ARRAY parts LOOP
    IF length(part) = 0 THEN
      CONTINUE;
    END IF;
    IF NOT (part = ANY (allowed)) THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

ALTER FUNCTION public.api_tokens_scope_is_valid(text) SET search_path = '';
