-- Enable pgvector extension for AI embeddings
create extension if not exists vector;

-- Create custom types
create type user_role as enum ('admin', 'employee');
create type project_status as enum ('Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled');
create type issue_status as enum ('Backlog', 'Todo', 'In Progress', 'Done', 'Canceled');
create type issue_priority as enum ('No Priority', 'Urgent', 'High', 'Medium', 'Low');

-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role user_role default 'employee'::user_role,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create clients table
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  logo_url text,
  website text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create teams table
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  key text not null unique, -- e.g. "ENG", "DES"
  description text,
  icon text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status project_status default 'Active'::project_status,
  client_id uuid references public.clients(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  lead_id uuid references public.profiles(id) on delete set null,
  start_date date,
  target_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create issues table
create table public.issues (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status issue_status default 'Todo'::issue_status,
  priority issue_priority default 'No Priority'::issue_priority,
  project_id uuid references public.projects(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  assignee_id uuid references public.profiles(id) on delete set null,
  creator_id uuid references public.profiles(id) on delete set null,
  parent_id uuid references public.issues(id) on delete set null,
  sort_order float default 0, -- for manual ordering
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create comments table
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  body text not null,
  issue_id uuid references public.issues(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create documents/knowledge base table for AI
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  url text,
  embedding vector(1536), -- OpenAI embedding size
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.teams enable row level security;
alter table public.projects enable row level security;
alter table public.issues enable row level security;
alter table public.comments enable row level security;
alter table public.documents enable row level security;

-- Basic RLS Policies (Allow read/write for authenticated users for now)
-- In a real app, we'd have stricter policies based on team membership/roles
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Authenticated users can view all clients" on public.clients for select to authenticated using (true);
create policy "Authenticated users can insert clients" on public.clients for insert to authenticated with check (true);

create policy "Authenticated users can view all teams" on public.teams for select to authenticated using (true);
create policy "Authenticated users can insert teams" on public.teams for insert to authenticated with check (true);

create policy "Authenticated users can view all projects" on public.projects for select to authenticated using (true);
create policy "Authenticated users can insert projects" on public.projects for insert to authenticated with check (true);
create policy "Authenticated users can update projects" on public.projects for update to authenticated using (true);

create policy "Authenticated users can view all issues" on public.issues for select to authenticated using (true);
create policy "Authenticated users can insert issues" on public.issues for insert to authenticated with check (true);
create policy "Authenticated users can update issues" on public.issues for update to authenticated using (true);

create policy "Authenticated users can view all comments" on public.comments for select to authenticated using (true);
create policy "Authenticated users can insert comments" on public.comments for insert to authenticated with check (true);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
