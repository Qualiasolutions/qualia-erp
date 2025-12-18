-- =====================================================
-- MIGRATION: Add Task Assignee
-- Description: Add assignee_id to tasks for assigning tasks to users
-- Author: Qualia Solutions
-- Date: 2025-12-17
-- =====================================================

-- Add assignee_id column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- Add comment
COMMENT ON COLUMN tasks.assignee_id IS 'User assigned to this task';

