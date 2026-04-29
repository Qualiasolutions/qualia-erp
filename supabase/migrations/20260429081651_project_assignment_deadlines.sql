-- Add deadline and completion workflow fields to employee project assignments.
--
-- Every active assignment should have its own delivery deadline. Employees can
-- submit the assignment for review before or at the deadline; managers can
-- mark the assignment complete after review.

alter table public.project_assignments
  add column if not exists deadline_date date,
  add column if not exists completion_requested_at timestamptz,
  add column if not exists completion_note text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null;

update public.project_assignments pa
set deadline_date = case
  when p.target_date is not null and p.target_date >= pa.assigned_at::date then p.target_date
  else (pa.assigned_at::date + interval '7 days')::date
end
from public.projects p
where p.id = pa.project_id
  and pa.deadline_date is null;

alter table public.project_assignments
  alter column deadline_date set not null;

alter table public.project_assignments
  add constraint project_assignments_deadline_not_before_assigned
  check (deadline_date >= assigned_at::date) not valid;

alter table public.project_assignments
  validate constraint project_assignments_deadline_not_before_assigned;

create index if not exists idx_project_assignments_employee_deadline
  on public.project_assignments(employee_id, deadline_date)
  where removed_at is null and completed_at is null;

create index if not exists idx_project_assignments_completion_requested
  on public.project_assignments(completion_requested_at)
  where removed_at is null and completed_at is null and completion_requested_at is not null;

comment on column public.project_assignments.deadline_date is
  'Required delivery deadline for this employee/project assignment.';
comment on column public.project_assignments.completion_requested_at is
  'Set when the assigned employee submits the project assignment for manager review.';
comment on column public.project_assignments.completed_at is
  'Set when an admin or manager marks the assignment complete after review.';
