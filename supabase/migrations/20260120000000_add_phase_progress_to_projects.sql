-- Add phase_progress column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS phase_progress JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN projects.phase_progress IS 'Stores the progress of project phases (checked items). Structure: { "Phase Name": [0, 1, 3], ... }';
