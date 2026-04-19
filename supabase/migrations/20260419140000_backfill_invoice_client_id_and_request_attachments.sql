-- Backfill financial_invoices.client_id from Zoho customer_name → projects.name mapping
-- Required because earlier syncs ran before projects were linked to clients,
-- leaving SAKANI-002/003/004, UNDERDOG-*, PETA-* invoices with NULL client_id
-- and therefore hidden from the client portal /billing view.

with mapping (customer_name, project_name) as (
  values
    ('CSC Zyprus Property Group Ltd', 'Sophia - Zyprus'),
    ('GSC UNDERDOG SALES LTD', 'Underdog'),
    ('K.T.E CAR COLOURING LTD', 'LuxCars'),
    ('Mr. Marco Pellizzeri', 'Doctor Marco'),
    ('PETA TRADING LTD', 'Peta'),
    ('Sakani (Smart IT Buildings L.L.C.)', 'Sakani'),
    ('Sofian & Shehadeh (sslaw)', 'SS Law'),
    ('Urban''s & Melon''s & Kids Festive', 'Urban'),
    ('Woodlocation', 'Wood Location')
)
update financial_invoices fi
set client_id = p.client_id
from mapping m
join projects p on p.name = m.project_name
where fi.customer_name = m.customer_name
  and fi.client_id is null
  and p.client_id is not null;

-- Feature request attachments
-- Stores an array of {name, url, size, type, uploaded_at} per request
alter table client_feature_requests
  add column if not exists attachments jsonb not null default '[]'::jsonb;

comment on column client_feature_requests.attachments is
  'Array of file attachments: [{name, url, size, type, uploaded_at}]. Files live in the project-files storage bucket under feature-requests/<client_id>/<request_id>/.';
