'use client';

import { useMemo, useState, useTransition } from 'react';
import { format, parseISO, differenceInDays, formatDistanceToNow } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Banknote,
  Receipt,
  CreditCard,
  EyeOff,
  Eye,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Plus,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  hideInvoice,
  unhideInvoice,
  deleteInvoice,
  createExpense,
  updateExpense,
  deleteExpense,
  syncZohoFinancials,
  type FinancialSummary,
  type FinancialInvoice,
  type Expense,
  type MonthlyExpenseBreakdown,
  type RecurringClient,
} from '@/app/actions/financials';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

const EXPENSE_CATEGORIES = [
  'Software',
  'Hosting',
  'Office',
  'Marketing',
  'Travel',
  'Freelancers',
  'Equipment',
  'Subscriptions',
  'Salaries',
  'Other',
] as const;

// ─── Expense Modal ────────────────────────────────────────
function ExpenseModal({
  open,
  onClose,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
}) {
  const isEdit = !!expense;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      amount: formData.get('amount'),
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      description: (formData.get('description') as string) || null,
      ...(isEdit ? { id: expense!.id } : {}),
    };

    startTransition(async () => {
      const result = isEdit ? await updateExpense(data) : await createExpense(data);
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? 'Something went wrong');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Amount</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                €
              </span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={expense?.amount}
                required
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
            <select
              name="category"
              defaultValue={expense?.category ?? ''}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            >
              <option value="" disabled>
                Select category
              </option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Date</label>
            <input
              name="date"
              type="date"
              defaultValue={expense?.date ?? today}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              name="description"
              defaultValue={expense?.description ?? ''}
              rows={2}
              placeholder="What was this expense for?"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-qualia-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-qualia-600 disabled:opacity-60"
            >
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Expense Row ──────────────────────────────────────────
function ExpenseRow({ expense, onEdit }: { expense: Expense; onEdit: (expense: Expense) => void }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete this ${expense.category} expense of €${expense.amount}?`)) return;
    startTransition(async () => {
      await deleteExpense(expense.id);
    });
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30',
        isPending && 'opacity-50'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {format(parseISO(expense.date), 'MMM d, yyyy')}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {expense.category}
            </span>
          </div>
          {expense.description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{expense.description}</p>
          )}
        </div>
      </div>
      <div className="ml-4 flex items-center gap-2">
        <span className="shrink-0 text-sm font-semibold tabular-nums text-red-500">
          -{formatEURPrecise(Number(expense.amount))}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isPending && 'pointer-events-none opacity-50'
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onEdit(expense)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={handleDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
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

// ─── Category Colors ──────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Software: 'bg-blue-500',
  Hosting: 'bg-sky-500',
  Office: 'bg-amber-500',
  Marketing: 'bg-purple-500',
  Travel: 'bg-orange-500',
  Freelancers: 'bg-teal-500',
  Equipment: 'bg-slate-500',
  Subscriptions: 'bg-violet-500',
  Salaries: 'bg-rose-500',
  Other: 'bg-zinc-400',
};

// ─── Expense Breakdown Chart ──────────────────────────────
function ExpenseBreakdownChart({ data }: { data: MonthlyExpenseBreakdown[] }) {
  const recent = data.slice(-6);
  const allCategories = Array.from(
    new Set(recent.flatMap((m) => m.byCategory.map((c) => c.category)))
  );

  if (recent.length === 0) return null;

  if (recent.length === 1) {
    const month = recent[0];
    return (
      <div className="space-y-2">
        {month.byCategory.map((cat) => {
          const pct = month.total > 0 ? (cat.amount / month.total) * 100 : 0;
          const colorClass = CATEGORY_COLORS[cat.category] ?? 'bg-zinc-400';
          return (
            <div key={cat.category} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-[11px] text-muted-foreground">
                {cat.category}
              </span>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className={cn('h-2 rounded-full transition-all', colorClass)}
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {formatEUR(cat.amount)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {recent.map((m) => {
          const monthLabel = format(parseISO(m.month + '-01'), 'MMM');
          return (
            <div key={m.month} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-[10px] text-muted-foreground">{monthLabel}</span>
              <div className="flex h-4 flex-1 overflow-hidden rounded-sm">
                {m.byCategory.map((cat) => {
                  const pct = m.total > 0 ? (cat.amount / m.total) * 100 : 0;
                  const colorClass = CATEGORY_COLORS[cat.category] ?? 'bg-zinc-400';
                  return (
                    <div
                      key={cat.category}
                      title={`${cat.category}: ${formatEUR(cat.amount)}`}
                      className={cn('h-full transition-all', colorClass)}
                      style={{ width: `${pct}%` }}
                    />
                  );
                })}
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {formatEUR(m.total)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {allCategories.map((cat) => {
          const colorClass = CATEGORY_COLORS[cat] ?? 'bg-zinc-400';
          return (
            <div key={cat} className="flex items-center gap-1.5">
              <div className={cn('h-2 w-2 rounded-full', colorClass)} />
              <span className="text-[10px] text-muted-foreground">{cat}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Retainer Clients Section ─────────────────────────────
function RetainerClientsSection({ clients }: { clients: RecurringClient[] }) {
  if (clients.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <RefreshCw className="h-3.5 w-3.5 text-qualia-500" />
          Retainer Clients
        </h2>
      </div>
      <div className="divide-y divide-border">
        {clients.map((c) => (
          <div
            key={c.customer_name}
            className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{c.customer_name}</p>
              <p className="text-xs text-muted-foreground">
                {c.frequency} · Last:{' '}
                {c.last_invoice_date
                  ? format(parseISO(c.last_invoice_date), 'MMM d, yyyy')
                  : 'Unknown'}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-qualia-500">
              {formatEUR(c.monthly_total)}/mo
            </span>
          </div>
        ))}
      </div>
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

// ─── Date Range Filter ────────────────────────────────────

type DateFilterState = {
  type: 'all' | 'monthly' | 'yearly' | 'custom';
  year: number;
  month: number;
  customStart: string;
  customEnd: string;
};

function getDateRange(filter: DateFilterState): { start: string; end: string } | null {
  if (filter.type === 'all') return null;
  if (filter.type === 'monthly') {
    const y = filter.year;
    const m = filter.month;
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }
  if (filter.type === 'yearly') {
    return { start: `${filter.year}-01-01`, end: `${filter.year}-12-31` };
  }
  if (filter.type === 'custom' && filter.customStart && filter.customEnd) {
    return { start: filter.customStart, end: filter.customEnd };
  }
  return null;
}

function isInRange(date: string | null, range: { start: string; end: string } | null): boolean {
  if (!range) return true;
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateFilterState;
  onChange: (v: DateFilterState) => void;
}) {
  const types = [
    { key: 'all' as const, label: 'All Time' },
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'yearly' as const, label: 'Yearly' },
    { key: 'custom' as const, label: 'Custom' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-border bg-card p-0.5">
        {types.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange({ ...value, type: key })}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              value.type === key
                ? 'bg-qualia-500 text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {value.type === 'monthly' && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const prev =
                value.month === 0
                  ? { year: value.year - 1, month: 11 }
                  : { year: value.year, month: value.month - 1 };
              onChange({ ...value, ...prev });
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[120px] text-center text-sm font-medium text-foreground">
            {format(new Date(value.year, value.month), 'MMMM yyyy')}
          </span>
          <button
            onClick={() => {
              const next =
                value.month === 11
                  ? { year: value.year + 1, month: 0 }
                  : { year: value.year, month: value.month + 1 };
              onChange({ ...value, ...next });
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {value.type === 'yearly' && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange({ ...value, year: value.year - 1 })}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[60px] text-center text-sm font-medium text-foreground">
            {value.year}
          </span>
          <button
            onClick={() => onChange({ ...value, year: value.year + 1 })}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {value.type === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.customStart}
            onChange={(e) => onChange({ ...value, customStart: e.target.value })}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={value.customEnd}
            onChange={(e) => onChange({ ...value, customEnd: e.target.value })}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
        </div>
      )}
    </div>
  );
}

// ─── Sync Bar ────────────────────────────────────────────
function SyncBar({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [isSyncing, startSync] = useTransition();

  function handleSync() {
    startSync(async () => {
      const result = await syncZohoFinancials();
      if (result.success) {
        toast.success(`Synced ${result.invoiceCount} invoices and ${result.paymentCount} payments`);
      } else {
        toast.error(result.error ?? 'Sync failed');
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {lastSyncedAt && (
        <p className="text-[11px] text-muted-foreground/60">
          Data synced {formatDistanceToNow(parseISO(lastSyncedAt), { addSuffix: true })} via Zoho
          Invoice
        </p>
      )}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          isSyncing && 'pointer-events-none opacity-60'
        )}
      >
        <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────
export function FinancialDashboard({
  summary,
  expenses: initialExpenses,
}: {
  summary: FinancialSummary;
  expenses: Expense[];
}) {
  const [showHidden, setShowHidden] = useState(false);
  const [expenseModal, setExpenseModal] = useState<{
    open: boolean;
    expense?: Expense | null;
  }>({ open: false });

  const now = new Date();
  const [filter, setFilter] = useState<DateFilterState>({
    type: 'all',
    year: now.getFullYear(),
    month: now.getMonth(),
    customStart: '',
    customEnd: '',
  });

  const dateRange = useMemo(() => getDateRange(filter), [filter]);

  const filtered = useMemo(() => {
    const invoices = summary.allInvoices.filter((i) => isInRange(i.date, dateRange));
    const payments = summary.allPayments.filter((p) => isInRange(p.date, dateRange));
    const expenses = initialExpenses.filter((e) => isInRange(e.date, dateRange));

    const totalInvoiced = invoices
      .filter((i) => i.status !== 'void')
      .reduce((s, i) => s + Number(i.total), 0);
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);

    const unpaidInvoices = invoices.filter(
      (i) => i.status !== 'paid' && i.status !== 'void' && Number(i.balance) > 0
    );
    const totalOutstanding = unpaidInvoices.reduce((s, i) => s + Number(i.balance), 0);
    const overdueInvoices = unpaidInvoices.filter((i) => i.status === 'overdue');
    const totalOverdue = overdueInvoices.reduce((s, i) => s + Number(i.balance), 0);

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const net = totalCollected - totalExpenses;

    // Client balances from unpaid invoices
    const clientMap = new Map<string, { total_outstanding: number; invoice_count: number }>();
    for (const inv of unpaidInvoices) {
      const existing = clientMap.get(inv.customer_name) || {
        total_outstanding: 0,
        invoice_count: 0,
      };
      existing.total_outstanding += Number(inv.balance);
      existing.invoice_count += 1;
      clientMap.set(inv.customer_name, existing);
    }
    const clientBalances = Array.from(clientMap.entries())
      .map(([customer_name, data]) => ({ customer_name, ...data }))
      .sort((a, b) => b.total_outstanding - a.total_outstanding);

    return {
      invoices,
      payments,
      expenses,
      unpaidInvoices: [...unpaidInvoices].sort((a, b) => {
        const aOverdue = a.status === 'overdue' ? 1 : 0;
        const bOverdue = b.status === 'overdue' ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        return Number(b.balance) - Number(a.balance);
      }),
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalOverdue,
      overdueCount: overdueInvoices.length,
      totalExpenses,
      net,
      clientBalances,
    };
  }, [summary.allInvoices, summary.allPayments, initialExpenses, dateRange]);

  // Filter monthly expense breakdowns for chart
  const filteredMonthlyExpenses = useMemo(() => {
    if (!dateRange) return summary.monthlyExpenses;
    const startMonth = dateRange.start.substring(0, 7);
    const endMonth = dateRange.end.substring(0, 7);
    return summary.monthlyExpenses.filter((m) => m.month >= startMonth && m.month <= endMonth);
  }, [summary.monthlyExpenses, dateRange]);

  const collectionRate =
    filtered.totalInvoiced > 0
      ? Math.round((filtered.totalCollected / filtered.totalInvoiced) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Sync indicator + manual sync */}
      <SyncBar lastSyncedAt={summary.lastSyncedAt} />

      {/* Date Range Filter */}
      <DateRangeFilter value={filter} onChange={setFilter} />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Invoiced"
          value={formatEUR(filtered.totalInvoiced)}
          subtext={`${collectionRate}% collected`}
          icon={Receipt}
          accent="blue"
        />
        <KpiCard
          label="Collected"
          value={formatEUR(filtered.totalCollected)}
          subtext={`${filtered.payments.length} payment${filtered.payments.length !== 1 ? 's' : ''}`}
          icon={Banknote}
          accent="emerald"
        />
        <KpiCard
          label="Outstanding"
          value={formatEUR(filtered.totalOutstanding)}
          subtext={`${filtered.clientBalances.length} client${filtered.clientBalances.length !== 1 ? 's' : ''}`}
          icon={AlertTriangle}
          accent="amber"
        />
        <KpiCard
          label="Overdue"
          value={formatEUR(filtered.totalOverdue)}
          subtext={`${filtered.overdueCount} invoice${filtered.overdueCount !== 1 ? 's' : ''}`}
          icon={AlertTriangle}
          accent="red"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label="Expenses"
          value={formatEUR(filtered.totalExpenses)}
          subtext={`${filtered.expenses.length} expense${filtered.expenses.length !== 1 ? 's' : ''}`}
          icon={ShoppingCart}
          accent="red"
        />
        <KpiCard
          label="Net"
          value={formatEUR(filtered.net)}
          subtext={filtered.net >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
          icon={filtered.net >= 0 ? TrendingUp : TrendingDown}
          accent={filtered.net >= 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* ── Outstanding + Payments (two columns) ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Outstanding (merged overdue + unpaid + client breakdown) */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Receipt className="h-3.5 w-3.5 text-amber-500" />
              Outstanding
            </h2>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
              {formatEUR(filtered.totalOutstanding)}
            </span>
          </div>
          {filtered.unpaidInvoices.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {filter.type === 'all'
                ? 'All clear — no outstanding invoices'
                : 'No outstanding invoices in this period'}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {filtered.unpaidInvoices.map((inv) => (
                  <InvoiceRow
                    key={inv.zoho_id}
                    inv={{
                      ...inv,
                      urgency:
                        inv.status === 'overdue'
                          ? 'overdue'
                          : inv.due_date &&
                              differenceInDays(parseISO(inv.due_date), new Date()) <= 30
                            ? 'upcoming'
                            : 'draft',
                    }}
                  />
                ))}
              </div>
              {filtered.clientBalances.length > 1 && (
                <div className="border-t border-border px-5 py-4">
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    By Client
                  </p>
                  <div className="space-y-2">
                    {filtered.clientBalances.map((c) => {
                      const pct =
                        filtered.totalOutstanding > 0
                          ? (c.total_outstanding / filtered.totalOutstanding) * 100
                          : 0;
                      return (
                        <div key={c.customer_name} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 truncate text-xs text-foreground">
                            {c.customer_name}
                          </span>
                          <div className="h-1.5 flex-1 rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-amber-500/70"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right text-xs tabular-nums text-foreground">
                            {formatEUR(c.total_outstanding)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Payments */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Banknote className="h-3.5 w-3.5 text-emerald-500" />
              Payments
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
              {filtered.payments.length}
            </span>
          </div>
          {filtered.payments.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {filter.type === 'all' ? 'No payments recorded yet' : 'No payments in this period'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.payments.slice(0, 15).map((p) => (
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

      {/* ── Expenses ── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShoppingCart className="h-3.5 w-3.5 text-red-500" />
            Expenses
          </h2>
          <button
            onClick={() => setExpenseModal({ open: true, expense: null })}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Expense
          </button>
        </div>
        {filtered.expenses.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            {filter.type === 'all' ? 'No expenses recorded yet' : 'No expenses in this period'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onEdit={(e) => setExpenseModal({ open: true, expense: e })}
              />
            ))}
          </div>
        )}
      </div>

      <ExpenseModal
        open={expenseModal.open}
        onClose={() => setExpenseModal({ open: false })}
        expense={expenseModal.expense}
      />

      {/* ── Expense Breakdown Chart ── */}
      {filteredMonthlyExpenses.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Expense Breakdown</h2>
          <ExpenseBreakdownChart data={filteredMonthlyExpenses} />
        </div>
      )}

      {/* ── Retainer Clients ── */}
      <RetainerClientsSection clients={summary.recurringClients} />

      {/* ── Hidden Invoices (collapsible) ── */}
      {summary.hiddenInvoices.length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-muted/30"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              Hidden invoices ({summary.hiddenInvoices.length})
            </span>
            {showHidden ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showHidden && (
            <div className="divide-y divide-border border-t border-border">
              {summary.hiddenInvoices.map((inv) => (
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
