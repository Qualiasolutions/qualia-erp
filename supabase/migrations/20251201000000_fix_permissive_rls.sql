-- Fix overly permissive RLS policies for meetings, meeting_attendees, issue_assignees, and documents
-- These tables previously allowed any authenticated user full access to any record

-- =====================
-- HELPER FUNCTION: Check workspace membership
-- =====================
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
    AND profile_id = (SELECT auth.uid())
  );
$$;

-- =====================
-- MEETINGS POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view all meetings" ON meetings;
DROP POLICY IF EXISTS "Authenticated users can insert meetings" ON meetings;
DROP POLICY IF EXISTS "Authenticated users can update meetings" ON meetings;
DROP POLICY IF EXISTS "Authenticated users can delete meetings" ON meetings;

-- Users can view meetings in their workspace
CREATE POLICY "Users can view meetings in workspace" ON meetings
FOR SELECT TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Users can create meetings in their workspace
CREATE POLICY "Users can create meetings in workspace" ON meetings
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Users can update their own meetings or admins can update any
CREATE POLICY "Users can update own meetings" ON meetings
FOR UPDATE TO authenticated
USING (
  is_admin() OR
  created_by = (SELECT auth.uid())
);

-- Users can delete their own meetings or admins can delete any
CREATE POLICY "Users can delete own meetings" ON meetings
FOR DELETE TO authenticated
USING (
  is_admin() OR
  created_by = (SELECT auth.uid())
);

-- =====================
-- MEETING_ATTENDEES POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view meeting attendees" ON meeting_attendees;
DROP POLICY IF EXISTS "Authenticated users can insert meeting attendees" ON meeting_attendees;
DROP POLICY IF EXISTS "Authenticated users can update meeting attendees" ON meeting_attendees;
DROP POLICY IF EXISTS "Authenticated users can delete meeting attendees" ON meeting_attendees;

-- Users can view attendees for meetings in their workspace
CREATE POLICY "Users can view meeting attendees in workspace" ON meeting_attendees
FOR SELECT TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_attendees.meeting_id
    AND (
      meetings.created_by = (SELECT auth.uid()) OR
      (meetings.workspace_id IS NOT NULL AND is_workspace_member(meetings.workspace_id))
    )
  )
);

-- Meeting creators and admins can add attendees
CREATE POLICY "Meeting creators can add attendees" ON meeting_attendees
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_id
    AND meetings.created_by = (SELECT auth.uid())
  )
);

-- Attendees can update their own status, meeting creators can update any
CREATE POLICY "Users can update meeting attendance" ON meeting_attendees
FOR UPDATE TO authenticated
USING (
  is_admin() OR
  profile_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_attendees.meeting_id
    AND meetings.created_by = (SELECT auth.uid())
  )
);

-- Meeting creators and admins can remove attendees
CREATE POLICY "Meeting creators can remove attendees" ON meeting_attendees
FOR DELETE TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_attendees.meeting_id
    AND meetings.created_by = (SELECT auth.uid())
  )
);

-- =====================
-- ISSUE_ASSIGNEES POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view issue assignees" ON issue_assignees;
DROP POLICY IF EXISTS "Authenticated users can insert issue assignees" ON issue_assignees;
DROP POLICY IF EXISTS "Authenticated users can update issue assignees" ON issue_assignees;
DROP POLICY IF EXISTS "Authenticated users can delete issue assignees" ON issue_assignees;

-- Users can view assignees for issues they can access
CREATE POLICY "Users can view issue assignees" ON issue_assignees
FOR SELECT TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM issues
    WHERE issues.id = issue_assignees.issue_id
    AND (
      issues.creator_id = (SELECT auth.uid()) OR
      (issues.workspace_id IS NOT NULL AND is_workspace_member(issues.workspace_id)) OR
      (issues.team_id IS NOT NULL AND is_team_member(issues.team_id))
    )
  )
);

-- Issue creators, team members, and admins can add assignees
CREATE POLICY "Users can add issue assignees" ON issue_assignees
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM issues
    WHERE issues.id = issue_id
    AND (
      issues.creator_id = (SELECT auth.uid()) OR
      (issues.team_id IS NOT NULL AND is_team_member(issues.team_id))
    )
  )
);

-- Issue creators, team members, and admins can update assignees
CREATE POLICY "Users can update issue assignees" ON issue_assignees
FOR UPDATE TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM issues
    WHERE issues.id = issue_assignees.issue_id
    AND (
      issues.creator_id = (SELECT auth.uid()) OR
      (issues.team_id IS NOT NULL AND is_team_member(issues.team_id))
    )
  )
);

-- Issue creators, team members, and admins can remove assignees
CREATE POLICY "Users can remove issue assignees" ON issue_assignees
FOR DELETE TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM issues
    WHERE issues.id = issue_assignees.issue_id
    AND (
      issues.creator_id = (SELECT auth.uid()) OR
      (issues.team_id IS NOT NULL AND is_team_member(issues.team_id))
    )
  )
);

-- =====================
-- DOCUMENTS POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON documents;

-- Users can view documents in their workspace
CREATE POLICY "Users can view documents in workspace" ON documents
FOR SELECT TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Users can create documents in their workspace
CREATE POLICY "Users can create documents in workspace" ON documents
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Only admins can update documents (knowledge base should be curated)
CREATE POLICY "Admins can update documents" ON documents
FOR UPDATE TO authenticated
USING (is_admin());

-- Only admins can delete documents
CREATE POLICY "Admins can delete documents" ON documents
FOR DELETE TO authenticated
USING (is_admin());

-- =====================
-- Add missing indexes for foreign keys (performance)
-- =====================
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_start ON meetings(workspace_id, start_time);
CREATE INDEX IF NOT EXISTS idx_activities_comment_id ON activities(comment_id);
CREATE INDEX IF NOT EXISTS idx_activities_issue_id ON activities(issue_id);
CREATE INDEX IF NOT EXISTS idx_milestones_created_by ON milestones(created_by);
