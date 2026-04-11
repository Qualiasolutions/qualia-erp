'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  description?: string | null;
  file_url?: string | null;
  project: { id: string; name: string } | null;
}

interface PortalInvoiceListProps {
  invoices: Invoice[];
}

function getInvoiceStatusColor(status: string) {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-transparent';
    case 'pending':
    case 'sent':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-transparent';
    case 'overdue':
      return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-transparent';
    case 'draft':
      return 'bg-muted text-muted-foreground border-transparent';
    case 'cancelled':
      return 'bg-muted text-muted-foreground border-transparent';
    default:
      return 'bg-muted text-muted-foreground border-transparent';
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
      <div className="flex min-h-[320px] flex-col items-center justify-center px-4">
        <Receipt className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="mt-4 text-base font-medium text-foreground">No invoices yet</h3>
        <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
          Your invoices will appear here once your first project milestone is complete.
        </p>
        <a
          href="mailto:support@qualiasolutions.net"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Contact support
        </a>
      </div>
    );
  }

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border">
      {/* Table header */}
      <div className="hidden gap-4 bg-muted/30 px-5 py-3 sm:grid sm:grid-cols-[1fr_120px_120px_100px_80px]">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Invoice
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Date
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Due
        </span>
        <span className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Amount
        </span>
        <span className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </span>
      </div>

      {/* Invoice rows */}
      {invoices.map((invoice, index) => (
        <div
          key={invoice.id}
          className={cn(
            'border-b border-border/50 px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/20',
            'animate-fade-in fill-mode-both'
          )}
          style={index < 10 ? { animationDelay: `${index * 30}ms` } : undefined}
        >
          {/* Desktop layout */}
          <div className="hidden items-center gap-4 sm:grid sm:grid-cols-[1fr_120px_120px_100px_80px]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {invoice.invoice_number}
                </span>
                {invoice.file_url && (
                  <a
                    href={invoice.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
                    aria-label={`View PDF for ${invoice.invoice_number}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {invoice.description && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {invoice.description}
                </p>
              )}
              {invoice.project && (
                <p className="text-xs text-muted-foreground/70">{invoice.project.name}</p>
              )}
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">
              {new Date(invoice.issued_date).toLocaleDateString()}
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '--'}
            </span>
            <span className="text-right text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(invoice.amount, invoice.currency)}
            </span>
            <div className="flex justify-end">
              <Badge
                className={cn('text-[10px] capitalize', getInvoiceStatusColor(invoice.status))}
              >
                {invoice.status}
              </Badge>
            </div>
          </div>

          {/* Mobile layout */}
          <div className="space-y-2 sm:hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {invoice.invoice_number}
                </span>
                <Badge
                  className={cn(
                    'shrink-0 text-[10px] capitalize',
                    getInvoiceStatusColor(invoice.status)
                  )}
                >
                  {invoice.status}
                </Badge>
              </div>
              <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
                {formatCurrency(invoice.amount, invoice.currency)}
              </span>
            </div>
            {invoice.description && (
              <p className="text-xs text-muted-foreground">{invoice.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {invoice.project && <span>{invoice.project.name}</span>}
              <span>Issued: {new Date(invoice.issued_date).toLocaleDateString()}</span>
              {invoice.due_date && (
                <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
              )}
              {invoice.paid_date && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Paid: {new Date(invoice.paid_date).toLocaleDateString()}
                </span>
              )}
            </div>
            {invoice.file_url && (
              <a
                href={invoice.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
              >
                <ExternalLink className="h-3 w-3" />
                View PDF
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
