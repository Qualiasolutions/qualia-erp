-- Daily Brief: source-of-truth feed of "what the admin should see today."
--
-- Items are auto-generated each morning (cron) from ERP signals — overdue
-- tasks, today's meetings, stale projects, framework gap cycles, etc. The
-- admin ticks an item to dismiss it; the row is preserved for history. If
-- the underlying source state remains true tomorrow, the generator emits a
-- new row for the new for_date — recurring relevance handled by source
-- truth, not row state.

create table if not exists public.daily_brief_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  for_date date not null,

  source_type text not null check (source_type in (
    'overdue_task',
    'meeting_today',
    'meeting_upcoming',
    'stale_project',
    'overdue_invoice',
    'project_deadline',
    'framework_gap',
    'framework_stale',
    'manual',
    'qualia_memory'
  )),
  source_id text,
  source_metadata jsonb not null default '{}'::jsonb,

  tag text not null,
  lead text,
  body text not null,
  priority smallint not null default 50,

  generated_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismissed_by uuid references public.profiles(id) on delete set null,
  snoozed_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent regeneration: same (owner, day, source) = same row.
-- Manual items are exempt — admins can add as many as they want.
create unique index if not exists daily_brief_items_dedupe_key
  on public.daily_brief_items (owner_id, for_date, source_type, coalesce(source_id, ''))
  where source_type <> 'manual';

create index if not exists daily_brief_items_active_idx
  on public.daily_brief_items (owner_id, for_date desc)
  where dismissed_at is null;

create index if not exists daily_brief_items_history_idx
  on public.daily_brief_items (owner_id, dismissed_at desc)
  where dismissed_at is not null;

create or replace function public.daily_brief_items_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists daily_brief_items_updated_at on public.daily_brief_items;
create trigger daily_brief_items_updated_at
  before update on public.daily_brief_items
  for each row execute function public.daily_brief_items_set_updated_at();

alter table public.daily_brief_items enable row level security;

drop policy if exists "Users see own brief items" on public.daily_brief_items;
create policy "Users see own brief items"
  on public.daily_brief_items for select
  using (owner_id = auth.uid());

drop policy if exists "Users insert own brief items" on public.daily_brief_items;
create policy "Users insert own brief items"
  on public.daily_brief_items for insert
  with check (owner_id = auth.uid());

drop policy if exists "Users update own brief items" on public.daily_brief_items;
create policy "Users update own brief items"
  on public.daily_brief_items for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Users delete own brief items" on public.daily_brief_items;
create policy "Users delete own brief items"
  on public.daily_brief_items for delete
  using (owner_id = auth.uid());

comment on table public.daily_brief_items is
  'Auto-generated daily brief feed. Admins tick to dismiss; history preserved. Regeneration is idempotent on (owner, for_date, source_type, source_id).';
