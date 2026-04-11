-- Portal Admin: App Config + Branding tables
-- These tables control which portal apps are visible per client and workspace-level branding.

-- =====================
-- portal_app_config
-- =====================
CREATE TABLE IF NOT EXISTS portal_app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT portal_app_config_app_key_check CHECK (
    app_key IN ('home', 'projects', 'messages', 'files', 'billing', 'requests', 'settings')
  ),
  CONSTRAINT portal_app_config_unique UNIQUE (
    workspace_id,
    COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid),
    app_key
  )
);

-- RLS
ALTER TABLE portal_app_config ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read config
CREATE POLICY "portal_app_config_select"
  ON portal_app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: admin or manager only
CREATE POLICY "portal_app_config_insert"
  ON portal_app_config
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
CREATE POLICY "portal_app_config_update"
  ON portal_app_config
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
CREATE POLICY "portal_app_config_delete"
  ON portal_app_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================
-- portal_branding
-- =====================
CREATE TABLE IF NOT EXISTS portal_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  company_name text NULL,
  logo_url text NULL,
  accent_color text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE portal_branding ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read branding
CREATE POLICY "portal_branding_select"
  ON portal_branding
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: admin or manager only
CREATE POLICY "portal_branding_insert"
  ON portal_branding
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
CREATE POLICY "portal_branding_update"
  ON portal_branding
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
CREATE POLICY "portal_branding_delete"
  ON portal_branding
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );
