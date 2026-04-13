-- Baseline migration for financial_invoices and financial_payments
--
-- These are Zoho-synced read-mostly tables. Schema captured from live 2026-04-13.
-- RLS locks all writes to the service role; authenticated reads are admin-only.
-- Idempotent.
--
-- Related: OPTIMIZE.md finding M4 (migration hygiene).

-- ---------------------------------------------------------------------------
-- financial_invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_invoices (
  zoho_id text PRIMARY KEY,
  invoice_number text NOT NULL,
  customer_name text NOT NULL,
  customer_id text,
  status text NOT NULL,
  date date NOT NULL,
  due_date date,
  total numeric NOT NULL,
  balance numeric NOT NULL,
  currency_code text DEFAULT 'EUR',
  last_payment_date date,
  synced_at timestamptz NOT NULL DEFAULT now(),
  is_hidden boolean NOT NULL DEFAULT false,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS financial_invoices_client_id_idx
  ON public.financial_invoices (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS financial_invoices_status_idx
  ON public.financial_invoices (status) WHERE is_hidden = false;

ALTER TABLE public.financial_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_invoices FORCE ROW LEVEL SECURITY;

-- Admins/managers read everything. Clients see only their own invoices.
DROP POLICY IF EXISTS "financial_invoices_select" ON public.financial_invoices;
CREATE POLICY "financial_invoices_select"
  ON public.financial_invoices
  FOR SELECT
  TO authenticated
  USING (
    is_hidden = false
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role IN ('admin', 'manager')
      )
      OR (
        client_id IS NOT NULL
        AND client_id = (SELECT auth.uid())
      )
    )
  );

-- No client-path writes — Zoho sync runs server-side via service role.
-- (Service role bypasses RLS, so no INSERT/UPDATE/DELETE policies needed.)

-- ---------------------------------------------------------------------------
-- financial_payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_payments (
  zoho_id text PRIMARY KEY,
  payment_number text,
  customer_name text NOT NULL,
  customer_id text,
  date date NOT NULL,
  amount numeric NOT NULL,
  payment_mode text,
  description text,
  currency_code text DEFAULT 'EUR',
  invoice_numbers text,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_payments_date_idx
  ON public.financial_payments (date DESC);

ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payments FORCE ROW LEVEL SECURITY;

-- Admin-only read. Clients don't need raw payment history — they see their
-- invoice balance via financial_invoices.
DROP POLICY IF EXISTS "financial_payments_select_admin" ON public.financial_payments;
CREATE POLICY "financial_payments_select_admin"
  ON public.financial_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager')
    )
  );
