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

export type FinanceCashFlowMonth = {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
};

export type FinanceUpcomingBucket = {
  label: string;
  total: number;
  count: number;
  invoices: FinanceInvoiceRow[];
};

export type FinanceClientHealthRow = {
  customerName: string;
  mrr: number;
  outstanding: number;
  invoiceCount: number;
  reliabilityPct: number | null;
  lastPaidAt: string | null;
};

export type FinanceAgingBand = {
  label: string;
  total: number;
  count: number;
};

export type FinancePayload = {
  kpis: FinanceKpi[];
  recentPayments: FinancePaymentRow[];
  openInvoices: FinanceInvoiceRow[];
  recurring: FinanceRecurringRow[];
  mrrCurrent: number;
  mrrNextMonth: number;
  expectedThisMonth: number;
  cashFlow: FinanceCashFlowMonth[];
  upcomingBuckets: FinanceUpcomingBucket[];
  clientHealth: FinanceClientHealthRow[];
  agingBands: FinanceAgingBand[];
  totalOverdue: number;
  recurringSharePct: number | null;
  oneOffThisMonth: number;
  lastSyncedAt: string | null;
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

function asInvoiceRow(i: {
  zoho_id: string;
  date: string;
  customer_name: string;
  invoice_number: string;
  total: number;
  balance: number;
  status: string;
  due_date: string | null;
}): FinanceInvoiceRow {
  return {
    id: i.zoho_id,
    date: i.date,
    customer_name: i.customer_name,
    invoice_number: i.invoice_number,
    total: Number(i.total),
    balance: Number(i.balance),
    status: i.status,
    due_date: i.due_date ?? null,
  };
}

function daysUntil(date: string | null, today: Date): number | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
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
  const recurringSharePct =
    mrr.expectedThisMonth > 0 ? Math.round((mrr.mrrCurrent / mrr.expectedThisMonth) * 100) : null;

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
    ? summary.overdueInvoices.slice(0, 20).map(asInvoiceRow)
    : [];

  const today = new Date();
  const visibleUnpaid = summary
    ? summary.allInvoices
        .filter((i) => i.status !== 'paid' && i.status !== 'void' && Number(i.balance) > 0)
        .map(asInvoiceRow)
    : [];

  const upcoming = visibleUnpaid
    .filter((i) => ['sent', 'partially_paid', 'draft'].includes(i.status))
    .filter((i) => {
      const days = daysUntil(i.due_date, today);
      return days !== null && days >= 0 && days <= 60;
    })
    .sort((a, b) => (daysUntil(a.due_date, today) ?? 999) - (daysUntil(b.due_date, today) ?? 999));

  const bucketFor = (label: string, min: number, max: number): FinanceUpcomingBucket => {
    const invoices = upcoming.filter((i) => {
      const days = daysUntil(i.due_date, today);
      return days !== null && days >= min && days <= max;
    });
    return {
      label,
      count: invoices.length,
      total: invoices.reduce((sum, i) => sum + i.balance, 0),
      invoices: invoices.slice(0, 5),
    };
  };

  const overdueAging = summary
    ? summary.overdueInvoices.map((i) => ({
        ...i,
        days: Math.max(0, -(daysUntil(i.due_date, today) ?? 0)),
      }))
    : [];

  const agingBand = (label: string, min: number, max: number): FinanceAgingBand => {
    const rows = overdueAging.filter((i) => i.days >= min && i.days <= max);
    return {
      label,
      count: rows.length,
      total: rows.reduce((sum, i) => sum + Number(i.balance), 0),
    };
  };

  const mrrByClient = new Map<string, number>();
  for (const row of recurring) {
    if (!row.is_active || row.type !== 'incoming') continue;
    const name = row.client_name ?? row.description;
    const monthly =
      row.frequency === 'yearly' ? row.amount / 12 : row.frequency === 'one_off' ? 0 : row.amount;
    mrrByClient.set(name, (mrrByClient.get(name) ?? 0) + monthly);
  }

  const lastPaymentByClient = new Map<string, string>();
  for (const payment of summary?.allPayments ?? []) {
    const current = lastPaymentByClient.get(payment.customer_name);
    if (!current || payment.date > current)
      lastPaymentByClient.set(payment.customer_name, payment.date);
  }

  const invoiceStats = new Map<string, { total: number; onTime: number }>();
  for (const inv of summary?.allInvoices ?? []) {
    if (!inv.last_payment_date || !inv.due_date) continue;
    const stats = invoiceStats.get(inv.customer_name) ?? { total: 0, onTime: 0 };
    stats.total += 1;
    const paidDelay = Math.round(
      (new Date(`${inv.last_payment_date}T00:00:00`).getTime() -
        new Date(`${inv.due_date}T00:00:00`).getTime()) /
        86_400_000
    );
    if (paidDelay <= 7) stats.onTime += 1;
    invoiceStats.set(inv.customer_name, stats);
  }

  const clients = new Set<string>([
    ...Array.from(mrrByClient.keys()),
    ...(summary?.clientBalances.map((c) => c.customer_name) ?? []),
  ]);
  const clientHealth: FinanceClientHealthRow[] = Array.from(clients)
    .map((customerName) => {
      const stats = invoiceStats.get(customerName);
      const balance = summary?.clientBalances.find((c) => c.customer_name === customerName);
      return {
        customerName,
        mrr: Math.round(mrrByClient.get(customerName) ?? 0),
        outstanding: balance?.total_outstanding ?? 0,
        invoiceCount: balance?.invoice_count ?? 0,
        reliabilityPct:
          stats && stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : null,
        lastPaidAt: lastPaymentByClient.get(customerName) ?? null,
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding || b.mrr - a.mrr)
    .slice(0, 12);

  return {
    kpis,
    recentPayments,
    openInvoices,
    recurring,
    mrrCurrent: mrr.mrrCurrent,
    mrrNextMonth: mrr.mrrNextMonth,
    expectedThisMonth: mrr.expectedThisMonth,
    cashFlow: summary ? summary.netCashFlowByMonth.slice(-6) : [],
    upcomingBuckets: [
      bucketFor('This week', 0, 7),
      bucketFor('Next 30 days', 8, 30),
      bucketFor('30-60 days', 31, 60),
    ],
    clientHealth,
    agingBands: [
      agingBand('1-30d', 1, 30),
      agingBand('31-60d', 31, 60),
      agingBand('61-90d', 61, 90),
      agingBand('90d+', 91, Number.POSITIVE_INFINITY),
    ],
    totalOverdue: summary?.totalOverdue ?? 0,
    recurringSharePct,
    oneOffThisMonth: Math.max(0, mrr.expectedThisMonth - mrr.mrrCurrent),
    lastSyncedAt: summary?.lastSyncedAt ?? null,
    billableClients,
  };
}
