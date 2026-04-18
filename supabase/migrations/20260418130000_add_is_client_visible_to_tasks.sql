-- Add is_client_visible flag to tasks so the portal can scope what clients see.
-- Default false: nothing leaks to clients unless explicitly opted-in by an
-- admin/employee. Read by getClientVisibleTasks for role='client'.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN NOT NULL DEFAULT false;

-- Partial index keeps the table small while accelerating the client filter.
CREATE INDEX IF NOT EXISTS tasks_is_client_visible_idx
  ON tasks (is_client_visible)
  WHERE is_client_visible = true;
