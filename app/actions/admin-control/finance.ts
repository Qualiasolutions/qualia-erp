'use server';

import { getFinancialSummary } from '@/app/actions/financials';
import { getMrrSnapshot, type RecurringPaymentRow } from '@/app/actions/recurring-payments';
import { getBillableClients, type BillableClient } from '@/app/actions/invoice-generation';

export type FinanceKpi = { label: string; value: string; sub: string | null };

export type FinancePaymentRow = {
  id: string;
  date: string;
  customer_name: string;
  amount: number;
  reference: string | null;
};

export type FinanceInvoiceRow = {
  id: string;
  date: string;
  customer_name: string;
  invoice_number: string;
  total: number;
  balance: number;
  status: string;
  due_date: string | null;
};

export type FinanceRecurringRow = {
  id: string;
  type: 'incoming' | 'outgoing';
  frequency: 'monthly' | 'yearly' | 'one_off';
  amount: number;
  currency: string;
  description: string;
  client_id: string | null;
  client_name: string | null;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
};

export type FinancePayload = {
  kpis: FinanceKpi[];
  recentPayments: FinancePaymentRow[];
  openInvoices: FinanceInvoiceRow[];
  recurring: FinanceRecurringRow[];
  mrrCurrent: number;
  mrrNextMonth: number;
  expectedThisMonth: number;
  /** Clients that have a Zoho contact_id linked — invoiceable via the template system. */
  billableClients: BillableClient[];
};

const fmt = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmt2 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

function toRow(r: RecurringPaymentRow): FinanceRecurringRow {
  return {
    id: r.id,
    type: r.type,
    frequency: r.frequency,
    amount: r.amount,
    currency: r.currency,
    description: r.description,
    client_id: r.client_id,
    client_name: r.client_name,
    category: r.category,
    start_date: r.start_date,
    end_date: r.end_date,
    is_active: r.is_active,
    notes: r.notes,
  };
}

export async function loadFinanceTab(): Promise<FinancePayload> {
  const [summary, mrr, billableClients] = await Promise.all([
    getFinancialSummary(),
    getMrrSnapshot(),
    getBillableClients(),
  ]);

  const recurring = mrr.rows.map(toRow);

  const mrrDelta = mrr.mrrNextMonth - mrr.mrrCurrent;
  const mrrDeltaSign = mrrDelta >= 0 ? '+' : '';
  const oneOffsThisMonth = recurring
    .filter((r) => r.is_active && r.type === 'incoming' && r.frequency === 'one_off')
    .reduce((sum, r) => sum + r.amount, 0);

  // KPI A — MRR + Expected this month always render, even when Zoho summary is empty.
  const kpis: FinanceKpi[] = [
    {
      label: 'MRR',
      value: fmt2.format(mrr.mrrCurrent),
      sub:
        mrrDelta === 0
          ? 'no change vs next month'
          : `${mrrDeltaSign}${fmt2.format(mrrDelta)} next month`,
    },
    {
      label: 'Expected this month',
      value: fmt2.format(mrr.expectedThisMonth),
      sub:
        oneOffsThisMonth > 0 ? `incl. ${fmt2.format(oneOffsThisMonth)} one-off` : 'recurring only',
    },
  ];

  if (summary) {
    const deltaThisMonth = summary.thisMonthCollected - summary.lastMonthCollected;
    const deltaSign = deltaThisMonth >= 0 ? '+' : '';
    kpis.push(
      {
        label: 'Collected this month',
        value: fmt.format(summary.thisMonthCollected),
        sub: `${deltaSign}${fmt.format(Math.round(deltaThisMonth))} vs last`,
      },
      {
        label: 'Outstanding',
        value: fmt.format(summary.totalOutstanding),
        sub: `${summary.overdueInvoices.length} overdue`,
      }
    );
  }

  const recentPayments: FinancePaymentRow[] = summary
    ? summary.allPayments.slice(0, 10).map((p) => ({
        id: p.zoho_id,
        date: p.date,
        customer_name: p.customer_name,
        amount: Number(p.amount),
        reference: p.payment_number ?? p.description ?? null,
      }))
    : [];

  const openInvoices: FinanceInvoiceRow[] = summary
    ? summary.overdueInvoices.slice(0, 20).map((i) => ({
        id: i.zoho_id,
        date: i.date,
        customer_name: i.customer_name,
        invoice_number: i.invoice_number,
        total: Number(i.total),
        balance: Number(i.balance),
        status: i.status,
        due_date: i.due_date ?? null,
      }))
    : [];

  return {
    kpis,
    recentPayments,
    openInvoices,
    recurring,
    mrrCurrent: mrr.mrrCurrent,
    mrrNextMonth: mrr.mrrNextMonth,
    expectedThisMonth: mrr.expectedThisMonth,
    billableClients,
  };
}
