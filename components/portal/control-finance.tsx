'use client';

import { memo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { formatEUR } from '@/lib/currency';
import type {
  FinancePayload,
  FinancePaymentRow,
  FinanceInvoiceRow,
} from '@/app/actions/admin-control';

/* ======================================================================
   ControlFinance — MRR, payments, invoices
   ====================================================================== */

export function ControlFinance({ data }: { data: FinancePayload | undefined }) {
  if (!data || data.kpis.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm italic text-muted-foreground">
          No financial data yet. Sync Zoho to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Finance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pulse of MRR, invoices, and this month&apos;s expenses.
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="font-mono text-[11px] text-primary underline-offset-4 hover:underline"
        >
          Full reports →
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {k.label}
            </div>
            <div className="mt-2 text-[22px] font-semibold tabular-nums leading-none tracking-tight text-foreground">
              {k.value}
            </div>
            {k.sub ? (
              <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">{k.sub}</div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Two tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentPaymentsTable rows={data.recentPayments} />
        <OpenInvoicesTable rows={data.openInvoices} />
      </div>
    </div>
  );
}

/* ======================================================================
   RecentPaymentsTable
   ====================================================================== */

const RecentPaymentsTable = memo(function RecentPaymentsTable({
  rows,
}: {
  rows: FinancePaymentRow[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Recent payments</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Last {rows.length}
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-xs italic text-muted-foreground">No recent payments.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((p) => (
            <li
              key={p.id}
              className="grid items-center gap-3 px-4 py-2.5"
              style={{ gridTemplateColumns: '80px 1fr 110px' }}
            >
              <span className="font-mono text-[11px] text-muted-foreground">
                {format(new Date(p.date), 'dd MMM')}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">
                  {p.customer_name}
                </div>
                {p.reference ? (
                  <div className="truncate text-[10px] text-muted-foreground">{p.reference}</div>
                ) : null}
              </div>
              <span className="text-right font-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatEUR(p.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});

/* ======================================================================
   OpenInvoicesTable
   ====================================================================== */

const STATUS_TONE: Record<string, string> = {
  overdue: 'bg-red-500/10 text-red-700 dark:text-red-400',
  sent: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  draft: 'bg-muted text-muted-foreground',
  partially_paid: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

const OpenInvoicesTable = memo(function OpenInvoicesTable({ rows }: { rows: FinanceInvoiceRow[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Open invoices</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {rows.length}
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-xs italic text-muted-foreground">
          No open invoices. Nice.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((inv) => (
            <li
              key={inv.id}
              className="grid items-center gap-3 px-4 py-2.5"
              style={{ gridTemplateColumns: '1fr 90px 110px' }}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">
                  {inv.customer_name}
                </div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {inv.invoice_number}
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                  STATUS_TONE[inv.status] ?? 'bg-muted text-muted-foreground'
                )}
              >
                {inv.status.replace(/_/g, ' ')}
              </span>
              <span className="text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                {formatEUR(inv.balance)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
