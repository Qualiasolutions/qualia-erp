-- Financial Consolidation Cleanup
-- Baseline DDL for keeper tables + drop legacy tables
-- Part of Phase 6: Financial System Consolidation

-- ============================================================
-- 1. Baseline DDL for financial_invoices (created outside migrations)
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_invoices (
  zoho_id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id TEXT,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT,
  total NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) DEFAULT 0,
  currency_code TEXT,
  last_payment_date TEXT,
  is_hidden BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT now(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL
);

-- ============================================================
-- 2. Baseline DDL for financial_payments (created outside migrations)
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_payments (
  zoho_id TEXT PRIMARY KEY,
  payment_number TEXT,
  customer_name TEXT NOT NULL,
  customer_id TEXT,
  date TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  currency_code TEXT,
  payment_mode TEXT,
  description TEXT,
  invoice_numbers TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. Drop legacy tables
-- ============================================================

-- Drop RLS policies first
DO $$
BEGIN
  -- payments policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payments') THEN
    DROP POLICY IF EXISTS "Users can view own workspace payments" ON payments;
    DROP POLICY IF EXISTS "Users can insert own workspace payments" ON payments;
    DROP POLICY IF EXISTS "Users can update own workspace payments" ON payments;
    DROP POLICY IF EXISTS "Users can delete own workspace payments" ON payments;
  END IF;

  -- recurring_payments policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'recurring_payments') THEN
    DROP POLICY IF EXISTS "Users can view own workspace recurring_payments" ON recurring_payments;
    DROP POLICY IF EXISTS "Users can insert own workspace recurring_payments" ON recurring_payments;
    DROP POLICY IF EXISTS "Users can update own workspace recurring_payments" ON recurring_payments;
    DROP POLICY IF EXISTS "Users can delete own workspace recurring_payments" ON recurring_payments;
  END IF;

  -- client_invoices policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'client_invoices') THEN
    DROP POLICY IF EXISTS "Admins can manage all invoices" ON client_invoices;
    DROP POLICY IF EXISTS "Clients can view own invoices" ON client_invoices;
    DROP POLICY IF EXISTS "admin_manage_invoices" ON client_invoices;
    DROP POLICY IF EXISTS "client_view_own_invoices" ON client_invoices;
  END IF;
END $$;

-- Drop tables
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS recurring_payments CASCADE;
DROP TABLE IF EXISTS client_invoices CASCADE;
