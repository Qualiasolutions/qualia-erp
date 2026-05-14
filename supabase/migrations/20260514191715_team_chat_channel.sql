-- Team chat channel per workspace.
--
-- Staff members asked for a shared "Team Chat" pinned at the top of the
-- chat widget so they have somewhere to talk that isn't tied to a client
-- project. Modelling it as a regular project with `is_team_channel = true`
-- means the existing portal_message_channels / portal_messages plumbing
-- works unchanged — only the UI needs to know to render it specially.
--
-- Per-workspace unique (one team channel per workspace) via a partial
-- index. Clients never see it because they aren't linked via client_projects.

-- 1) Extend project_type enum so the team-channel project has a sane type.
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'internal';

-- 2) Flag column + partial unique index.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_team_channel boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS projects_one_team_channel_per_workspace
  ON public.projects (workspace_id)
  WHERE is_team_channel = true;

COMMENT ON COLUMN public.projects.is_team_channel IS
  'When true, this project is the workspace-wide internal team chat. Pinned at the top of the chat widget for staff. Backfilled one-per-workspace by migration 20260514191715.';

-- 3) Backfill: ensure every existing workspace has a team channel project.
--    Idempotent — skips workspaces that already have one.
INSERT INTO public.projects (workspace_id, name, status, project_type, is_team_channel)
SELECT w.id, 'Team Chat', 'Active'::project_status, 'internal'::project_type, true
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.workspace_id = w.id AND p.is_team_channel = true
);

-- 4) Auto-create the message-channel row for each team-channel project so it
--    surfaces in the chat widget immediately. Without this row the project
--    exists but the channel list query returns nothing for the team chat
--    until someone clicks "+" and "starts" the conversation.
INSERT INTO public.portal_message_channels (project_id)
SELECT p.id FROM public.projects p
WHERE p.is_team_channel = true
ON CONFLICT (project_id) DO NOTHING;
