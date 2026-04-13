-- Baseline migration for portal messaging tables
--
-- These tables exist in production but their CREATE TABLE / RLS definitions
-- never made it into source control. This migration captures the live schema
-- (as of 2026-04-13) so a fresh `supabase db reset` reproduces production and
-- the RLS posture is auditable from git history.
--
-- Safe to run against an environment that already has these tables: the
-- `IF NOT EXISTS` guards + `DROP POLICY IF EXISTS` / `CREATE POLICY` pattern
-- makes this idempotent. RLS is force-enabled even if already on.
--
-- Related: OPTIMIZE.md findings C2 (baseline missing), C6 (missing indexes).

-- ---------------------------------------------------------------------------
-- portal_message_channels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_message_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- One channel per project (prevents the race condition in getOrCreateChannel
-- where two concurrent "start conversation" clicks would create duplicates).
CREATE UNIQUE INDEX IF NOT EXISTS portal_message_channels_project_id_unique
  ON public.portal_message_channels (project_id);

-- Foreign key lookup index used by getMessageChannels and getMessagingProjects.
CREATE INDEX IF NOT EXISTS portal_message_channels_last_message_at_idx
  ON public.portal_message_channels (last_message_at DESC NULLS LAST);

ALTER TABLE public.portal_message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_message_channels FORCE ROW LEVEL SECURITY;

-- Internal staff (admin/manager/employee) can see every channel in their
-- workspace. Clients can only see channels for projects they're linked to.
DROP POLICY IF EXISTS "portal_message_channels_select" ON public.portal_message_channels;
CREATE POLICY "portal_message_channels_select"
  ON public.portal_message_channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager', 'employee')
    )
    OR EXISTS (
      SELECT 1 FROM public.client_projects cp
      WHERE cp.project_id = portal_message_channels.project_id
        AND cp.client_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "portal_message_channels_insert" ON public.portal_message_channels;
CREATE POLICY "portal_message_channels_insert"
  ON public.portal_message_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager', 'employee')
    )
    OR EXISTS (
      SELECT 1 FROM public.client_projects cp
      WHERE cp.project_id = portal_message_channels.project_id
        AND cp.client_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "portal_message_channels_update" ON public.portal_message_channels;
CREATE POLICY "portal_message_channels_update"
  ON public.portal_message_channels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager', 'employee')
    )
    OR EXISTS (
      SELECT 1 FROM public.client_projects cp
      WHERE cp.project_id = portal_message_channels.project_id
        AND cp.client_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- portal_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.portal_message_channels(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_html text,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Composite index used by both the pagination query in getChannelMessages
-- and the bulk unread-count fetch in computeUnreadCounts. Required for the
-- post-C4/C5 collapsed query to stay fast as message volume grows.
CREATE INDEX IF NOT EXISTS portal_messages_channel_created_idx
  ON public.portal_messages (channel_id, created_at DESC);

-- Used by realtime subscription filters.
CREATE INDEX IF NOT EXISTS portal_messages_project_id_idx
  ON public.portal_messages (project_id);

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages FORCE ROW LEVEL SECURITY;

-- Internal staff see everything in their workspace. Clients can only see
-- non-internal messages in projects they're linked to.
DROP POLICY IF EXISTS "portal_messages_select" ON public.portal_messages;
CREATE POLICY "portal_messages_select"
  ON public.portal_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager', 'employee')
    )
    OR (
      is_internal = false
      AND EXISTS (
        SELECT 1 FROM public.client_projects cp
        WHERE cp.project_id = portal_messages.project_id
          AND cp.client_id = (SELECT auth.uid())
      )
    )
  );

-- Only the sender inserts. Clients cannot send internal messages.
DROP POLICY IF EXISTS "portal_messages_insert" ON public.portal_messages;
CREATE POLICY "portal_messages_insert"
  ON public.portal_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role IN ('admin', 'manager', 'employee')
      )
      OR (
        is_internal = false
        AND EXISTS (
          SELECT 1 FROM public.client_projects cp
          WHERE cp.project_id = portal_messages.project_id
            AND cp.client_id = (SELECT auth.uid())
        )
      )
    )
  );

-- Senders can edit their own messages (for edit history or content_html
-- rerender). No deletes from the client path — use admin action if needed.
DROP POLICY IF EXISTS "portal_messages_update" ON public.portal_messages;
CREATE POLICY "portal_messages_update"
  ON public.portal_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()))
  WITH CHECK (sender_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- portal_message_read_status
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.portal_message_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  UNIQUE (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS portal_message_read_status_user_channel_idx
  ON public.portal_message_read_status (user_id, channel_id);

ALTER TABLE public.portal_message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_message_read_status FORCE ROW LEVEL SECURITY;

-- Users see + write their own read cursors only.
DROP POLICY IF EXISTS "portal_message_read_status_select_own" ON public.portal_message_read_status;
CREATE POLICY "portal_message_read_status_select_own"
  ON public.portal_message_read_status
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "portal_message_read_status_insert_own" ON public.portal_message_read_status;
CREATE POLICY "portal_message_read_status_insert_own"
  ON public.portal_message_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "portal_message_read_status_update_own" ON public.portal_message_read_status;
CREATE POLICY "portal_message_read_status_update_own"
  ON public.portal_message_read_status
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
