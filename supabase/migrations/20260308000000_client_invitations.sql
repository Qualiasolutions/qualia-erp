-- Phase 18 Plan 01: Client Invitation System
-- Creates client_invitations table for tracking invitation lifecycle

-- =============================================================================
-- 1. Create invitation_status enum
-- =============================================================================
CREATE TYPE invitation_status AS ENUM (
  'sent',      -- Initial state after createInvitation
  'resent',    -- After resendInvitation called
  'opened',    -- Client clicked invitation link (Phase 19 sets this)
  'accepted',  -- Client created account (Phase 19 sets this)
  'expired'    -- Future feature (v2)
);

-- =============================================================================
-- 2. Create client_invitations table
-- =============================================================================
CREATE TABLE public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  invitation_token text NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'sent',
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  resent_at timestamptz,
  resent_count int DEFAULT 0,
  opened_at timestamptz,
  account_created_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT unique_project_email UNIQUE(project_id, email)
);

-- =============================================================================
-- 3. Create indexes for performance
-- =============================================================================
CREATE INDEX idx_invitations_project ON public.client_invitations(project_id, invited_at DESC);
CREATE INDEX idx_invitations_token ON public.client_invitations(invitation_token)
  WHERE status NOT IN ('accepted', 'expired');
CREATE INDEX idx_invitations_status ON public.client_invitations(status);

-- =============================================================================
-- 4. Enable RLS
-- =============================================================================
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS Policies
-- =============================================================================

-- Admin full access to invitations
CREATE POLICY "Admin full access to invitations" ON public.client_invitations
  FOR ALL USING (is_admin());

-- Managers view invitations for their projects
CREATE POLICY "Managers view invitations for their projects" ON public.client_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = client_invitations.project_id
      AND p.lead_id = (SELECT auth.uid())
    )
  );
