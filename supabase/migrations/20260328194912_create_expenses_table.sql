CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Admin-only policy: only info@qualiasolutions.net can access
CREATE POLICY "Admin full access on expenses"
  ON expenses
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'info@qualiasolutions.net')
  WITH CHECK (auth.jwt() ->> 'email' = 'info@qualiasolutions.net');
