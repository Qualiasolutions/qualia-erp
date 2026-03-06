'use client';

import { Card, CardContent } from '@/components/ui/card';
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
      color: outstanding > 0 ? 'text-red-600 bg-red-500/10' : 'text-green-600 bg-green-500/10',
    },
    {
      label: 'Total Paid',
      value: formatCurrency(paid, currency),
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-500/10',
    },
    {
      label: 'Next Due',
      value: nextDue ? new Date(nextDue).toLocaleDateString() : 'None',
      icon: Clock,
      color: 'text-blue-600 bg-blue-500/10',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card, index) => (
        <Card key={card.label} className="shadow-elevation-1" style={getStaggerDelay(index)}>
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                card.color
              )}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
