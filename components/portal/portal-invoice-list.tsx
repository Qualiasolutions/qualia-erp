'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import { Receipt, ExternalLink } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  issued_date: string;
  due_date: string | null;
  paid_date: string | null;
  description: string | null;
  file_url: string | null;
  project: { id: string; name: string } | null;
}

interface PortalInvoiceListProps {
  invoices: Invoice[];
}

function getInvoiceStatusColor(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20';
    case 'pending':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'overdue':
      return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20';
    case 'draft':
      return 'bg-muted text-muted-foreground border-border';
    case 'cancelled':
      return 'bg-muted text-muted-foreground/60 border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount);
}

export function PortalInvoiceList({ invoices }: PortalInvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-qualia-100 to-qualia-50 ring-1 ring-qualia-200 dark:from-qualia-500/20 dark:to-qualia-500/10 dark:ring-qualia-500/20">
          <Receipt className="h-10 w-10 text-qualia-600 dark:text-qualia-400" />
        </div>
        <h3 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
          No invoices yet
        </h3>
        <p className="max-w-sm text-center text-sm leading-relaxed text-muted-foreground/80">
          Your invoices will appear here once they are issued.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${fadeInClasses}`}>
      {invoices.map((invoice, index) => (
        <Card
          key={invoice.id}
          style={index < 6 ? getStaggerDelay(index) : undefined}
          className={cn(
            'rounded-xl border-border/40 transition-all duration-200 hover:border-border/60 hover:shadow-elevation-1',
            index < 6 && 'animate-fade-in-up fill-mode-both'
          )}
        >
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{invoice.invoice_number}</h3>
                    <Badge className={cn('text-xs', getInvoiceStatusColor(invoice.status))}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-foreground sm:hidden">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </p>
                </div>
                {invoice.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{invoice.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {invoice.project && <span>{invoice.project.name}</span>}
                  <span>Issued: {new Date(invoice.issued_date).toLocaleDateString()}</span>
                  {invoice.due_date && (
                    <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                  )}
                  {invoice.paid_date && (
                    <span className="text-green-600">
                      Paid: {new Date(invoice.paid_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </p>
                {invoice.file_url && (
                  <a
                    href={invoice.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-qualia-600 hover:text-qualia-700"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View PDF
                  </a>
                )}
              </div>
              {invoice.file_url && (
                <a
                  href={invoice.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-qualia-600 hover:text-qualia-700 sm:hidden"
                >
                  <ExternalLink className="h-3 w-3" />
                  View PDF
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
