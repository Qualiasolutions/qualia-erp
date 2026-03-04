-- Add client_feature_requests and client_invoices tables for portal upgrade

-- =============================================================================
-- 1. client_feature_requests
-- =============================================================================
CREATE TABLE public.client_feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'planned', 'in_progress', 'completed', 'declined')),
  admin_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_client_feature_requests_client ON public.client_feature_requests(client_id);
CREATE INDEX idx_client_feature_requests_status ON public.client_feature_requests(status);

ALTER TABLE public.client_feature_requests ENABLE ROW LEVEL SECURITY;

-- Clients see only their own requests
CREATE POLICY "Clients view own feature requests" ON public.client_feature_requests
  FOR SELECT USING (client_id = (SELECT auth.uid()));

-- Clients can create requests
CREATE POLICY "Clients create feature requests" ON public.client_feature_requests
  FOR INSERT WITH CHECK (client_id = (SELECT auth.uid()));

-- Clients can update their own pending requests
CREATE POLICY "Clients update own pending requests" ON public.client_feature_requests
  FOR UPDATE USING (client_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (client_id = (SELECT auth.uid()));

-- Admins full access
CREATE POLICY "Admin full access to client_feature_requests" ON public.client_feature_requests
  FOR ALL USING (is_admin());

-- =============================================================================
-- 2. client_invoices
-- =============================================================================
CREATE TABLE public.client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
  issued_date date NOT NULL,
  due_date date,
  paid_date date,
  description text,
  file_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_client_invoices_client ON public.client_invoices(client_id);
CREATE INDEX idx_client_invoices_status ON public.client_invoices(status);

ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

-- Clients see only their own invoices
CREATE POLICY "Clients view own invoices" ON public.client_invoices
  FOR SELECT USING (client_id = (SELECT auth.uid()));

-- Admins full access
CREATE POLICY "Admin full access to client_invoices" ON public.client_invoices
  FOR ALL USING (is_admin());
