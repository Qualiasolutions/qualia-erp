'use client';

import { memo, useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { toast } from 'sonner';

import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CircleDollarSign,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { formatEUR } from '@/lib/currency';
import {
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
} from '@/app/actions/recurring-payments';
import type {
  FinancePayload,
  FinancePaymentRow,
  FinanceInvoiceRow,
  FinanceRecurringRow,
  FinanceCashFlowMonth,
  FinanceUpcomingBucket,
  FinanceClientHealthRow,
  FinanceAgingBand,
} from '@/app/actions/admin-control';
import { FinanceTemplateInvoiceDialog } from './finance-template-invoice-dialog';

/* ======================================================================
   ControlFinance — MRR, recurring, payments, invoices
   ====================================================================== */

export function ControlFinance({ data }: { data: FinancePayload | undefined }) {
  if (!data || data.kpis.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No financial data yet"
        description="Add a recurring payment below or sync Zoho to start tracking revenue."
        compact
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Finance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            MRR, expected inflow, recurring contracts, and Zoho-synced payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FinanceTemplateInvoiceDialog clients={data.billableClients} />
          <Link
            href="/admin/reports"
            className="font-mono text-[11px] text-primary underline-offset-4 hover:underline"
          >
            Full reports →
          </Link>
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.7fr)]">
        <CashFlowChart rows={data.cashFlow} />
        <RecurringSplit
          recurringSharePct={data.recurringSharePct}
          mrr={data.mrrCurrent}
          oneOff={data.oneOffThisMonth}
          expected={data.expectedThisMonth}
          lastSyncedAt={data.lastSyncedAt}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
        <UpcomingInvoicesSection buckets={data.upcomingBuckets} />
        <OverdueAgingSection
          rows={data.openInvoices}
          aging={data.agingBands}
          total={data.totalOverdue}
        />
      </div>

      <ClientHealthSection rows={data.clientHealth} />

      <RecurringRevenueSection rows={data.recurring} />

      {(data.recentPayments.length > 0 || data.openInvoices.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentPaymentsTable rows={data.recentPayments} />
          <OpenInvoicesTable rows={data.openInvoices} />
        </div>
      )}
    </div>
  );
}

function CashFlowChart({ rows }: { rows: FinanceCashFlowMonth[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.revenue, r.expenses)));
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">Cash rhythm</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Last 6 months
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs italic text-muted-foreground">
          Cash-flow history will appear after Zoho sync.
        </p>
      ) : (
        <div className="grid h-56 grid-cols-6 items-end gap-3">
          {rows.map((row) => {
            const revenueHeight = Math.max(6, (row.revenue / max) * 100);
            const expenseHeight = Math.max(3, (row.expenses / max) * 100);
            return (
              <div key={row.month} className="flex h-full min-w-0 flex-col justify-end gap-2">
                <div className="flex flex-1 items-end gap-1.5">
                  <div
                    className="w-full rounded-t-md bg-primary/80"
                    style={{ height: `${revenueHeight}%` }}
                    title={`Revenue ${formatEUR(row.revenue)}`}
                  />
                  <div
                    className="w-full rounded-t-md bg-red-500/35"
                    style={{ height: `${expenseHeight}%` }}
                    title={`Expenses ${formatEUR(row.expenses)}`}
                  />
                </div>
                <div className="min-w-0 text-center">
                  <div
                    className={cn(
                      'font-mono text-[10px] font-semibold tabular-nums',
                      row.net >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatEUR(row.net)}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10px] uppercase text-muted-foreground">
                    {format(new Date(`${row.month}-01T00:00:00`), 'MMM')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RecurringSplit({
  recurringSharePct,
  mrr,
  oneOff,
  expected,
  lastSyncedAt,
}: {
  recurringSharePct: number | null;
  mrr: number;
  oneOff: number;
  expected: number;
  lastSyncedAt: string | null;
}) {
  const pct = Math.min(100, Math.max(0, recurringSharePct ?? 0));
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center gap-2">
        <Wallet className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold tracking-tight">Revenue floor</h3>
      </header>
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        Recurring share
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
          {recurringSharePct ?? 0}%
        </span>
        <span className="pb-1 text-xs text-muted-foreground">of expected month</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-muted/40 p-3">
          <dt className="text-muted-foreground">MRR base</dt>
          <dd className="mt-1 font-mono font-semibold tabular-nums">{formatEUR(mrr)}</dd>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <dt className="text-muted-foreground">Variable</dt>
          <dd className="mt-1 font-mono font-semibold tabular-nums">{formatEUR(oneOff)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Expected month: {formatEUR(expected)}
        {lastSyncedAt
          ? ` · synced ${formatDistanceToNowStrict(new Date(lastSyncedAt), { addSuffix: true })}`
          : ''}
      </p>
    </section>
  );
}

function UpcomingInvoicesSection({ buckets }: { buckets: FinanceUpcomingBucket[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">Upcoming invoices</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          60-day view
        </span>
      </header>
      <div className="divide-y divide-border">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-foreground">{bucket.label}</span>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                {bucket.count} · {formatEUR(bucket.total)}
              </span>
            </div>
            {bucket.invoices.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No invoices in this window.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {bucket.invoices.map((invoice) => (
                  <InvoiceRhythmRow key={invoice.id} invoice={invoice} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function InvoiceRhythmRow({ invoice }: { invoice: FinanceInvoiceRow }) {
  const days = invoice.due_date
    ? Math.round(
        (new Date(`${invoice.due_date}T00:00:00`).getTime() -
          new Date(new Date().toDateString()).getTime()) /
          86_400_000
      )
    : null;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-muted/35 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-foreground">{invoice.customer_name}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">
          {invoice.invoice_number}
          {days !== null ? ` · ${days === 0 ? 'due today' : `in ${days}d`}` : ''}
        </div>
      </div>
      <span className="font-mono text-xs font-semibold tabular-nums">
        {formatEUR(invoice.balance)}
      </span>
    </li>
  );
}

function OverdueAgingSection({
  rows,
  aging,
  total,
}: {
  rows: FinanceInvoiceRow[];
  aging: FinanceAgingBand[];
  total: number;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">Overdue</h3>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums">{formatEUR(total)}</span>
      </header>
      <div className="grid grid-cols-2 gap-2">
        {aging.map((band) => (
          <div key={band.label} className="rounded-lg bg-muted/40 p-3">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">
              {band.label}
            </div>
            <div className="mt-1 font-mono text-sm font-semibold tabular-nums">
              {formatEUR(band.total)}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {band.count} invoice{band.count === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>
      {rows.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1.5">
          {rows.slice(0, 4).map((invoice) => (
            <InvoiceRhythmRow key={invoice.id} invoice={invoice} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs italic text-muted-foreground">Nothing overdue.</p>
      )}
    </section>
  );
}

function ClientHealthSection({ rows }: { rows: FinanceClientHealthRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="size-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">Client payment health</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          MRR · outstanding · reliability
        </span>
      </header>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.customerName}
            className="grid grid-cols-1 items-center gap-2 px-4 py-3 text-xs md:grid-cols-[1fr_110px_120px_120px_120px]"
          >
            <span className="truncate font-medium text-foreground">{row.customerName}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatEUR(row.mrr)}
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {formatEUR(row.outstanding)}
            </span>
            <ReliabilityBadge value={row.reliabilityPct} />
            <span className="font-mono text-[10px] text-muted-foreground">
              {row.lastPaidAt
                ? formatDistanceToNowStrict(new Date(row.lastPaidAt), { addSuffix: true })
                : 'no payment'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReliabilityBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="w-fit rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
        n/a
      </span>
    );
  }
  const tone =
    value >= 90
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : value >= 70
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : 'bg-red-500/10 text-red-700 dark:text-red-400';
  return (
    <span
      className={cn(
        'w-fit rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums',
        tone
      )}
    >
      {value}%
    </span>
  );
}

/* ======================================================================
   RecurringRevenueSection — table + add/edit/delete
   ====================================================================== */

function RecurringRevenueSection({ rows }: { rows: FinanceRecurringRow[] }) {
  const [editing, setEditing] = useState<FinanceRecurringRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FinanceRecurringRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sorted = useMemo(
    () =>
      rows.slice().sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        if (a.frequency !== b.frequency) {
          const order: Record<FinanceRecurringRow['frequency'], number> = {
            monthly: 0,
            yearly: 1,
            one_off: 2,
          };
          return order[a.frequency] - order[b.frequency];
        }
        return b.amount - a.amount;
      }),
    [rows]
  );

  function handleDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    startTransition(async () => {
      const r = await deleteRecurringPayment(target.id);
      if (!r.success) {
        toast.error(r.error || 'Failed to delete');
        return;
      }
      toast.success(`Removed "${target.description}"`);
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Repeat className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Recurring revenue</h3>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {rows.length}
          </Badge>
        </div>
        <Button size="sm" className="h-8 gap-1.5 rounded-lg" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </header>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No recurring payments yet"
          description="Add monthly or yearly contracts to track MRR."
          compact
          minimal
        />
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map((r) => (
            <li
              key={r.id}
              className={cn(
                'group grid items-center gap-3 px-4 py-2.5',
                !r.is_active && 'opacity-50'
              )}
              style={{ gridTemplateColumns: '1fr 90px 110px 110px 70px' }}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">{r.description}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {r.client_name ?? 'No client'}
                  {r.notes ? ` · ${r.notes.slice(0, 60)}${r.notes.length > 60 ? '…' : ''}` : ''}
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] capitalize',
                  r.frequency === 'monthly' && 'border-primary/30 bg-primary/10 text-primary',
                  r.frequency === 'yearly' &&
                    'border-violet-500/30 bg-violet-500/10 text-violet-500',
                  r.frequency === 'one_off' &&
                    'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
              >
                {r.frequency.replace('_', ' ')}
              </Badge>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {r.start_date ? format(new Date(r.start_date), 'MMM yy') : '—'}
                {r.end_date ? ` → ${format(new Date(r.end_date), 'MMM yy')}` : ''}
              </span>
              <span
                className={cn(
                  'text-right font-mono text-xs font-semibold tabular-nums',
                  r.type === 'incoming' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-500'
                )}
              >
                {r.type === 'outgoing' ? '−' : ''}
                {formatEUR(r.amount)}
              </span>
              <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditing(r)}
                  aria-label="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  onClick={() => setPendingDelete(r)}
                  aria-label="Delete"
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RecurringEditDialog
        open={creating || !!editing}
        existing={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this recurring payment?"
        description={
          pendingDelete ? `"${pendingDelete.description}" will be permanently deleted.` : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </section>
  );
}

/* ======================================================================
   RecurringEditDialog — create / edit form
   ====================================================================== */

function RecurringEditDialog({
  open,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing: FinanceRecurringRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(existing?.description ?? '');
  const [type, setType] = useState<'incoming' | 'outgoing'>(existing?.type ?? 'incoming');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'one_off'>(
    existing?.frequency ?? 'monthly'
  );
  const [amount, setAmount] = useState<string>(existing?.amount.toString() ?? '');
  const [startDate, setStartDate] = useState(existing?.start_date ?? '');
  const [endDate, setEndDate] = useState(existing?.end_date ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [isPending, startTransition] = useTransition();

  // Reset when opening for a new row
  if (open && !existing && description !== '' && !isPending) {
    // no-op — preserve user input across re-renders within same open
  }

  function handleSubmit() {
    const num = Number(amount);
    if (!description.trim() || !Number.isFinite(num) || num < 0) {
      toast.error('Description and a non-negative amount are required');
      return;
    }
    startTransition(async () => {
      const payload = {
        description: description.trim(),
        type,
        frequency,
        amount: num,
        currency: existing?.currency ?? 'EUR',
        start_date: startDate || null,
        end_date: endDate || null,
        notes: notes.trim() || null,
        client_id: existing?.client_id ?? null,
        category: existing?.category ?? null,
      };
      const r = existing
        ? await updateRecurringPayment(existing.id, payload)
        : await createRecurringPayment(payload);
      if (!r.success) {
        toast.error(r.error || 'Failed to save');
        return;
      }
      toast.success(existing ? 'Updated' : 'Added');
      onSaved();
      handleClose();
    });
  }

  function handleClose() {
    setDescription('');
    setType('incoming');
    setFrequency('monthly');
    setAmount('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit recurring payment' : 'Add recurring payment'}</DialogTitle>
          <DialogDescription>Used for MRR + expected inflow on the Finance tab.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rp-desc">Description</Label>
            <Input
              id="rp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. AI Boss Brainz — monthly retainer"
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rp-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'incoming' | 'outgoing')}
                disabled={isPending}
              >
                <SelectTrigger id="rp-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-freq">Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as 'monthly' | 'yearly' | 'one_off')}
                disabled={isPending}
              >
                <SelectTrigger id="rp-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="one_off">One-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-amount">Amount (EUR)</Label>
            <Input
              id="rp-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rp-start">Start date</Label>
              <Input
                id="rp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-end">End date (optional)</Label>
              <Input
                id="rp-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-notes">Notes</Label>
            <Textarea
              id="rp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !description.trim() || !amount}>
              {existing ? 'Save changes' : 'Add'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
        <EmptyState
          icon={Receipt}
          title="No recent payments"
          description="Payment history will appear here."
          compact
          minimal
        />
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
        <EmptyState
          icon={Receipt}
          title="No open invoices"
          description="All invoices are settled."
          compact
          minimal
        />
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
