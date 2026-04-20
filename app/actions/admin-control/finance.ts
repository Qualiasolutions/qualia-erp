'use server';

import { getFinancialSummary } from '@/app/actions/financials';

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

export type FinancePayload = {
  kpis: FinanceKpi[];
  recentPayments: FinancePaymentRow[];
  openInvoices: FinanceInvoiceRow[];
};

export async function loadFinanceTab(): Promise<FinancePayload> {
  const summary = await getFinancialSummary();
  if (!summary) {
    return { kpis: [], recentPayments: [], openInvoices: [] };
  }

  const fmt = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  const deltaThisMonth = summary.thisMonthCollected - summary.lastMonthCollected;
  const deltaSign = deltaThisMonth >= 0 ? '+' : '';

  const kpis: FinanceKpi[] = [
    {
      label: 'This month',
      value: fmt.format(summary.thisMonthCollected),
      sub: `${deltaSign}${fmt.format(Math.round(deltaThisMonth))} vs last`,
    },
    {
      label: 'Outstanding',
      value: fmt.format(summary.totalOutstanding),
      sub: `${summary.overdueInvoices.length} overdue`,
    },
    {
      label: 'Collected (total)',
      value: fmt.format(summary.totalCollected),
      sub: `${summary.clientBalances.length} clients with balance`,
    },
    {
      label: 'Expenses this month',
      value: fmt.format(summary.totalExpensesThisMonth),
      sub: null,
    },
  ];

  const recentPayments: FinancePaymentRow[] = summary.allPayments.slice(0, 10).map((p) => ({
    id: p.zoho_id,
    date: p.date,
    customer_name: p.customer_name,
    amount: Number(p.amount),
    reference: p.payment_number ?? p.description ?? null,
  }));

  const openInvoices: FinanceInvoiceRow[] = summary.overdueInvoices.slice(0, 20).map((i) => ({
    id: i.zoho_id,
    date: i.date,
    customer_name: i.customer_name,
    invoice_number: i.invoice_number,
    total: Number(i.total),
    balance: Number(i.balance),
    status: i.status,
    due_date: i.due_date ?? null,
  }));

  return { kpis, recentPayments, openInvoices };
}
