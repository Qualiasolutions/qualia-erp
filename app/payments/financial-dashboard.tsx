'use client';

import { useMemo, useState, useTransition } from 'react';
import { format, parseISO, differenceInDays, formatDistanceToNow, addDays } from 'date-fns';
import {
  TrendingUp,
  AlertTriangle,
  Banknote,
  Receipt,
  CreditCard,
  Building2,
  EyeOff,
  Eye,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  hideInvoice,
  unhideInvoice,
  deleteInvoice,
  type FinancialSummary,
  type FinancialInvoice,
} from '@/app/actions/financials';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatEUR(amount: number) {
  return new Intl.NumberFormat('en-CY', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatEURPrecise(amount: number) {
  return new Intl.NumberFormat('en-CY', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function paymentModeLabel(mode: string): string {
  const map: Record<string, string> = {
    banktransfer: 'Bank Transfer',
    'Bank Transfer': 'Bank Transfer',
    Cash: 'Cash',
    creditcard: 'Card',
    CreditCard: 'Card',
  };
  return map[mode] || mode || 'Other';
}

// ─── KPI Card ─────────────────────────────────────────────
function KpiCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  accent: 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const accentClasses = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg',
            accentClasses[accent]
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}

// ─── Revenue Bar ──────────────────────────────────────────
function RevenueBar({ data }: { data: { month: string; amount: number }[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="flex items-end gap-2" style={{ height: 120 }}>
      {data.map((d) => {
        const height = Math.max((d.amount / maxAmount) * 100, 4);
        const monthLabel = format(parseISO(d.month + '-01'), 'MMM');
        return (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">
              {formatEUR(d.amount)}
            </span>
            <div
              className="w-full rounded-t-md bg-emerald-500/80 transition-all"
              style={{ height: `${height}%` }}
            />
            <span className="text-[10px] text-muted-foreground">{monthLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Invoice Action Menu ──────────────────────────────────
function InvoiceActions({ invoice, isHidden }: { invoice: FinancialInvoice; isHidden?: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          isPending && 'pointer-events-none opacity-50'
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {isHidden ? (
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                await unhideInvoice(invoice.zoho_id);
              })
            }
          >
            <Eye className="mr-2 h-3.5 w-3.5" />
            Show
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                await hideInvoice(invoice.zoho_id);
              })
            }
          >
            <EyeOff className="mr-2 h-3.5 w-3.5" />
            Hide
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-red-500 focus:text-red-500"
          onClick={() =>
            startTransition(async () => {
              await deleteInvoice(invoice.zoho_id);
            })
          }
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Invoice Row ──────────────────────────────────────────
function InvoiceRow({
  inv,
  isHidden,
}: {
  inv: FinancialInvoice & { urgency?: 'overdue' | 'draft' | 'upcoming' };
  isHidden?: boolean;
}) {
  const daysOverdue = inv.due_date ? differenceInDays(new Date(), parseISO(inv.due_date)) : 0;
  const urgency = inv.urgency || (inv.status === 'overdue' ? 'overdue' : 'draft');

  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30',
        isHidden && 'opacity-60'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{inv.customer_name}</span>
          {urgency === 'overdue' ? (
            <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">
              {daysOverdue}d overdue
            </span>
          ) : urgency === 'upcoming' ? (
            <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500">
              Due {daysOverdue <= 0 ? `in ${Math.abs(daysOverdue)}d` : 'today'}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Draft
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {inv.invoice_number}
          {inv.due_date && ` · Due ${format(parseISO(inv.due_date), 'MMM d, yyyy')}`}
        </p>
      </div>
      <div className="ml-4 flex items-center gap-2">
        <span
          className={cn(
            'shrink-0 text-sm font-semibold tabular-nums',
            urgency === 'overdue'
              ? 'text-red-500'
              : urgency === 'upcoming'
                ? 'text-blue-500'
                : 'text-amber-500'
          )}
        >
          {formatEURPrecise(Number(inv.balance))}
        </span>
        <InvoiceActions invoice={inv} isHidden={isHidden} />
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────
export function FinancialDashboard({ summary }: { summary: FinancialSummary }) {
  const [showHidden, setShowHidden] = useState(false);

  const {
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    totalOverdue,
    overdueCount,
    thisMonthCollected,
    lastMonthCollected,
    recentPayments,
    overdueInvoices,
    draftInvoices,
    hiddenInvoices,
    clientBalances,
    monthlyRevenue,
    lastSyncedAt,
  } = summary;

  const monthChange =
    lastMonthCollected > 0
      ? ((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100
      : thisMonthCollected > 0
        ? 100
        : 0;

  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Split drafts into "upcoming" (due within 30 days) and remaining drafts
  const now = new Date();
  const thirtyDaysOut = addDays(now, 30);

  const upcomingInvoices = useMemo(() => {
    return draftInvoices
      .filter((i) => {
        if (!i.due_date) return false;
        const due = parseISO(i.due_date);
        return due <= thirtyDaysOut && due >= now;
      })
      .map((i) => ({ ...i, urgency: 'upcoming' as const }));
  }, [draftInvoices, now, thirtyDaysOut]);

  const upcomingIds = new Set(upcomingInvoices.map((i) => i.zoho_id));

  const remainingDrafts = useMemo(() => {
    return draftInvoices
      .filter((i) => !upcomingIds.has(i.zoho_id))
      .map((i) => ({ ...i, urgency: 'draft' as const }));
  }, [draftInvoices, upcomingIds]);

  const needsAttention = useMemo(() => {
    const items = [
      ...overdueInvoices.map((i) => ({ ...i, urgency: 'overdue' as const })),
      ...remainingDrafts,
    ];
    return items.sort((a, b) => Number(b.balance) - Number(a.balance));
  }, [overdueInvoices, remainingDrafts]);

  const upcomingTotal = upcomingInvoices.reduce((s, i) => s + Number(i.balance), 0);

  return (
    <div className="space-y-6">
      {/* Sync indicator */}
      {lastSyncedAt && (
        <p className="text-[11px] text-muted-foreground/60">
          Data synced {formatDistanceToNow(parseISO(lastSyncedAt), { addSuffix: true })} via Zoho
          Invoice
        </p>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Collected"
          value={formatEUR(totalCollected)}
          subtext={`${collectionRate}% collection rate`}
          icon={Banknote}
          accent="emerald"
        />
        <KpiCard
          label="This Month"
          value={formatEUR(thisMonthCollected)}
          subtext={
            monthChange !== 0
              ? `${monthChange > 0 ? '+' : ''}${Math.round(monthChange)}% vs last month`
              : 'No comparison data'
          }
          icon={TrendingUp}
          accent="blue"
        />
        <KpiCard
          label="Outstanding"
          value={formatEUR(totalOutstanding)}
          subtext={`Across ${clientBalances.length} clients`}
          icon={Receipt}
          accent="amber"
        />
        <KpiCard
          label="Overdue"
          value={formatEUR(totalOverdue)}
          subtext={`${overdueCount} invoice${overdueCount !== 1 ? 's' : ''} past due`}
          icon={AlertTriangle}
          accent="red"
        />
      </div>

      {/* ── Monthly Revenue ── */}
      {monthlyRevenue.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Monthly Revenue</h2>
          <RevenueBar data={monthlyRevenue} />
        </div>
      )}

      {/* ── Upcoming Payments ── */}
      {upcomingInvoices.length > 0 && (
        <div className="rounded-xl border border-blue-500/20 bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="h-3.5 w-3.5 text-blue-500" />
              Upcoming (next 30 days)
            </h2>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
              {formatEUR(upcomingTotal)}
            </span>
          </div>
          <div className="divide-y divide-border">
            {upcomingInvoices.map((inv) => (
              <InvoiceRow key={inv.zoho_id} inv={inv} />
            ))}
          </div>
        </div>
      )}

      {/* ── Two Column: Needs Attention + Recent Payments ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs Attention */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Needs Attention
            </h2>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
              {needsAttention.length}
            </span>
          </div>
          {needsAttention.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              All clear — no outstanding invoices
            </div>
          ) : (
            <div className="divide-y divide-border">
              {needsAttention.map((inv) => (
                <InvoiceRow key={inv.zoho_id} inv={inv} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Banknote className="h-3.5 w-3.5 text-emerald-500" />
              Recent Payments
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
              {recentPayments.length}
            </span>
          </div>
          {recentPayments.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No payments recorded yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentPayments.map((p) => (
                <div
                  key={p.zoho_id}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {p.customer_name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(parseISO(p.date), 'MMM d')}</span>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {paymentModeLabel(p.payment_mode)}
                      </span>
                      {p.invoice_numbers && (
                        <>
                          <span className="text-border">·</span>
                          <span>{p.invoice_numbers}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="ml-4 shrink-0 text-sm font-semibold tabular-nums text-emerald-500">
                    +{formatEURPrecise(Number(p.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Client Balances ── */}
      {clientBalances.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Client Balances
            </h2>
            <span className="text-xs text-muted-foreground">
              {formatEUR(totalOutstanding)} total outstanding
            </span>
          </div>
          <div className="divide-y divide-border">
            {clientBalances.map((c) => {
              const pct = totalOutstanding > 0 ? (c.total_outstanding / totalOutstanding) * 100 : 0;
              return (
                <div
                  key={c.customer_name}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.customer_name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.invoice_count} invoice{c.invoice_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {/* Mini bar */}
                  <div className="hidden w-24 sm:block">
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-amber-500/70"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatEURPrecise(c.total_outstanding)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Hidden Invoices (collapsible) ── */}
      {hiddenInvoices.length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-muted/30"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              Hidden invoices ({hiddenInvoices.length})
            </span>
            {showHidden ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showHidden && (
            <div className="divide-y divide-border border-t border-border">
              {hiddenInvoices.map((inv) => (
                <InvoiceRow
                  key={inv.zoho_id}
                  inv={{ ...inv, urgency: inv.status === 'overdue' ? 'overdue' : 'draft' }}
                  isHidden
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
