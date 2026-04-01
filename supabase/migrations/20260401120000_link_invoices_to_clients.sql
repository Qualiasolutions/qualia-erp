-- Migration: Link financial_invoices to clients + proper RLS
-- Steps 5 & 6 of Phase 6 (Financial Consolidation, Wave 6b)
--
-- 1. Add client_id FK to financial_invoices
-- 2. Backfill client_id using Zoho customer -> project -> client mapping
-- 3. Replace overly permissive RLS on financial_invoices with role-based policies
-- 4. Replace overly permissive RLS on financial_payments with admin/manager-only policies

-- =============================================================================
-- Step 5: Add client_id FK column + index
-- =============================================================================

-- Add column (idempotent: DO block checks existence)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_invoices' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE financial_invoices
      ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index (idempotent)
CREATE INDEX IF NOT EXISTS idx_financial_invoices_client_id
  ON financial_invoices(client_id);

-- =============================================================================
-- Backfill client_id from Zoho customer_name -> project name -> project.client_id
-- =============================================================================

-- CSC Zyprus Property Group Ltd -> Sophia - Zyprus
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'Sophia - Zyprus'
  AND fi.customer_name = 'CSC Zyprus Property Group Ltd'
  AND p.client_id IS NOT NULL;

-- GSC UNDERDOG SALES LTD -> Underdog
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'Underdog'
  AND fi.customer_name = 'GSC UNDERDOG SALES LTD'
  AND p.client_id IS NOT NULL;

-- K.T.E CAR COLOURING LTD -> LuxCars
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'LuxCars'
  AND fi.customer_name = 'K.T.E CAR COLOURING LTD'
  AND p.client_id IS NOT NULL;

-- Mr. Marco Pellizzeri -> Doctor Marco
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'Doctor Marco'
  AND fi.customer_name = 'Mr. Marco Pellizzeri'
  AND p.client_id IS NOT NULL;

-- PETA TRADING LTD -> Peta
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'Peta'
  AND fi.customer_name = 'PETA TRADING LTD'
  AND p.client_id IS NOT NULL;

-- Sakani (Smart IT Buildings L.L.C.) -> Sakani
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'Sakani'
  AND fi.customer_name = 'Sakani (Smart IT Buildings L.L.C.)'
  AND p.client_id IS NOT NULL;

-- Sofian & Shehadeh (sslaw) -> SS Law
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'SS Law'
  AND fi.customer_name = 'Sofian & Shehadeh (sslaw)'
  AND p.client_id IS NOT NULL;

-- Urban's & Melon's & Kids Festive -> Urban
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'Urban'
  AND fi.customer_name = 'Urban''s & Melon''s & Kids Festive'
  AND p.client_id IS NOT NULL;

-- Woodlocation -> Wood Location
UPDATE financial_invoices fi
SET client_id = p.client_id
FROM projects p
WHERE p.name = 'Wood Location'
  AND fi.customer_name = 'Woodlocation'
  AND p.client_id IS NOT NULL;

-- =============================================================================
-- Step 6: RLS policies for financial_invoices
-- =============================================================================

-- RLS is already enabled on financial_invoices. Drop the existing overly
-- permissive policies and replace with proper role-based ones.

DROP POLICY IF EXISTS "Authenticated users can read invoices" ON financial_invoices;
DROP POLICY IF EXISTS "Service role can manage invoices" ON financial_invoices;

-- Admin and manager: full access (read, insert, update, delete)
CREATE POLICY "admin_manager_full_access" ON financial_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- Client: read-only access to their own invoices
-- Join path: auth.uid() -> client_projects.client_id (portal user's auth ID)
--         -> client_projects.project_id -> projects.client_id (CRM client)
--         -> financial_invoices.client_id (CRM client)
CREATE POLICY "client_own_invoices" ON financial_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_projects cp
      JOIN projects p ON p.id = cp.project_id
      WHERE cp.client_id = auth.uid()
        AND p.client_id = financial_invoices.client_id
        AND p.client_id IS NOT NULL
    )
  );

-- Service role bypasses RLS by default in Supabase, so no explicit policy needed
-- for cron sync or server actions using the service role client.

-- =============================================================================
-- RLS policies for financial_payments (already RLS-enabled, fix permissive policies)
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read payments" ON financial_payments;
DROP POLICY IF EXISTS "Service role can manage payments" ON financial_payments;

-- Admin and manager: full access
CREATE POLICY "admin_manager_full_access" ON financial_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );
