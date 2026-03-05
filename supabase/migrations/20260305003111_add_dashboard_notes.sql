-- Admin daily notes for the dashboard
CREATE TABLE IF NOT EXISTS dashboard_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: only admin/manager can insert, anyone authenticated can read
ALTER TABLE dashboard_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dashboard notes"
  ON dashboard_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and manager can insert dashboard notes"
  ON dashboard_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Author or admin can update dashboard notes"
  ON dashboard_notes FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Author or admin can delete dashboard notes"
  ON dashboard_notes FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for chronological listing
CREATE INDEX idx_dashboard_notes_created ON dashboard_notes(created_at DESC);
