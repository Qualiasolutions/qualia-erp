-- Enable Supabase Realtime for owner dashboard notes.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dashboard_notes'
  ) then
    alter publication supabase_realtime add table public.dashboard_notes;
  end if;
end $$;
