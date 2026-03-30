-- Add columns to tasks table for auto-assignment tracking
-- source_phase_item_id: links task back to originating phase item (idempotency key)
-- auto_assign_trigger: records what triggered creation ('assignment' | 'milestone_cascade')

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_phase_item_id uuid REFERENCES phase_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_assign_trigger text;

-- Unique partial index: prevents duplicate tasks for the same phase item
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_source_phase_item_unique
  ON tasks (source_phase_item_id)
  WHERE source_phase_item_id IS NOT NULL;

-- Index for efficient lookups by project + auto-assign status
CREATE INDEX IF NOT EXISTS idx_tasks_auto_assign_project
  ON tasks (project_id, auto_assign_trigger)
  WHERE auto_assign_trigger IS NOT NULL;
