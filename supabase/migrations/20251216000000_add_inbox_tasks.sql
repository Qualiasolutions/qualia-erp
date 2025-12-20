-- =====================================================
-- MIGRATION: Add Inbox Tasks System
-- Description: Workspace-scoped task management for inbox
-- Author: Qualia Solutions
-- Date: 2025-12-16
-- =====================================================

-- Create custom types for tasks
CREATE TYPE task_status AS ENUM ('Todo', 'In Progress', 'Done', 'Canceled');
CREATE TYPE task_priority AS ENUM ('No Priority', 'Urgent', 'High', 'Medium', 'Low');

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status task_status DEFAULT 'Todo'::task_status NOT NULL,
  priority task_priority DEFAULT 'No Priority'::task_priority NOT NULL,
  sort_order float DEFAULT 0 NOT NULL, -- for drag-and-drop ordering
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_sort ON tasks(workspace_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Add updated_at trigger
CREATE TRIGGER set_task_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_updated_at();

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- View: Workspace members can see all tasks in their workspace
CREATE POLICY "Users can view tasks in their workspace" ON tasks
FOR SELECT TO authenticated
USING (
  is_admin() OR
  is_workspace_member(workspace_id)
);

-- Insert: Workspace members can create tasks in their workspace
CREATE POLICY "Users can create tasks in their workspace" ON tasks
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR
  (is_workspace_member(workspace_id) AND creator_id = (SELECT auth.uid()))
);

-- Update: Workspace members can update tasks in their workspace
CREATE POLICY "Users can update tasks in their workspace" ON tasks
FOR UPDATE TO authenticated
USING (
  is_admin() OR
  is_workspace_member(workspace_id)
);

-- Delete: Creators or workspace admins can delete tasks
CREATE POLICY "Users can delete tasks in their workspace" ON tasks
FOR DELETE TO authenticated
USING (
  is_admin() OR
  (is_workspace_member(workspace_id) AND creator_id = (SELECT auth.uid())) OR
  is_workspace_admin(workspace_id)
);

-- Add comment
COMMENT ON TABLE tasks IS 'Workspace-scoped tasks for inbox/personal task management';
COMMENT ON COLUMN tasks.sort_order IS 'Manual ordering for drag-and-drop within status groups';


