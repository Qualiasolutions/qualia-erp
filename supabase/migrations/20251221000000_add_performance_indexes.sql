-- Performance optimization indexes
-- Generated from comprehensive performance analysis

-- ============================================================
-- 1. MEETINGS: Composite index for workspace + time filtering
-- Used by: getMeetings, dashboard calendar, schedule views
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_start_time
ON meetings(workspace_id, start_time DESC)
WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_workspace_end_time
ON meetings(workspace_id, end_time DESC)
WHERE workspace_id IS NOT NULL;

-- ============================================================
-- 2. ACTIVITIES: Creation time index for activity feed pagination
-- Used by: getRecentActivities, dashboard activity feed
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_activities_workspace_created_desc
ON activities(workspace_id, created_at DESC)
WHERE workspace_id IS NOT NULL;

-- ============================================================
-- 3. ISSUES: Composite index for dashboard filtering
-- Used by: getIssues, issue lists with status/priority filters
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_issues_workspace_status_created
ON issues(workspace_id, status, created_at DESC)
WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issues_workspace_priority
ON issues(workspace_id, priority)
WHERE workspace_id IS NOT NULL;

-- ============================================================
-- 4. CLIENTS: Lead status + workspace combination
-- Used by: getClients, CRM pipeline views
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_workspace_lead_status
ON clients(workspace_id, lead_status)
WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_workspace_created
ON clients(workspace_id, created_at DESC)
WHERE workspace_id IS NOT NULL;

-- ============================================================
-- 5. PROJECTS: Status ordering for project lists
-- Used by: getProjects, project dashboard
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_workspace_status_created
ON projects(workspace_id, status, created_at DESC)
WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_workspace_type
ON projects(workspace_id, project_type)
WHERE workspace_id IS NOT NULL;

-- ============================================================
-- 6. ISSUE_ASSIGNEES: "Assigned to me" queries
-- Used by: My tasks view, assignee filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_issue_assignees_profile_assigned
ON issue_assignees(profile_id, assigned_at DESC);

-- ============================================================
-- 7. MEETING_ATTENDEES: Status filtering for RSVP
-- Used by: Meeting attendance tracking
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_profile_status
ON meeting_attendees(profile_id, status);

-- ============================================================
-- 8. TASKS: Inbox task sorting and filtering
-- Used by: Inbox kanban, task lists
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due_date
ON tasks(workspace_id, due_date)
WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status_order
ON tasks(assignee_id, status, sort_order)
WHERE assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status
ON tasks(workspace_id, status)
WHERE workspace_id IS NOT NULL;

-- ============================================================
-- 9. PHASE_ITEMS: Completion tracking and ordering
-- Used by: Project roadmap, phase progress
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_phase_items_phase_order
ON phase_items(phase_id, display_order);

CREATE INDEX IF NOT EXISTS idx_phase_items_completed
ON phase_items(is_completed, completed_at DESC)
WHERE is_completed = true;

-- ============================================================
-- 10. PROJECT_PHASES: Project roadmap ordering
-- Used by: Roadmap view, phase listing
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_project_phases_project_order
ON project_phases(project_id, display_order);

-- ============================================================
-- 11. DOCUMENTS: Knowledge base search with workspace scope
-- Used by: RAG queries, semantic search
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documents_workspace_created
ON documents(workspace_id, created_at DESC)
WHERE workspace_id IS NOT NULL;

-- ============================================================
-- 12. COMMENTS: Issue comment ordering
-- Used by: Issue detail comments section
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_comments_issue_created
ON comments(issue_id, created_at DESC);

-- ============================================================
-- 13. CLIENT_ACTIVITIES: Activity timeline ordering
-- Used by: Client detail activity log
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_activities_client_created
ON client_activities(client_id, created_at DESC);

-- ============================================================
-- 14. WORKSPACE_MEMBERS: Fast membership lookups for RLS
-- Used by: RLS policies, authorization checks
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_profile_workspace
ON workspace_members(profile_id, workspace_id);

-- Add comment for documentation
COMMENT ON INDEX idx_meetings_workspace_start_time IS 'Performance: Optimizes getMeetings and schedule views';
COMMENT ON INDEX idx_activities_workspace_created_desc IS 'Performance: Optimizes activity feed pagination';
COMMENT ON INDEX idx_issues_workspace_status_created IS 'Performance: Optimizes dashboard issue filtering';
COMMENT ON INDEX idx_clients_workspace_lead_status IS 'Performance: Optimizes CRM pipeline views';
COMMENT ON INDEX idx_projects_workspace_status_created IS 'Performance: Optimizes project list sorting';
COMMENT ON INDEX idx_tasks_workspace_status IS 'Performance: Optimizes inbox task filtering';
