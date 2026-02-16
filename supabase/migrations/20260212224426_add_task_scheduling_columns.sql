-- Add scheduling columns to tasks table for daily schedule grid
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS scheduled_start_time timestamptz,
ADD COLUMN IF NOT EXISTS scheduled_end_time timestamptz;

-- Index for efficient querying of scheduled tasks by time range
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_time
ON public.tasks (scheduled_start_time, scheduled_end_time)
WHERE scheduled_start_time IS NOT NULL;
