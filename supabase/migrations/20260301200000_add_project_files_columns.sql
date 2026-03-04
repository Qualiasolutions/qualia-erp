-- Migration: Add visibility control and metadata columns to project_files table
-- Phase 3 Plan 2: Shared Files with Visibility Toggle
-- Created: 2026-03-01

-- Add new columns to project_files table
ALTER TABLE project_files
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES project_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false;

-- Add index for client visibility queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_project_files_client_visible
  ON project_files(project_id, is_client_visible)
  WHERE is_client_visible = true;

-- Add index for phase association
CREATE INDEX IF NOT EXISTS idx_project_files_phase_id
  ON project_files(phase_id)
  WHERE phase_id IS NOT NULL;

-- Verify columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'project_files'
    AND column_name = 'is_client_visible'
  ) THEN
    RAISE EXCEPTION 'Migration failed: is_client_visible column not created';
  END IF;
END $$;
