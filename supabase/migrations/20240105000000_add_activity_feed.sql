-- Activity feed table to track project and issue events
-- Shows to users based on their team membership

-- Create activity types enum
CREATE TYPE activity_type AS ENUM (
  'project_created',
  'project_updated',
  'issue_created',
  'issue_updated',
  'issue_completed',
  'issue_assigned',
  'comment_added',
  'team_created',
  'member_added'
);

-- Create activities table
CREATE TABLE public.activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type activity_type NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Polymorphic references - one of these will be set based on activity type
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  issue_id uuid REFERENCES public.issues(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,

  -- Store additional context as JSON
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Index for efficient querying
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_team_id ON activities(team_id);
CREATE INDEX idx_activities_project_id ON activities(project_id);
CREATE INDEX idx_activities_actor_id ON activities(actor_id);

-- RLS Policies for activities
-- Users can see activities for:
-- 1. Projects they lead or are part of (via team membership)
-- 2. Issues they created, are assigned to, or belong to their team
-- 3. Teams they are members of
-- Admins can see all activities

CREATE POLICY "Users can view activities" ON activities FOR SELECT USING (
  is_admin() OR
  -- Actor's own activities
  actor_id = (SELECT auth.uid()) OR
  -- Team activities they belong to
  (team_id IS NOT NULL AND is_team_member(team_id)) OR
  -- Project activities for their projects
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = activities.project_id
    AND (
      p.lead_id = (SELECT auth.uid()) OR
      (p.team_id IS NOT NULL AND is_team_member(p.team_id))
    )
  )) OR
  -- Issue activities for issues they can access
  (issue_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = activities.issue_id
    AND (
      i.assignee_id = (SELECT auth.uid()) OR
      i.creator_id = (SELECT auth.uid()) OR
      (i.team_id IS NOT NULL AND is_team_member(i.team_id))
    )
  ))
);

-- Only the system/authenticated users can insert activities (via server actions)
CREATE POLICY "Authenticated users can insert activities" ON activities FOR INSERT
WITH CHECK (true);

-- No updates allowed - activities are immutable
-- No deletes by users - only cascade from parent entities
