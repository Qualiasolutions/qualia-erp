-- =====================================================
-- MIGRATION: Add Project Linking to Tasks
-- Description: Allow inbox tasks to be linked to projects and phases
-- Author: Qualia Solutions
-- Date: 2025-12-21
-- =====================================================

-- Add project_id and phase_id columns to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL;

-- Create indexes for project-linked task queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON tasks(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_assignee ON tasks(project_id, assignee_id) WHERE project_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN tasks.project_id IS 'Optional link to a project - task contributes to project progress';
COMMENT ON COLUMN tasks.phase_id IS 'Optional link to a project phase - task appears in roadmap under this phase';

-- Create a function to get project progress including linked tasks
CREATE OR REPLACE FUNCTION get_project_task_progress(p_project_id uuid)
RETURNS TABLE (
  total_tasks bigint,
  completed_tasks bigint,
  progress_percent numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_tasks,
    COUNT(*) FILTER (WHERE status = 'Done')::bigint as completed_tasks,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE status = 'Done')::numeric / COUNT(*)::numeric) * 100, 1)
    END as progress_percent
  FROM tasks
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_project_task_progress(uuid) TO authenticated;
