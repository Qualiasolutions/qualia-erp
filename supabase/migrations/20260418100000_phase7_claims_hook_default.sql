-- Phase 7: change custom_access_token_hook default role from 'employee' to 'client'
-- Rationale: least-privilege. A user without a profiles row should NOT inherit
-- internal employee access. Default to 'client' so missing-profile users land
-- in the client portal view until an admin provisions them.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  user_role TEXT;
  claims    jsonb;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  -- Default to 'client' (least privilege) if no profile found
  IF user_role IS NULL THEN
    user_role := 'client';
  END IF;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  event  := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$function$;
