-- =====================================================
-- MIGRATION: Replace Milestones with Project Phases
-- =====================================================
-- This migration removes the milestone system and adds
-- a new project phases/roadmap system with sub-tasks
-- for vibe coding workflows
-- =====================================================

-- 1. Drop milestone-related tables (cascade handles junction table)
DROP TABLE IF EXISTS milestone_issues CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;

-- 2. Create project_phases table
CREATE TABLE public.project_phases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,

  -- Phase info
  name text NOT NULL,
  description text,
  helper_text text,  -- Professional guidance sentence
  display_order integer NOT NULL DEFAULT 0,

  -- Status tracking
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),

  -- Template tracking
  template_key text,  -- e.g., 'ai_agent_research', 'web_discovery'
  is_custom boolean DEFAULT false,  -- User-created vs template

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Create phase_items table (checklist items within phases)
CREATE TABLE public.phase_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE CASCADE NOT NULL,

  -- Item content
  title text NOT NULL,
  description text,
  helper_text text,  -- Guidance for this specific task
  display_order integer NOT NULL DEFAULT 0,

  -- Completion state
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Optional issue link for deeper tracking
  linked_issue_id uuid REFERENCES public.issues(id) ON DELETE SET NULL,

  -- Template tracking
  template_key text,  -- e.g., 'define_agent_purpose'
  is_custom boolean DEFAULT false,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Enable Row Level Security
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_items ENABLE ROW LEVEL SECURITY;

-- 5. Create indexes for performance
CREATE INDEX idx_phases_project_id ON project_phases(project_id);
CREATE INDEX idx_phases_workspace_id ON project_phases(workspace_id);
CREATE INDEX idx_phases_display_order ON project_phases(project_id, display_order);
CREATE INDEX idx_phases_created_by ON project_phases(created_by);

CREATE INDEX idx_phase_items_phase_id ON phase_items(phase_id);
CREATE INDEX idx_phase_items_linked_issue ON phase_items(linked_issue_id);
CREATE INDEX idx_phase_items_display_order ON phase_items(phase_id, display_order);
CREATE INDEX idx_phase_items_completed_by ON phase_items(completed_by);

-- 6. RLS Policies for project_phases

-- View: workspace members can view
CREATE POLICY "Users can view phases in their workspace" ON project_phases
FOR SELECT TO authenticated
USING (
  is_admin() OR
  is_workspace_member(workspace_id)
);

-- Insert: workspace members can create
CREATE POLICY "Users can create phases in their workspace" ON project_phases
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR
  is_workspace_member(workspace_id)
);

-- Update: workspace members can update
CREATE POLICY "Users can update phases in their workspace" ON project_phases
FOR UPDATE TO authenticated
USING (
  is_admin() OR
  is_workspace_member(workspace_id)
);

-- Delete: admins or creator can delete
CREATE POLICY "Admins or creators can delete phases" ON project_phases
FOR DELETE TO authenticated
USING (
  is_admin() OR
  created_by = (SELECT auth.uid())
);

-- 7. RLS Policies for phase_items

-- View: anyone who can view the phase can view items
CREATE POLICY "Users can view phase items" ON phase_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_phases
    WHERE project_phases.id = phase_items.phase_id
    AND (is_admin() OR is_workspace_member(project_phases.workspace_id))
  )
);

-- Insert: anyone who can view the phase can add items
CREATE POLICY "Users can create phase items" ON phase_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_phases
    WHERE project_phases.id = phase_id
    AND (is_admin() OR is_workspace_member(project_phases.workspace_id))
  )
);

-- Update: workspace members can update items
CREATE POLICY "Users can update phase items" ON phase_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_phases
    WHERE project_phases.id = phase_items.phase_id
    AND (is_admin() OR is_workspace_member(project_phases.workspace_id))
  )
);

-- Delete: admins or phase creator can delete items
CREATE POLICY "Admins or phase creators can delete items" ON phase_items
FOR DELETE TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM project_phases
    WHERE project_phases.id = phase_items.phase_id
    AND project_phases.created_by = (SELECT auth.uid())
  )
);

-- 8. Helper function: Calculate phase progress (percentage of completed items)
CREATE OR REPLACE FUNCTION calculate_phase_progress(p_phase_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE is_completed = true)::numeric /
         NULLIF(COUNT(*)::numeric, 0)) * 100
      )::integer
      FROM phase_items
      WHERE phase_id = p_phase_id
    ),
    0
  );
$$;

-- 9. Helper function: Calculate overall project roadmap progress
CREATE OR REPLACE FUNCTION calculate_roadmap_progress(p_project_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE is_completed = true)::numeric /
         NULLIF(COUNT(*)::numeric, 0)) * 100
      )::integer
      FROM phase_items pi
      JOIN project_phases pp ON pp.id = pi.phase_id
      WHERE pp.project_id = p_project_id
    ),
    0
  );
$$;

-- 10. Add updated_at trigger for project_phases
CREATE OR REPLACE FUNCTION update_phase_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_phase_updated_at
  BEFORE UPDATE ON project_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_updated_at();

-- 11. Add updated_at trigger for phase_items
CREATE TRIGGER set_phase_item_updated_at
  BEFORE UPDATE ON phase_items
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_updated_at();
