'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { toast } from 'sonner';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar as CalendarIcon,
  ChevronDown,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
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
import type { FinancePayload, FinanceRecurringRow } from '@/app/actions/admin-control';
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

  const lastSyncedLabel = data.lastSyncedAt
    ? `Synced ${formatDistanceToNowStrict(new Date(data.lastSyncedAt), { addSuffix: true })}`
    : 'Not synced yet';

  const monthlyRetainers = data.recurring.filter(
    (r) => r.type === 'incoming' && r.frequency === 'monthly'
  );
  const monthlyExpenses = data.recurring.filter(
    (r) => r.type === 'outgoing' && r.frequency === 'monthly'
  );
  const otherRecurring = data.recurring.filter((r) => r.frequency !== 'monthly');

  return (
    <div className="flex flex-col gap-7">
      {/* Header — eyebrow + display heading + actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="inline-block h-px w-6 bg-primary/60" aria-hidden />
            <span>Finance</span>
          </div>
          <h2 className="mt-2 text-[clamp(1.5rem,1rem+1.4vw,1.875rem)] font-semibold leading-tight tracking-tight text-foreground">
            Monthly cashflow
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {lastSyncedLabel}. Retainers in, expenses out, what lands in the bank.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FinanceTemplateInvoiceDialog clients={data.billableClients} />
          <Link
            href="/billing"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-primary underline-offset-4 hover:underline"
          >
            Books → invoices
            {data.overdueCount > 0 ? ` (${data.overdueCount} overdue)` : ''}
          </Link>
        </div>
      </div>

      {/* KPI strip — flat divider-driven, parity with billing summary */}
      <div className="grid grid-cols-2 divide-x divide-border/70 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
        {data.kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.value}
            helperText={k.sub ?? undefined}
            deltaPct={k.deltaPct ?? null}
            deltaLabel={k.deltaPct != null ? 'vs last month' : undefined}
            flat
          />
        ))}
      </div>

      {/* Monthly retainers + Monthly expenses — side by side, both editable inline */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RecurringMonthlySection
          kind="incoming"
          rows={monthlyRetainers}
          title="Monthly retainers"
          emptyHint="Add a client retainer to start tracking MRR."
        />
        <RecurringMonthlySection
          kind="outgoing"
          rows={monthlyExpenses}
          title="Monthly expenses"
          emptyHint="Add a salary, rent, or subscription."
        />
      </div>

      {/* Other (yearly + one-off) — collapsed by default */}
      <OtherRecurringSection rows={otherRecurring} />
    </div>
  );
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/* ======================================================================
   RecurringMonthlySection — one section per direction (in / out)
   ====================================================================== */

function RecurringMonthlySection({
  kind,
  rows,
  title,
  emptyHint,
}: {
  kind: 'incoming' | 'outgoing';
  rows: FinanceRecurringRow[];
  title: string;
  emptyHint: string;
}) {
  const [editing, setEditing] = useState<FinanceRecurringRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FinanceRecurringRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sorted = useMemo(
    () =>
      rows.slice().sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return b.amount - a.amount;
      }),
    [rows]
  );

  const total = useMemo(
    () => sorted.filter((r) => r.is_active).reduce((sum, r) => sum + r.amount, 0),
    [sorted]
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

  const Icon = kind === 'incoming' ? ArrowDownToLine : ArrowUpFromLine;
  const tone = kind === 'incoming' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500';

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-3.5 w-3.5', tone)} aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {sorted.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('font-mono text-xs font-semibold tabular-nums', tone)}>
            {kind === 'outgoing' ? '−' : ''}
            {formatEUR(total)}/mo
          </span>
          <Button size="sm" className="h-8 gap-1.5 rounded-lg" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </header>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nothing here yet"
          description={emptyHint}
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
              style={{ gridTemplateColumns: '1fr 80px 90px 64px' }}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">{r.description}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {r.client_name ?? r.category ?? '—'}
                  {r.notes ? ` · ${r.notes.slice(0, 60)}${r.notes.length > 60 ? '…' : ''}` : ''}
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {ordinal(r.day_of_month)}
              </span>
              <span className={cn('text-right font-mono text-xs font-semibold tabular-nums', tone)}>
                {kind === 'outgoing' ? '−' : ''}
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
        defaultType={kind}
        defaultFrequency="monthly"
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this entry?"
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
   OtherRecurringSection — yearly + one-off, collapsed by default
   ====================================================================== */

function OtherRecurringSection({ rows }: { rows: FinanceRecurringRow[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceRecurringRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FinanceRecurringRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sorted = useMemo(
    () =>
      rows.slice().sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        if (a.frequency !== b.frequency) return a.frequency === 'yearly' ? -1 : 1;
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <Repeat className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Other (yearly + one-off)</h3>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {sorted.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {open ? 'hide' : 'show'}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </div>
      </button>
      {open ? (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              annual contracts + one-time payments
            </span>
            <Button size="sm" className="h-8 gap-1.5 rounded-lg" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {sorted.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No yearly or one-off entries"
              description="Add an annual subscription or a one-off project payment."
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
                  style={{ gridTemplateColumns: '1fr 90px 130px 110px 70px' }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-foreground">
                      {r.description}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {r.client_name ?? r.category ?? '—'}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] capitalize',
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
                      r.type === 'incoming'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-500'
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
        </>
      ) : null}

      <RecurringEditDialog
        open={creating || !!editing}
        existing={editing}
        defaultType="incoming"
        defaultFrequency="yearly"
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this entry?"
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
  defaultType = 'incoming',
  defaultFrequency = 'monthly',
  onClose,
  onSaved,
}: {
  open: boolean;
  existing: FinanceRecurringRow | null;
  defaultType?: 'incoming' | 'outgoing';
  defaultFrequency?: 'monthly' | 'yearly' | 'one_off';
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(existing?.description ?? '');
  const [type, setType] = useState<'incoming' | 'outgoing'>(existing?.type ?? defaultType);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'one_off'>(
    existing?.frequency ?? defaultFrequency
  );
  const [amount, setAmount] = useState<string>(existing?.amount.toString() ?? '');
  const [dayOfMonth, setDayOfMonth] = useState<string>((existing?.day_of_month ?? 1).toString());
  const [startDate, setStartDate] = useState(existing?.start_date ?? '');
  const [endDate, setEndDate] = useState(existing?.end_date ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const num = Number(amount);
    const day = Math.max(1, Math.min(28, Math.round(Number(dayOfMonth) || 1)));
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
        day_of_month: day,
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
    setType(defaultType);
    setFrequency(defaultFrequency);
    setAmount('');
    setDayOfMonth('1');
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
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-2">
              <Label htmlFor="rp-dom">Day of month</Label>
              <Input
                id="rp-dom"
                type="number"
                min="1"
                max="28"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                disabled={isPending}
              />
            </div>
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
