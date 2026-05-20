'use client';

import { cn } from '@/lib/utils';

interface Invoice {
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
}

interface PortalBillingSummaryProps {
  invoices: Invoice[];
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const OUTSTANDING_STATUSES = new Set(['pending', 'overdue', 'sent', 'draft', 'partially_paid']);

export function PortalBillingSummary({ invoices }: PortalBillingSummaryProps) {
  const outstanding = invoices
    .filter((inv) => OUTSTANDING_STATUSES.has(inv.status))
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const paid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const pendingInvoices = invoices
    .filter((inv) => OUTSTANDING_STATUSES.has(inv.status) && inv.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  const nextDue = pendingInvoices[0]?.due_date;

  const currency = invoices[0]?.currency || 'EUR';

  const tiles: Array<{
    label: string;
    value: string;
    hint?: string;
    tone: 'default' | 'warn' | 'good';
  }> = [
    {
      label: 'Outstanding',
      value: formatCurrency(outstanding, currency),
      hint: outstanding === 0 ? 'nothing due' : `${pendingInvoices.length} unpaid`,
      tone: outstanding > 0 ? 'warn' : 'good',
    },
    {
      label: 'Total paid',
      value: formatCurrency(paid, currency),
      hint: 'lifetime',
      tone: 'default',
    },
    {
      label: 'Next due',
      value: nextDue
        ? new Date(nextDue).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })
        : 'None',
      hint: nextDue
        ? new Date(nextDue).toLocaleDateString('en-GB', { weekday: 'short' })
        : 'all clear',
      tone: 'default',
    },
  ];

  return (
    <div className="grid grid-cols-1 divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {tiles.map((tile) => (
        <div key={tile.label} className="px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {tile.label}
          </p>
          <p
            className={cn(
              'mt-2 text-2xl font-semibold tabular-nums leading-none tracking-tight',
              tile.tone === 'warn' && 'text-amber-600 dark:text-amber-400',
              tile.tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
              tile.tone === 'default' && 'text-foreground'
            )}
          >
            {tile.value}
          </p>
          {tile.hint ? (
            <p className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground/70">
              {tile.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
