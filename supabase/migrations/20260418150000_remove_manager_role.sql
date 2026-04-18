-- Simplify the role model from 4 roles to 3: admin, employee, client.
-- `manager` is removed — in practice it was only used as "admin-lite" and
-- nobody was using it. Any existing manager users are promoted to admin.
--
-- Postgres does not support removing enum values without recreating the type.
-- We keep `manager` in the enum for backwards safety (old rows could still
-- reference it if anything slipped through), but application code treats it
-- as equivalent to admin and new role assignments reject it.

-- Promote any existing managers to admin so no one loses access.
UPDATE profiles SET role = 'admin' WHERE role = 'manager';

-- Update the custom_access_token_hook so JWT claims never emit 'manager'
-- for a user who somehow still has that role at the DB level.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = (event->>'user_id')::uuid;

  -- Normalize any lingering 'manager' → 'admin' at claim time.
  IF user_role = 'manager' THEN
    user_role := 'admin';
  END IF;

  -- Default missing profiles to 'client' (least-privilege).
  IF user_role IS NULL THEN
    user_role := 'client';
  END IF;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
