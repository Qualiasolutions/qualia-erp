'use client';

import { DollarSign, Clock, CheckCircle2 } from 'lucide-react';
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
      iconColor: outstanding > 0 ? 'text-rose-500' : 'text-emerald-500',
    },
    {
      label: 'Total Paid',
      value: formatCurrency(paid, currency),
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Next Due',
      value: nextDue ? new Date(nextDue).toLocaleDateString() : 'None',
      icon: Clock,
      iconColor: 'text-blue-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="relative animate-fade-in rounded-xl border border-border bg-card p-5 fill-mode-both"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <card.icon className={cn('h-4 w-4 text-muted-foreground/20', card.iconColor)} />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
