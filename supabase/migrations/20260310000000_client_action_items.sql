create table if not exists public.client_action_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  action_type text not null default 'general',
  -- action_type values: 'approval', 'upload', 'feedback', 'payment', 'general'
  due_date date,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.client_action_items enable row level security;

-- Clients can read their own action items
create policy "client_read_own_action_items"
  on public.client_action_items for select
  using (client_id = auth.uid());

-- Admins/managers can read all action items
create policy "admin_read_action_items"
  on public.client_action_items for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- Admins/managers can insert/update/delete
create policy "admin_manage_action_items"
  on public.client_action_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- Index for fast client lookups
create index if not exists idx_client_action_items_client_id
  on public.client_action_items(client_id)
  where completed_at is null;
