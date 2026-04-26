-- Allow space-separated combos of {reports:write, reports:read, mcp:read,
-- mcp:write, admin, *} on api_tokens.scope. The original CHECK only allowed
-- the three legacy values, so the admin Tokens UI couldn't mint MCP tokens.
--
-- Postgres CHECK constraints can't contain subqueries, so we wrap the
-- per-part validation in an IMMUTABLE function and call it from the CHECK.

create or replace function public.api_tokens_scope_is_valid(p_scope text)
returns boolean
language plpgsql
immutable
parallel safe
as $$
declare
  part text;
  allowed text[] := array[
    'reports:write',
    'reports:read',
    'mcp:read',
    'mcp:write',
    'admin',
    '*'
  ];
  parts text[];
begin
  if p_scope is null or length(trim(p_scope)) = 0 then
    return false;
  end if;
  parts := regexp_split_to_array(p_scope, '\s+');
  foreach part in array parts loop
    if length(part) = 0 then
      continue;
    end if;
    if not (part = any (allowed)) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.api_tokens
  drop constraint if exists api_tokens_scope_check;

alter table public.api_tokens
  add constraint api_tokens_scope_check
  check (public.api_tokens_scope_is_valid(scope));
