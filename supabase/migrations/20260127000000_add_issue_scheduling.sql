
-- Add scheduling fields to issues table
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS scheduled_start_time timestamptz,
ADD COLUMN IF NOT EXISTS scheduled_end_time timestamptz;

-- Add index for performance when querying frequent ranges
CREATE INDEX IF NOT EXISTS idx_issues_scheduled_time 
ON public.issues (scheduled_start_time, scheduled_end_time);

-- Allow RLS to see these fields (already covered by existing policies usually, but good to check)
-- Existing policies are:
-- create policy "Authenticated users can view all issues" on public.issues for select to authenticated using (true);
-- create policy "Authenticated users can update issues" on public.issues for update to authenticated using (true);
-- These cover the new columns automatically.
