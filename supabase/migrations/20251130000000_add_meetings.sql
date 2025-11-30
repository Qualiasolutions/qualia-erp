-- Create meetings table
create table public.meetings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.meetings enable row level security;

-- Basic RLS Policies (Allow read/write for authenticated users)
create policy "Authenticated users can view all meetings" on public.meetings for select to authenticated using (true);
create policy "Authenticated users can insert meetings" on public.meetings for insert to authenticated with check (true);
create policy "Authenticated users can update meetings" on public.meetings for update to authenticated using (true);
create policy "Authenticated users can delete meetings" on public.meetings for delete to authenticated using (true);
