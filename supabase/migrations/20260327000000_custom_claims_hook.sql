-- Custom Access Token Hook
-- Injects user_role into JWT claims so middleware can read role without a DB query.
-- After running this migration, enable the hook in Supabase Dashboard:
--   Authentication -> Hooks -> Custom Access Token -> select custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_role TEXT;
  claims    jsonb;
BEGIN
  -- user_id arrives as TEXT in the event payload
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  -- Default to 'employee' if no profile found
  IF user_role IS NULL THEN
    user_role := 'employee';
  END IF;

  -- Inject role into token claims
  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  event  := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Allow Supabase auth internals to call the function and read profiles
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- Revoke from everyone else — auth hook only, not a public API
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
