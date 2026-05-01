# Finance Runbook — Invoice Template System

How to use the "New invoice from template" workflow on `/admin?tab=finance`.
Designed so a non-engineer can run monthly billing without touching Zoho directly.

## Prerequisites

- You have admin role on the ERP
- Zoho integration is connected (one-time, by an admin via `/settings/integrations`)
- The client you want to invoice exists in **both** the ERP and Zoho Books

## Once-per-client setup: link client to Zoho

Each client that will ever be invoiced needs its `zoho_contact_id` linked.
If a client isn't in the **"New invoice from template"** dialog dropdown, that's why.

To link a new client:

1. Confirm the client exists in Zoho Books — if not, create the contact there first
2. Note the Zoho `contact_id` (numeric, ~12 digits) — find it in the URL of the contact page
3. Run this SQL (replace placeholders):

```sql
update public.clients
set
  zoho_contact_id = '<numeric id from Zoho URL>',
  zoho_company_name = '<exact company name as it appears in Zoho>',
  default_vat_treatment = '<cyprus_vat | eu_reverse | non_eu_zero>'
where id = '<ERP client UUID>';
```

`default_vat_treatment` decides VAT handling on every invoice for that client:

- `cyprus_vat` — 19% Cyprus VAT applies on lines marked VAT
- `eu_reverse` — VAT is zeroed (reverse charge applies — buyer accounts for it)
- `non_eu_zero` — VAT is zeroed (export of services to non-EU)

## Issuing a single invoice

1. Open https://portal.qualiasolutions.net/admin?tab=finance
2. Click **"New invoice from template"** (top-right of the Finance section)
3. Pick the **template**:
   - **Monthly retainer** — multi-line (retainer + SEO + usage credit). For ongoing service clients (Underdog, etc.)
   - **Single-line service** — one-line (Maison Maud, Armenius pattern)
   - **Project — initial deposit** — 50% upfront. Requires a proposal reference (e.g. `QS-2026-EVMSTR`)
   - **Project — final balance** — final payment. Requires same proposal reference as the deposit
4. Pick the **client**
5. Adjust **invoice date** and **due date** if needed (defaults are sensible)
6. Pick **terms**:
   - **Generic Qualia terms** — the standard for everyone
   - **Sakani PDA terms** — only for Sakani (references the Platform Development Agreement)
7. Edit the **line items** as needed:
   - Override the **rate** for any line
   - Toggle **VAT** off for pass-through API/usage costs
   - Add extra lines if the template allows it
   - Lines with rate **€0** are dropped automatically
8. Optionally fill the **cover email** block:
   - **TO** — client primary contact
   - **CC** — accountants, partners, etc.
   - The system will save a draft in Zoho Mail Drafts (it does **not** send automatically)
9. Click **"Create draft in Zoho"**
10. Confirm the success card shows the new invoice number, click the **"View customer link"** to open it in Zoho

## Reviewing before sending

The system **always creates drafts**. Nothing is sent to clients automatically.

For each invoice you create, before sending:

1. Open the invoice in Zoho Books
2. Verify the totals (subtotal, VAT, total)
3. Verify the line item descriptions look right (placeholders like `{month}` resolved)
4. Verify the terms are correct
5. Click **Send** in Zoho Books to email the customer (this attaches the PDF automatically)
6. Open Zoho Mail Drafts, find the cover email draft, edit if needed, then send (or delete it if you used Zoho Books' built-in send)

## Bulk: end-of-month retainer batch

> **Currently exposed only via the qualia-erp MCP server** (Phase 1 doesn't include the bulk button).
> Run from any project: `/qualia-quick "draft May retainer invoices"`

It calls `generate_monthly_retainer_invoices`, which:

1. Reads all `recurring_payments` with `is_active = true`, `type = 'incoming'`, `frequency = 'monthly'`, and a `template_key` set
2. For each, generates a draft invoice using the template
3. Returns a summary of created + skipped (with reason)

To enable a recurring payment for bulk billing, set its `template_key` and `client_id`:

```sql
update public.recurring_payments
set template_key = 'monthly_retainer'
where id = '<recurring payment UUID>'
  and client_id is not null;
```

## Common errors

| Error                                            | Cause                             | Fix                                                                                                                                                   |
| ------------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Client … has no zoho_contact_id`                | Client not linked to Zoho         | Run the link SQL above                                                                                                                                |
| `Template "X" requires a reference number`       | Project template, no proposal ref | Fill the **Reference number** field (e.g. `QS-2026-EVMSTR`)                                                                                           |
| `Zoho not connected. Please authenticate first.` | OAuth token expired/missing       | Reconnect via `/settings/integrations`                                                                                                                |
| `Zoho organization_id not configured`            | One-time setup missing            | An admin runs:<br>`update workspace_integrations set config = config \|\| jsonb_build_object('organization_id', '20103867005') where provider='zoho'` |
| `Zoho returned an unexpected response shape`     | Network/Zoho API issue            | Retry; if persistent, check Sentry                                                                                                                    |

## What the system does **not** do (yet)

- Send invoices automatically — always drafts
- Attach PDFs to the cover email — use Zoho Books' built-in send instead
- Pull client email addresses — type them manually in the dialog
- Cancel/void invoices — do that in Zoho Books directly
- Show a per-client invoice history in the ERP — use Zoho Books or the existing finance KPIs for now
