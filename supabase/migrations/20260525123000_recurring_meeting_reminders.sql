-- Recurring meeting rules + external attendees + reminder delivery log.
-- Occurrences are materialized into public.meetings so the existing calendar
-- and meeting detail UI continue to read the same source of truth.

alter table public.meetings
  add column if not exists recurrence_rule_id uuid,
  add column if not exists recurrence_occurrence_date date,
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_html_link text;

create table if not exists public.meeting_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0 and duration_minutes <= 1440),
  timezone text not null default 'Europe/Nicosia',
  starts_on date not null default current_date,
  ends_on date,
  created_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_recurrence_rule_attendees (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.meeting_recurrence_rules(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (rule_id, profile_id)
);

create table if not exists public.meeting_recurrence_rule_external_attendees (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.meeting_recurrence_rules(id) on delete cascade,
  name text,
  email text not null,
  created_at timestamptz not null default now(),
  unique (rule_id, email)
);

create table if not exists public.meeting_external_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  name text,
  email text not null,
  created_at timestamptz not null default now(),
  unique (meeting_id, email)
);

create table if not exists public.meeting_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  reminder_offset_minutes integer not null default 120,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (meeting_id, recipient_email, reminder_offset_minutes)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meetings_recurrence_rule_id_fkey'
  ) then
    alter table public.meetings
      add constraint meetings_recurrence_rule_id_fkey
      foreign key (recurrence_rule_id)
      references public.meeting_recurrence_rules(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists meetings_recurrence_occurrence_uniq
  on public.meetings (recurrence_rule_id, recurrence_occurrence_date)
  where recurrence_rule_id is not null and recurrence_occurrence_date is not null;

create index if not exists meeting_recurrence_rules_active_idx
  on public.meeting_recurrence_rules (workspace_id, is_active, day_of_week, starts_on);

create index if not exists meeting_external_attendees_meeting_idx
  on public.meeting_external_attendees (meeting_id);

create index if not exists meeting_reminder_deliveries_pending_idx
  on public.meeting_reminder_deliveries (meeting_id, status, reminder_offset_minutes);

alter table public.meeting_recurrence_rules enable row level security;
alter table public.meeting_recurrence_rule_attendees enable row level security;
alter table public.meeting_recurrence_rule_external_attendees enable row level security;
alter table public.meeting_external_attendees enable row level security;
alter table public.meeting_reminder_deliveries enable row level security;

create policy "Authenticated users can view recurrence rules"
  on public.meeting_recurrence_rules for select to authenticated using (true);
create policy "Authenticated users can manage recurrence rules"
  on public.meeting_recurrence_rules for all to authenticated using (true) with check (true);

create policy "Authenticated users can view recurrence rule attendees"
  on public.meeting_recurrence_rule_attendees for select to authenticated using (true);
create policy "Authenticated users can manage recurrence rule attendees"
  on public.meeting_recurrence_rule_attendees for all to authenticated using (true) with check (true);

create policy "Authenticated users can view recurrence external attendees"
  on public.meeting_recurrence_rule_external_attendees for select to authenticated using (true);
create policy "Authenticated users can manage recurrence external attendees"
  on public.meeting_recurrence_rule_external_attendees for all to authenticated using (true) with check (true);

create policy "Authenticated users can view meeting external attendees"
  on public.meeting_external_attendees for select to authenticated using (true);
create policy "Authenticated users can manage meeting external attendees"
  on public.meeting_external_attendees for all to authenticated using (true) with check (true);

create policy "Authenticated users can view meeting reminder deliveries"
  on public.meeting_reminder_deliveries for select to authenticated using (true);
create policy "Authenticated users can manage meeting reminder deliveries"
  on public.meeting_reminder_deliveries for all to authenticated using (true) with check (true);
