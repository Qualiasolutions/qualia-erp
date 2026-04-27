-- Multi-option clock-in: store the activities the employee selected at clock-in.
-- Examples: 'Daily Blog', 'Daily Research', 'Project Work', 'Client Meetings',
-- 'Code Review', 'Bug Fixes', 'Admin / Email', 'Other'.
-- Stored as a text[] so we don't need a join to render the chips on session
-- detail / today views, and so the values can drift independently of any
-- enum / lookup table.
alter table public.work_sessions
  add column if not exists clock_in_activities text[];

comment on column public.work_sessions.clock_in_activities is
  'Multi-select list of activities the employee chose at clock-in. Free-form text — keep the canonical labels in sync with components/today-dashboard/clock-in-modal.tsx.';
