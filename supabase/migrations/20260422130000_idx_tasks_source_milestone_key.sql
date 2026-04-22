-- H4: Add partial index on tasks.source_milestone_key for auto-assign queries.
-- The auto-assign engine (auto-assign.ts) queries this column via .in() and .eq()
-- on every project assignment and milestone completion. Without this index,
-- those queries do a sequential scan on the full tasks table.
-- Partial index excludes NULLs since only auto-assigned tasks have this column set.

CREATE INDEX IF NOT EXISTS idx_tasks_source_milestone_key
  ON tasks(source_milestone_key)
  WHERE source_milestone_key IS NOT NULL;
