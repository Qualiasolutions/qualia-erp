-- Adds an employee-promised delivery date to project_assignments.
-- Set when the assignee submits the project for review (Submit-for-review
-- dialog requires a date). Distinct from `deadline_date`, which is the
-- admin-set deadline visible only to admins.

ALTER TABLE public.project_assignments
  ADD COLUMN IF NOT EXISTS promised_delivery_date date;

COMMENT ON COLUMN public.project_assignments.promised_delivery_date IS
  'Employee-promised delivery date provided when submitting the project for review. Null until the employee submits.';
