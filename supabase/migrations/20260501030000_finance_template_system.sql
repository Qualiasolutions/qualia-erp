-- Finance template system foundation
-- Adds the columns needed to drive the "generate invoice from template" workflow:
--  - clients.zoho_contact_id        Zoho Books contact ID (numeric string)
--  - clients.zoho_company_name      Cached display name as it appears in Zoho
--  - clients.default_vat_treatment  How to apply VAT when generating invoices
--  - clients.memory_note_path       Relative path inside qualia-memory vault
--  - recurring_payments.template_key      Which invoice template to use when auto-generating
--  - recurring_payments.zoho_line_items   JSONB array of line items override (rate/tax/description)
--  - recurring_payments.frequency         Was missing as a stored column; needed for template gen

-- Clients
alter table public.clients
  add column if not exists zoho_contact_id text,
  add column if not exists zoho_company_name text,
  add column if not exists default_vat_treatment text
    check (default_vat_treatment in ('cyprus_vat', 'eu_reverse', 'non_eu_zero')),
  add column if not exists memory_note_path text;

create index if not exists idx_clients_zoho_contact_id
  on public.clients (zoho_contact_id)
  where zoho_contact_id is not null;

-- Recurring payments
alter table public.recurring_payments
  add column if not exists template_key text,
  add column if not exists zoho_line_items jsonb,
  add column if not exists frequency text not null default 'monthly'
    check (frequency in ('monthly', 'yearly', 'one_off')),
  add column if not exists start_date date,
  add column if not exists end_date date;

-- Backfill the well-known Zoho contact mappings (from app/actions/financials.ts ZOHO_CUSTOMER_TO_PROJECT)
-- We match against clients.display_name. Safe to re-run.
update public.clients
set
  zoho_contact_id = '706649000000314015',
  zoho_company_name = 'GSC UNDERDOG SALES LTD',
  default_vat_treatment = coalesce(default_vat_treatment, 'cyprus_vat')
where lower(coalesce(display_name, name)) in ('underdogsales', 'giuliu - undersales dog')
  and zoho_contact_id is null;

update public.clients
set
  zoho_contact_id = '706649000000058358',
  zoho_company_name = 'Mr. Issa Kandah',
  default_vat_treatment = coalesce(default_vat_treatment, 'non_eu_zero'),
  memory_note_path = coalesce(memory_note_path, 'Clients/Maison Maud.md')
where lower(coalesce(display_name, name)) = 'maison maud'
  and zoho_contact_id is null;

update public.clients
set
  zoho_contact_id = '706649000000220001',
  zoho_company_name = 'CSC Zyprus Property Group Ltd',
  default_vat_treatment = coalesce(default_vat_treatment, 'cyprus_vat')
where lower(coalesce(display_name, name)) in ('csc zyprus property group ltd', 'sophia', 'lauren - zyprus', 'lauren', 'charalmbos pitros- zcyprus')
  and zoho_contact_id is null;

update public.clients
set
  zoho_contact_id = '706649000000233001',
  zoho_company_name = 'PETA TRADING LTD',
  default_vat_treatment = coalesce(default_vat_treatment, 'cyprus_vat')
where lower(coalesce(display_name, name)) = 'peta'
  and zoho_contact_id is null;

update public.clients
set
  zoho_contact_id = '706649000000353002',
  zoho_company_name = 'Sakani (Smart IT Buildings L.L.C.)',
  default_vat_treatment = coalesce(default_vat_treatment, 'non_eu_zero')
where lower(coalesce(display_name, name)) in ('sakani', 'smart it buildings l.l.c')
  and zoho_contact_id is null;

update public.clients
set
  zoho_contact_id = '706649000000197001',
  zoho_company_name = 'I.T. Armenius LTD',
  default_vat_treatment = coalesce(default_vat_treatment, 'cyprus_vat')
where lower(coalesce(display_name, name)) = 'i.t. armenius ltd'
  and zoho_contact_id is null;

update public.clients
set
  zoho_contact_id = '706649000000110149',
  zoho_company_name = 'Urban''s & Melon''s & Kids Festive',
  default_vat_treatment = coalesce(default_vat_treatment, 'cyprus_vat')
where lower(coalesce(display_name, name)) in ('urban''s & melon''s & kids festive', 'urbans melons kids festive')
  and zoho_contact_id is null;
