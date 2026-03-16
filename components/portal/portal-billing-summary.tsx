'use client';

import { DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStaggerDelay } from '@/lib/transitions';

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
  }).format(amount);
}

export function PortalBillingSummary({ invoices }: PortalBillingSummaryProps) {
  const outstanding = invoices
    .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const paid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  // Find next due date
  const pendingInvoices = invoices
    .filter((inv) => (inv.status === 'pending' || inv.status === 'overdue') && inv.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  const nextDue = pendingInvoices[0]?.due_date;

  const currency = invoices[0]?.currency || 'EUR';

  const cards = [
    {
      label: 'Outstanding',
      value: formatCurrency(outstanding, currency),
      icon: DollarSign,
      iconColor: outstanding > 0 ? 'text-rose-500' : 'text-green-500',
      iconBg:
        outstanding > 0
          ? 'bg-rose-500/8 dark:bg-rose-500/15'
          : 'bg-green-500/8 dark:bg-green-500/15',
    },
    {
      label: 'Total Paid',
      value: formatCurrency(paid, currency),
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/8 dark:bg-green-500/15',
    },
    {
      label: 'Next Due',
      value: nextDue ? new Date(nextDue).toLocaleDateString() : 'None',
      icon: Clock,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/8 dark:bg-blue-500/15',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="flex animate-fade-in-up items-center gap-4 rounded-xl border border-border bg-card px-5 py-5 transition-all duration-200 fill-mode-both hover:border-border/60 hover:shadow-elevation-1"
          style={getStaggerDelay(index)}
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              card.iconBg
            )}
          >
            <card.icon className={cn('h-5 w-5', card.iconColor)} />
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums text-foreground">{card.value}</p>
            <p className="text-[12px] text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
