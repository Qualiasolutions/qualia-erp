-- Migration: Add phase_resources and project_notes tables
-- For unified project page with per-phase resources and project-scoped notes

-- ============================================================================
-- PHASE RESOURCES TABLE
-- Resources/links attached to specific project phases
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phase_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,

  -- Resource info
  title text NOT NULL,
  url text,
  description text,
  resource_type text DEFAULT 'link' CHECK (resource_type IN ('link', 'document', 'figma', 'notion', 'github', 'other')),

  -- Ordering
  display_order integer NOT NULL DEFAULT 0,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for phase_resources
CREATE INDEX idx_phase_resources_phase_id ON public.phase_resources(phase_id);
CREATE INDEX idx_phase_resources_order ON public.phase_resources(phase_id, display_order);

-- RLS for phase_resources
ALTER TABLE public.phase_resources ENABLE ROW LEVEL SECURITY;

-- View: workspace members can view resources for phases in their workspace
CREATE POLICY "View phase resources" ON public.phase_resources
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.id = phase_resources.phase_id
    AND (is_admin() OR is_workspace_member(p.workspace_id))
  )
);

-- Insert: workspace members can add resources
CREATE POLICY "Insert phase resources" ON public.phase_resources
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.id = phase_resources.phase_id
    AND (is_admin() OR is_workspace_member(p.workspace_id))
  )
);

-- Update: creator or admin can update
CREATE POLICY "Update phase resources" ON public.phase_resources
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() OR is_admin() OR
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.id = phase_resources.phase_id
    AND is_workspace_member(p.workspace_id)
  )
);

-- Delete: creator or admin can delete
CREATE POLICY "Delete phase resources" ON public.phase_resources
FOR DELETE TO authenticated
USING (
  created_by = auth.uid() OR is_admin() OR
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.id = phase_resources.phase_id
    AND is_workspace_member(p.workspace_id)
  )
);

-- ============================================================================
-- PROJECT NOTES TABLE
-- Project-scoped notes (different from workspace_notes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Note content
  content text NOT NULL,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for project_notes
CREATE INDEX idx_project_notes_project_id ON public.project_notes(project_id);
CREATE INDEX idx_project_notes_workspace_id ON public.project_notes(workspace_id);
CREATE INDEX idx_project_notes_created_at ON public.project_notes(project_id, created_at DESC);

-- RLS for project_notes
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- View: workspace members can view notes
CREATE POLICY "View project notes" ON public.project_notes
FOR SELECT TO authenticated
USING (is_admin() OR is_workspace_member(workspace_id));

-- Insert: workspace members can add notes
CREATE POLICY "Insert project notes" ON public.project_notes
FOR INSERT TO authenticated
WITH CHECK (is_admin() OR is_workspace_member(workspace_id));

-- Update: owner or admin can update
CREATE POLICY "Update project notes" ON public.project_notes
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_admin());

-- Delete: owner or admin can delete
CREATE POLICY "Delete project notes" ON public.project_notes
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR is_admin());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_project_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_notes_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_notes TO authenticated;
