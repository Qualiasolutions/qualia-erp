-- =====================================================
-- MIGRATION: Add Performance Indexes
-- =====================================================
-- This migration adds missing indexes identified in the
-- deep research analysis to improve query performance,
-- especially for RLS policy evaluation.
-- =====================================================

-- 1. Junction table indexes for RLS helper functions
-- These are called on EVERY row evaluation and need to be fast

-- team_members: Used by is_team_member() in most RLS policies
CREATE INDEX IF NOT EXISTS idx_team_members_team_profile
ON team_members(team_id, profile_id);

-- Also add profile_id only for "my teams" queries
CREATE INDEX IF NOT EXISTS idx_team_members_profile
ON team_members(profile_id);

-- workspace_members: Used by is_workspace_member() in RLS policies
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_profile
ON workspace_members(workspace_id, profile_id);

-- Also add profile_id + is_default for default workspace lookup
CREATE INDEX IF NOT EXISTS idx_workspace_members_profile_default
ON workspace_members(profile_id, is_default);

-- issue_assignees: Used in issue access checks
CREATE INDEX IF NOT EXISTS idx_issue_assignees_issue_profile
ON issue_assignees(issue_id, profile_id);

-- 2. Client-related tables (no FK indexes found)
CREATE INDEX IF NOT EXISTS idx_client_contacts_client
ON client_contacts(client_id);

CREATE INDEX IF NOT EXISTS idx_client_activities_client
ON client_activities(client_id);

-- For recent activity queries on clients
CREATE INDEX IF NOT EXISTS idx_client_activities_client_created
ON client_activities(client_id, created_at DESC);

-- 3. Composite indexes for common filtered queries

-- Issues by workspace and status (dashboard, filtered lists)
CREATE INDEX IF NOT EXISTS idx_issues_workspace_status
ON issues(workspace_id, status);

-- Projects by workspace and group (project grid tabs)
CREATE INDEX IF NOT EXISTS idx_projects_workspace_group
ON projects(workspace_id, project_group);

-- Projects by workspace and status
CREATE INDEX IF NOT EXISTS idx_projects_workspace_status
ON projects(workspace_id, status);

-- 4. Activities: optimize common query patterns

-- Workspace-scoped activity feed
CREATE INDEX IF NOT EXISTS idx_activities_workspace_created
ON activities(workspace_id, created_at DESC);

-- 5. Documents: workspace scoping for future RAG queries
CREATE INDEX IF NOT EXISTS idx_documents_workspace
ON documents(workspace_id);

-- Note: Vector index for documents.embedding should be added when
-- RAG is implemented. Example for IVFFlat:
-- CREATE INDEX idx_documents_embedding ON documents
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 6. Phase items: optimize roadmap queries
CREATE INDEX IF NOT EXISTS idx_phase_items_completed
ON phase_items(phase_id, is_completed);

-- =====================================================
-- VERIFICATION QUERY (run after migration to verify):
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
-- =====================================================
