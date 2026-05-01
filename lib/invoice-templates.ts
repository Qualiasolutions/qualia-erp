/**
 * Invoice templates — codified patterns for the four kinds of invoices we issue.
 *
 * Each template defines:
 *  - line items (with placeholder rates the user can override per-invoice)
 *  - default VAT treatment (Cyprus 19% / non-EU 0% / explicit per-line)
 *  - default terms text (bank details + payment terms + scope reference)
 *  - default cover-email subject + body (Verdana 10pt, "Dear X" tone)
 *
 * The UI dialog reads `INVOICE_TEMPLATES[key]`, the user picks a client
 * and tweaks rates, and `generateInvoiceFromTemplate()` resolves placeholders
 * before pushing to Zoho.
 *
 * Mirrors the pattern in lib/qualia-framework-templates.ts.
 */

/** Zoho Books "VAT 19%" tax_id for Qualia Solutions LTD organization (20103867005). */
export const ZOHO_VAT_19_TAX_ID = '706649000000177001';

/** Zoho Books base item_ids that already exist in the catalog. */
export const ZOHO_ITEM_IDS = {
  monthlyRetainer: '706649000000387002', // "Monthly Retainer - AI Sales Coach Support & Backup"
  seoServices: '706649000000388001', // "SEO Services"
  retellUsage: '706649000000387013', // "Retell AI Roleplay Usage"
  annualMaintenance: '706649000000059037', // "Annual Maintenance, Host & Support"
  websiteDev: '706649000000054201', // "E-commerce Website Development"
} as const;

export type VatTreatment = 'cyprus_vat' | 'eu_reverse' | 'non_eu_zero';

export type TemplateLineItem = {
  /** Stable Zoho item_id — recommended so reporting groups consistently. */
  item_id: string;
  /** Display name on the invoice (overrides the item's catalog name). */
  name: string;
  /** Description shown beneath the line item. Supports `{month}`, `{year}` placeholders. */
  description: string;
  /** Default unit rate in EUR. Form pre-fills with this; user can override. */
  default_rate: number;
  /** Whether this line carries VAT (when client is `cyprus_vat`). */
  vat: boolean;
};

export type InvoiceTemplate = {
  key: string;
  label: string;
  description: string;
  /** When true, the user can add/remove lines. When false, lines are fixed. */
  allow_extra_lines: boolean;
  line_items: TemplateLineItem[];
  /** Default cover-email subject. Supports `{client_first_name}`, `{invoice_number}`, `{month}`, `{year}`. */
  email_subject: string;
  /** Default cover-email body (HTML, Verdana 10pt). Same placeholders as subject. */
  email_body_html: string;
  /** Default Net X days. */
  default_due_days: number;
  /** When true, surfaces a "Reference number" input (e.g. proposal QS-2026-EVMSTR). */
  requires_reference: boolean;
};

const STANDARD_NOTE_RETAINER = 'Thank you for your continued partnership.';

const STANDARD_NOTE_PROJECT =
  'Thank you for choosing Qualia Solutions. We look forward to delivering this milestone on schedule.';

/** The shared cover-email scaffold (Verdana 10pt) used across all templates. */
function coverEmailHtml(opening: string, body: string, closing: string): string {
  return `<div style="font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10pt;"><div>Dear {client_first_name},</div><div><br></div><div>I hope this message finds you well.</div><div><br></div><div>${opening}</div><div><br></div><div>${body}</div><div><br></div><div>${closing}</div><div><br></div><div>Kind regards,</div><div><br></div><div><b>Fawzi Goussous</b><br>Founder — Qualia Solutions LTD<br>info@qualiasolutions.net · +357 99 111 668<br>https://qualiasolutions.net</div></div>`;
}

export const INVOICE_TEMPLATES: Record<string, InvoiceTemplate> = {
  monthly_retainer: {
    key: 'monthly_retainer',
    label: 'Monthly retainer',
    description:
      'Recurring monthly retainer with platform support, SEO and (optional) usage credit. Underdog pattern.',
    allow_extra_lines: true,
    default_due_days: 30,
    requires_reference: false,
    line_items: [
      {
        item_id: ZOHO_ITEM_IDS.monthlyRetainer,
        name: 'Monthly Retainer — Platform Support & Maintenance',
        description:
          'Monthly retainer covering platform support, system monitoring, data backup and technical maintenance.',
        default_rate: 275,
        vat: true,
      },
      {
        item_id: ZOHO_ITEM_IDS.seoServices,
        name: 'SEO Services',
        description:
          'Monthly SEO services covering on-page optimization, performance monitoring and search visibility improvements.',
        default_rate: 125,
        vat: true,
      },
      {
        item_id: ZOHO_ITEM_IDS.retellUsage,
        name: 'AI / API Usage — {month} {year}',
        description: 'Pass-through API usage for {month} {year}. Receipts available on request.',
        default_rate: 0,
        vat: false,
      },
    ],
    email_subject: 'Invoice — {month} {year} · Qualia Solutions LTD',
    email_body_html: coverEmailHtml(
      'Please find attached our invoice <b>{invoice_number}</b> dated {invoice_date} for services rendered this month.',
      'Bank transfer details and online payment options are listed on the invoice.',
      'We appreciate your continued trust in Qualia Solutions and look forward to another productive month of collaboration.'
    ),
  },

  simple_service: {
    key: 'simple_service',
    label: 'Single-line service',
    description:
      'One-line invoice for support, maintenance, hosting or token usage. Maison Maud / Armenius pattern.',
    allow_extra_lines: false,
    default_due_days: 30,
    requires_reference: false,
    line_items: [
      {
        item_id: ZOHO_ITEM_IDS.annualMaintenance,
        name: 'Support, Maintenance & Hosting — {month} {year}',
        description: 'Monthly platform support, system maintenance and hosting for {month} {year}.',
        default_rate: 500,
        vat: true,
      },
    ],
    email_subject: 'Invoice — {month} {year} · Qualia Solutions LTD',
    email_body_html: coverEmailHtml(
      'Please find attached our invoice <b>{invoice_number}</b> dated {invoice_date} for {month} {year}.',
      'Bank transfer details and online payment options are listed on the invoice.',
      'We appreciate your continued trust in Qualia Solutions.'
    ),
  },

  project_deposit: {
    key: 'project_deposit',
    label: 'Project — initial deposit',
    description:
      'Upfront payment for a new project, references the proposal. EventMaster / Tasos pattern.',
    allow_extra_lines: false,
    default_due_days: 7,
    requires_reference: true,
    line_items: [
      {
        item_id: ZOHO_ITEM_IDS.websiteDev,
        name: 'Project Build — Initial Payment',
        description:
          'Initial payment for the project build. Reference proposal {reference_number}. Covers Milestones 1 & 2 of the agreed payment schedule.',
        default_rate: 900,
        vat: true,
      },
    ],
    email_subject: 'Project Initial Payment · Invoice {invoice_number}',
    email_body_html: coverEmailHtml(
      'Following our recent discussions and the proposal (ref. <b>{reference_number}</b>), please find attached our invoice <b>{invoice_number}</b> dated {invoice_date}, covering the initial payment for the project build.',
      'On receipt of this payment we will continue work on the next milestones, on track for delivery within the agreed timeline. The remaining balance will be invoiced upon project completion. Bank transfer details, CliQ payment option and full terms are listed on the invoice.',
      'We sincerely appreciate your trust in Qualia Solutions and look forward to bringing this project to life together.'
    ),
  },

  project_balance: {
    key: 'project_balance',
    label: 'Project — final balance',
    description: 'Final payment on project completion / go-live.',
    allow_extra_lines: false,
    default_due_days: 14,
    requires_reference: true,
    line_items: [
      {
        item_id: ZOHO_ITEM_IDS.websiteDev,
        name: 'Project Build — Final Payment',
        description:
          'Final payment for the project build. Reference proposal {reference_number}. Covers remaining milestones through go-live.',
        default_rate: 900,
        vat: true,
      },
    ],
    email_subject: 'Project Final Payment · Invoice {invoice_number}',
    email_body_html: coverEmailHtml(
      'The project has reached completion / go-live. Please find attached our invoice <b>{invoice_number}</b> dated {invoice_date}, covering the final payment for the project build (ref. <b>{reference_number}</b>).',
      'Bank transfer details, CliQ payment option and full terms are listed on the invoice. We will continue to provide post-launch support under our standard terms.',
      'It has been a pleasure working with you on this project.'
    ),
  },
};

export const TERMS_TEMPLATES = {
  generic: `BANK TRANSFER DETAILS
Recipient:   Qualio Solutions LTD
Address:     147 Ledras Street, Floor 1, Office 1011, 1011 Nicosia, Cyprus
IBAN:        LT40 3250 0841 5791 1232
BIC / SWIFT: REVOLT21
Currency:    EUR
CliQ Alias:  Alqam12

Transfers via CliQ (preferred) or SEPA bank transfer are accepted. Please reference the invoice number on your transfer.

PAYMENT TERMS
Payment is due within thirty (30) calendar days of the invoice date (Net 30). Amounts unpaid after fourteen (14) calendar days from the due date shall accrue interest at 1.5% per month, and Qualia Solutions LTD reserves the right to suspend services until outstanding invoices are settled in full.`,

  sakani_pda: `BANK TRANSFER DETAILS
Recipient:   Qualio Solutions LTD
Address:     147 Ledras Street, Floor 1, Office 1011, 1011 Nicosia, Cyprus
IBAN:        LT40 3250 0841 5791 1232
BIC / SWIFT: REVOLT21
Currency:    EUR
CliQ Alias:  Alqam12

Transfers via CliQ (preferred) or SEPA bank transfer are accepted.

SCOPE REFERENCE
All deliverables, acceptance criteria, warranty terms, change-management procedures and intellectual-property provisions are governed by the Platform Development Agreement between the parties. This invoice does not modify or supersede any terms of the Agreement.

LATE PAYMENT
Amounts unpaid after fourteen (14) calendar days from the due date shall accrue interest at 1.5% per month. The Developer reserves the right to suspend work on outstanding milestones until overdue invoices are settled, in accordance with Section 7.5 of the Agreement.`,
} as const;

export type TermsTemplateKey = keyof typeof TERMS_TEMPLATES;

export const STANDARD_INVOICE_NOTES = {
  retainer: STANDARD_NOTE_RETAINER,
  project: STANDARD_NOTE_PROJECT,
} as const;

/**
 * Resolve `{placeholder}` tokens in a string.
 * Unrecognised placeholders are left in place so the user can spot them.
 */
export function resolvePlaceholders(
  template: string,
  values: Record<string, string | number | undefined>
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key: string) => {
    const v = values[key];
    return v === undefined || v === '' ? full : String(v);
  });
}

export function listInvoiceTemplates(): InvoiceTemplate[] {
  return Object.values(INVOICE_TEMPLATES);
}
