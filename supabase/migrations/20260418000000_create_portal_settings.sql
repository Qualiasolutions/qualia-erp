-- Portal Settings: security + notification defaults + custom domain per workspace.
-- Consumed by the admin Portal Settings page and the notification preferences pipeline.

CREATE TABLE IF NOT EXISTS portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  require_2fa_for_clients boolean NOT NULL DEFAULT false,
  session_duration_hours integer NOT NULL DEFAULT 24 CHECK (session_duration_hours BETWEEN 1 AND 720),
  notification_defaults jsonb NOT NULL DEFAULT '{"task_assigned":true,"task_due_soon":true,"project_update":true,"meeting_reminder":true,"client_activity":true}'::jsonb,
  custom_domain text NULL,
  cname_target text NOT NULL DEFAULT 'cname.vercel-dns.com',
  domain_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read settings
CREATE POLICY "portal_settings_select"
  ON portal_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: admin or manager only
CREATE POLICY "portal_settings_insert"
  ON portal_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- UPDATE: admin or manager only
CREATE POLICY "portal_settings_update"
  ON portal_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- DELETE: admin or manager only
CREATE POLICY "portal_settings_delete"
  ON portal_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );
