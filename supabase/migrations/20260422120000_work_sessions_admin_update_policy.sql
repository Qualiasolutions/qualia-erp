-- H3: Allow admins to update (close) any work_session in their workspace.
-- Fixes: getTeamStatus stale-session auto-close silently rejected by RLS
-- when the calling admin tries to update another user's session.
-- Existing policy "employees_can_update_own_sessions" is unchanged.

CREATE POLICY "admins_can_update_workspace_sessions"
  ON work_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = work_sessions.workspace_id
      AND wm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = work_sessions.workspace_id
      AND wm.profile_id = auth.uid()
    )
  );
