-- =====================================================
-- MIGRATION: Add workspace_notes table
-- =====================================================
-- Team notes/announcements for workspace collaboration
-- =====================================================

-- Create workspace_notes table
CREATE TABLE IF NOT EXISTS public.workspace_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_notes_workspace_id ON workspace_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_notes_user_id ON workspace_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_notes_created_at ON workspace_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.workspace_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- View: workspace members can view notes
CREATE POLICY "Users can view notes in their workspace" ON workspace_notes
FOR SELECT TO authenticated
USING (
  is_admin() OR
  is_workspace_member(workspace_id)
);

-- Insert: workspace members can create notes
CREATE POLICY "Users can create notes in their workspace" ON workspace_notes
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR
  (is_workspace_member(workspace_id) AND user_id = (SELECT auth.uid()))
);

-- Update: users can update their own notes
CREATE POLICY "Users can update their own notes" ON workspace_notes
FOR UPDATE TO authenticated
USING (
  is_admin() OR
  (is_workspace_member(workspace_id) AND user_id = (SELECT auth.uid()))
);

-- Delete: users can delete their own notes, admins can delete any
CREATE POLICY "Users can delete their own notes" ON workspace_notes
FOR DELETE TO authenticated
USING (
  is_admin() OR
  (is_workspace_member(workspace_id) AND user_id = (SELECT auth.uid()))
);

-- Add updated_at trigger (reuse existing function if available)
CREATE TRIGGER set_workspace_note_updated_at
  BEFORE UPDATE ON workspace_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_updated_at();

