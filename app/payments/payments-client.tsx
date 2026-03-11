'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameMonth,
  isAfter,
  isBefore,
} from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Check,
  Clock,
  X,
  MoreHorizontal,
  Trash2,
  Pencil,
  Building2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Repeat2,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createPayment,
  updatePayment,
  deletePayment,
  generateRetainerPayments,
  generateInstallmentPayments,
  type Payment,
  type RecurringPayment,
  type ClientBalance,
} from '@/app/actions/payments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type Client = {
  id: string;
  name: string;
  display_name: string | null;
};

export type Project = {
  id: string;
  name: string;
};

interface PaymentsClientProps {
  payments: Payment[];
  summary: {
    totalIncoming: number;
    totalOutgoing: number;
    pendingIncoming: number;
    pendingOutgoing: number;
  };
  recurringPayments: RecurringPayment[];
  recurringSummary: {
    monthlyIncome: number;
    monthlyExpenses: number;
    netMonthly: number;
  };
  clients: Client[];
  clientBalances: ClientBalance[];
  projects: Project[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============ EDIT PAYMENT MODAL ============

function EditPaymentModal({
  payment,
  clients,
  open,
  onClose,
}: {
  payment: Payment;
  clients: Client[];
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<'incoming' | 'outgoing'>(payment.type);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updatePayment(payment.id, {
        type,
        amount: parseFloat(formData.get('amount') as string),
        description: formData.get('description') as string,
        client_id: (formData.get('client_id') as string) || undefined,
        category: (formData.get('category') as string) || undefined,
        payment_date: formData.get('payment_date') as string,
        status: formData.get('status') as 'pending' | 'completed' | 'cancelled',
        notes: (formData.get('notes') as string) || undefined,
      });

      if (result.success) {
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('incoming')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
                type === 'incoming'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('outgoing')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
                type === 'outgoing'
                  ? 'bg-red-500 text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              <ArrowUpRight className="h-4 w-4" />
              Expense
            </button>
          </div>

          {/* Client select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Client</label>
            <select
              name="client_id"
              defaultValue={payment.client_id || ''}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            >
              <option value="">No client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.display_name || client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <input
              type="text"
              name="description"
              defaultValue={payment.description}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Amount</label>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                defaultValue={payment.amount}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold tabular-nums focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Date</label>
              <input
                type="date"
                name="payment_date"
                defaultValue={payment.payment_date}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
              <input
                type="text"
                name="category"
                defaultValue={payment.category || ''}
                placeholder="e.g. Software, Hosting"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
              <select
                name="status"
                defaultValue={payment.status}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
            <textarea
              name="notes"
              defaultValue={payment.notes || ''}
              rows={2}
              placeholder="Additional notes..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-qualia-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-qualia-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ RETAINER GENERATOR MODAL ============

function RetainerGeneratorModal({
  clients,
  open,
  onClose,
}: {
  clients: Client[];
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [frequency, setFrequency] = useState<'monthly' | 'annual'>('monthly');
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const previewEntries = useMemo(() => {
    if (!amount || !startDate) return [];
    const entries: { date: string; label: string }[] = [];
    const start = new Date(startDate + 'T00:00:00');
    if (frequency === 'monthly') {
      for (let i = 0; i < 12; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        entries.push({
          date: d.toISOString().split('T')[0],
          label: format(d, 'MMMM yyyy'),
        });
      }
    } else {
      entries.push({
        date: start.toISOString().split('T')[0],
        label: format(start, 'MMMM d, yyyy'),
      });
    }
    return entries;
  }, [frequency, startDate, amount]);

  const selectedClient = clients.find((c) => c.id === clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    startTransition(async () => {
      const result = await generateRetainerPayments({
        client_id: clientId,
        amount: parseFloat(amount),
        frequency,
        start_date: startDate,
        description:
          description || `Retainer — ${selectedClient?.display_name || selectedClient?.name || ''}`,
      });

      if (result.success) {
        onClose();
        setClientId('');
        setAmount('');
        setDescription('');
        setShowPreview(false);
      } else {
        setError(result.error || 'Failed to generate payments.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-qualia-500/10">
              <Repeat2 className="h-4 w-4 text-qualia-600" />
            </div>
            Retainer Fee Generator
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Frequency Toggle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Frequency</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFrequency('monthly')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
                  frequency === 'monthly'
                    ? 'bg-qualia-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                Monthly
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    frequency === 'monthly'
                      ? 'bg-white/20 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  12×
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFrequency('annual')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
                  frequency === 'annual'
                    ? 'bg-qualia-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                Annual
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    frequency === 'annual'
                      ? 'bg-white/20 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  1×
                </span>
              </button>
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount + Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Amount (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="e.g. 500"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold tabular-nums focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {frequency === 'monthly' ? 'Start Month' : 'Payment Date'}
              </label>
              <input
                type="month"
                value={startDate.substring(0, 7)}
                onChange={(e) => setStartDate(e.target.value + '-01')}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Retainer — ${selectedClient?.display_name || selectedClient?.name || 'client name'}`}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
          </div>

          {/* Preview toggle */}
          {amount && parseFloat(amount) > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="font-medium">
                  Preview —{' '}
                  {frequency === 'monthly'
                    ? `12 × ${formatCurrency(parseFloat(amount) || 0)} = ${formatCurrency((parseFloat(amount) || 0) * 12)}`
                    : `1 × ${formatCurrency(parseFloat(amount) || 0)}`}
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', showPreview && 'rotate-180')}
                />
              </button>
              {showPreview && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-background">
                  {previewEntries.map((entry, i) => (
                    <div
                      key={entry.date}
                      className="flex items-center justify-between border-b border-border/40 px-3 py-2 last:border-0"
                    >
                      <span className="text-xs text-muted-foreground">
                        #{i + 1} — {entry.label}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-emerald-600">
                        +{formatCurrency(parseFloat(amount) || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-qualia-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-qualia-700 disabled:opacity-50"
            >
              {isPending
                ? 'Generating...'
                : `Generate ${frequency === 'monthly' ? '12' : '1'} Payment${frequency === 'monthly' ? 's' : ''}`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ INSTALLMENT GENERATOR MODAL ============

type InstallmentRow = { amount: string; date: string };

function InstallmentGeneratorModal({
  clients,
  projects,
  open,
  onClose,
}: {
  clients: Client[];
  projects: Project[];
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [count, setCount] = useState(3);
  const [rows, setRows] = useState<InstallmentRow[]>(() =>
    Array.from({ length: 3 }, () => ({ amount: '', date: '' }))
  );
  const [error, setError] = useState('');

  const handleCountChange = (n: number) => {
    setCount(n);
    setRows((prev) => {
      if (n > prev.length) {
        return [
          ...prev,
          ...Array.from({ length: n - prev.length }, () => ({ amount: '', date: '' })),
        ];
      }
      return prev.slice(0, n);
    });
  };

  const updateRow = (i: number, field: 'amount' | 'date', value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a project / description.');
      return;
    }

    const installments = rows.map((r) => ({
      amount: parseFloat(r.amount),
      date: r.date,
    }));

    if (installments.some((inst) => !inst.amount || inst.amount <= 0 || !inst.date)) {
      setError('Please fill in all installment amounts and dates.');
      return;
    }

    startTransition(async () => {
      const result = await generateInstallmentPayments({
        client_id: clientId,
        description: description.trim(),
        installments,
      });

      if (result.success) {
        onClose();
        setClientId('');
        setDescription('');
        setCount(3);
        setRows(Array.from({ length: 3 }, () => ({ amount: '', date: '' })));
      } else {
        setError(result.error || 'Failed to generate installments.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
            Project Installments
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description / Project */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Project / Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="e.g. Website Redesign"
              list="projects-list"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
            {projects.length > 0 && (
              <datalist id="projects-list">
                {projects.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            )}
          </div>

          {/* Number of installments */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Number of Installments
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleCountChange(n)}
                  className={cn(
                    'flex flex-1 items-center justify-center rounded-lg py-2 text-sm font-semibold transition-all',
                    count === n
                      ? 'bg-emerald-600 text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Installment rows */}
          <div className="space-y-2">
            <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-xs font-medium text-muted-foreground">
              <span className="w-6 text-center">#</span>
              <span>Amount (EUR)</span>
              <span>Date</span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                <span className="w-6 text-center text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={row.amount}
                  onChange={(e) => updateRow(i, 'amount', e.target.value)}
                  required
                  placeholder="Amount"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold tabular-nums focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
                />
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(i, 'date', e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
                />
              </div>
            ))}
          </div>

          {/* Total */}
          {total > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/5 px-3 py-2">
              <span className="text-sm text-muted-foreground">Total project value</span>
              <span className="text-sm font-bold tabular-nums text-emerald-600">
                {formatCurrency(total)}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : `Create ${count} Installments`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ PAYMENT ROW ============

function PaymentRow({ payment, clients }: { payment: Payment; clients: Client[] }) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const isIncoming = payment.type === 'incoming';

  const handleStatusChange = (newStatus: 'pending' | 'completed' | 'cancelled') => {
    startTransition(async () => {
      await updatePayment(payment.id, { status: newStatus });
    });
  };

  const handleDelete = () => {
    if (!confirm('Delete this payment?')) return;
    startTransition(async () => {
      await deletePayment(payment.id);
    });
  };

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-3 border-b border-border/50 px-1 py-3 last:border-0',
          isPending && 'opacity-50'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
            isIncoming ? 'bg-emerald-500/10' : 'bg-red-500/10'
          )}
        >
          {isIncoming ? (
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {isIncoming && payment.client
              ? payment.client.display_name || payment.client.name
              : payment.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(payment.payment_date), 'MMM d')}
            {payment.category && (
              <span className="ml-1.5 text-muted-foreground/60">· {payment.category}</span>
            )}
          </p>
        </div>

        {/* Status */}
        <button
          type="button"
          onClick={() =>
            handleStatusChange(payment.status === 'completed' ? 'pending' : 'completed')
          }
          className={cn(
            'hidden rounded-full px-2 py-0.5 text-xs font-medium transition-colors sm:block',
            payment.status === 'completed' &&
              'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
            payment.status === 'pending' && 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
            payment.status === 'cancelled' && 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
          )}
        >
          {payment.status === 'completed' && <Check className="mr-0.5 inline h-3 w-3" />}
          {payment.status === 'pending' && <Clock className="mr-0.5 inline h-3 w-3" />}
          {payment.status === 'cancelled' && <X className="mr-0.5 inline h-3 w-3" />}
          {payment.status}
        </button>

        {/* Amount */}
        <p
          className={cn(
            'min-w-[70px] text-right text-sm font-semibold tabular-nums',
            isIncoming ? 'text-emerald-600' : 'text-red-500'
          )}
        >
          {isIncoming ? '+' : '-'}
          {formatCurrency(Number(payment.amount))}
        </p>

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {payment.status !== 'completed' && (
              <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                <Check className="mr-2 h-4 w-4 text-emerald-500" />
                Complete
              </DropdownMenuItem>
            )}
            {payment.status !== 'pending' && (
              <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
                <Clock className="mr-2 h-4 w-4 text-amber-500" />
                Pending
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-500 focus:bg-red-500/10 focus:text-red-500"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditPaymentModal
        payment={payment}
        clients={clients}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

// ============ ADD PAYMENT FORM ============

function AddPaymentForm({ clients, onComplete }: { clients: Client[]; onComplete: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const clientId = formData.get('client_id') as string;
      const client = clients.find((c) => c.id === clientId);

      const result = await createPayment({
        type,
        amount: parseFloat(formData.get('amount') as string),
        description:
          type === 'incoming' && client
            ? client.display_name || client.name
            : (formData.get('description') as string),
        client_id: type === 'incoming' ? clientId : undefined,
        category: (formData.get('category') as string) || undefined,
        payment_date: (formData.get('payment_date') as string) || undefined,
        status: (formData.get('status') as 'pending' | 'completed') || 'pending',
        notes: (formData.get('notes') as string) || undefined,
      });

      if (result.success) {
        onComplete();
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setType('incoming')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
            type === 'incoming'
              ? 'bg-emerald-500 text-white'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Income
        </button>
        <button
          type="button"
          onClick={() => setType('outgoing')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
            type === 'outgoing'
              ? 'bg-red-500 text-white'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
          Expense
        </button>
      </div>

      <div className="space-y-3">
        {/* Row 1: Client/Description + Amount */}
        <div className="grid grid-cols-2 gap-3">
          {type === 'incoming' ? (
            <select
              name="client_id"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.display_name || client.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="description"
              required
              placeholder="Description"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
          )}
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            placeholder="Amount"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold tabular-nums focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
        </div>

        {/* Row 2: Date + Category + Status */}
        <div className="grid grid-cols-3 gap-3">
          <input
            type="date"
            name="payment_date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
          <input
            type="text"
            name="category"
            placeholder="Category"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
          <select
            name="status"
            defaultValue="pending"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Row 3: Notes + Submit */}
        <div className="flex gap-3">
          <input
            type="text"
            name="notes"
            placeholder="Notes (optional)"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50',
              type === 'incoming'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ============ CLIENT MONTH ROW ============

function ClientMonthRow({
  clientName,
  displayName,
  paid,
  pending,
}: {
  clientName: string;
  displayName: string | null;
  paid: number;
  pending: number;
}) {
  const total = paid + pending;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3 border-b border-border/50 px-2 py-2.5 last:border-0">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-qualia-500/10">
        <Building2 className="h-3.5 w-3.5 text-qualia-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{displayName || clientName}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-emerald-600">
          {formatCurrency(paid)}
        </p>
        {pending > 0 && (
          <p className="text-[11px] tabular-nums text-amber-600">
            +{formatCurrency(pending)} pending
          </p>
        )}
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function PaymentsClient({
  payments,
  summary,
  clients,
  clientBalances,
  projects,
}: PaymentsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [showRetainerModal, setShowRetainerModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'all'>('month');

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  // Filter payments for selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const monthPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const date = parseISO(p.payment_date);
        return !isBefore(date, monthStart) && !isAfter(date, monthEnd);
      })
      .sort((a, b) => parseISO(b.payment_date).getTime() - parseISO(a.payment_date).getTime());
  }, [payments, monthStart, monthEnd]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    return monthPayments.reduce(
      (acc, p) => {
        const amount = Number(p.amount);
        if (p.type === 'incoming') {
          acc.income += amount;
          if (p.status === 'completed') acc.collected += amount;
          if (p.status === 'pending') acc.pendingIn += amount;
        } else {
          acc.expenses += amount;
          if (p.status === 'pending') acc.pendingOut += amount;
        }
        return acc;
      },
      { income: 0, expenses: 0, collected: 0, pendingIn: 0, pendingOut: 0 }
    );
  }, [monthPayments]);

  // Upcoming (pending) payments for the month
  const upcomingPayments = useMemo(() => {
    return monthPayments
      .filter((p) => p.status === 'pending')
      .sort((a, b) => parseISO(a.payment_date).getTime() - parseISO(b.payment_date).getTime());
  }, [monthPayments]);

  // Per-client breakdown for the month
  const clientMonthBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { name: string; displayName: string | null; paid: number; pending: number }
    >();

    monthPayments
      .filter((p) => p.type === 'incoming' && p.client_id)
      .forEach((p) => {
        const clientId = p.client_id!;
        const existing = map.get(clientId) || {
          name: p.client?.name || 'Unknown',
          displayName: p.client?.display_name || null,
          paid: 0,
          pending: 0,
        };
        const amount = Number(p.amount);
        if (p.status === 'completed') existing.paid += amount;
        if (p.status === 'pending') existing.pending += amount;
        map.set(clientId, existing);
      });

    return Array.from(map.entries()).sort(
      ([, a], [, b]) => b.paid + b.pending - (a.paid + a.pending)
    );
  }, [monthPayments]);

  const net = monthlySummary.income - monthlySummary.expenses;
  const displayPayments = view === 'month' ? monthPayments : payments;

  return (
    <div className="space-y-5">
      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth(new Date())}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              isCurrentMonth
                ? 'bg-qualia-500/10 text-qualia-600'
                : 'bg-card text-foreground hover:bg-secondary'
            )}
          >
            {format(selectedMonth, 'MMMM yyyy')}
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 rounded-lg bg-secondary/50 p-0.5">
          {(['month', 'all'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                view === v
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-l-[3px] border-border border-l-emerald-500 bg-card p-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <p className="text-xs text-muted-foreground">
              {view === 'month' ? 'Income' : 'Total Income'}
            </p>
          </div>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-emerald-600">
            {formatCurrency(view === 'month' ? monthlySummary.income : summary.totalIncoming)}
          </p>
          {(view === 'month' ? monthlySummary.pendingIn : summary.pendingIncoming) > 0 && (
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {formatCurrency(
                view === 'month' ? monthlySummary.pendingIn : summary.pendingIncoming
              )}{' '}
              pending
            </p>
          )}
        </div>
        <div className="rounded-xl border border-l-[3px] border-border border-l-red-500 bg-card p-4">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            <p className="text-xs text-muted-foreground">
              {view === 'month' ? 'Expenses' : 'Total Expenses'}
            </p>
          </div>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-red-500">
            {formatCurrency(view === 'month' ? monthlySummary.expenses : summary.totalOutgoing)}
          </p>
          {(view === 'month' ? monthlySummary.pendingOut : summary.pendingOutgoing) > 0 && (
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {formatCurrency(
                view === 'month' ? monthlySummary.pendingOut : summary.pendingOutgoing
              )}{' '}
              pending
            </p>
          )}
        </div>
        <div
          className={cn(
            'rounded-xl border border-l-[3px] border-border bg-card p-4',
            (view === 'month' ? net : summary.totalIncoming - summary.totalOutgoing) >= 0
              ? 'border-l-qualia-500'
              : 'border-l-red-500'
          )}
        >
          <p className="text-xs text-muted-foreground">Net</p>
          <p
            className={cn(
              'mt-1.5 text-xl font-bold tabular-nums',
              (view === 'month' ? net : summary.totalIncoming - summary.totalOutgoing) >= 0
                ? 'text-emerald-600'
                : 'text-red-500'
            )}
          >
            {formatCurrency(view === 'month' ? net : summary.totalIncoming - summary.totalOutgoing)}
          </p>
          {(view === 'month' ? monthlySummary.income : summary.totalIncoming) > 0 && (
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {(
                ((view === 'month' ? net : summary.totalIncoming - summary.totalOutgoing) /
                  (view === 'month' ? monthlySummary.income : summary.totalIncoming)) *
                100
              ).toFixed(0)}
              % margin
            </p>
          )}
        </div>
        <div className="rounded-xl border border-l-[3px] border-border border-l-amber-500 bg-card p-4">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </div>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-amber-600">
            {upcomingPayments.length}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
            {formatCurrency(upcomingPayments.reduce((s, p) => s + Number(p.amount), 0))} total
            pending
          </p>
        </div>
      </div>

      {/* Upcoming Payments (only in month view, only if there are pending) */}
      {view === 'month' && upcomingPayments.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-amber-500" />
            Upcoming This Month
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
              {upcomingPayments.length}
            </span>
          </h3>
          <div className="space-y-0">
            {upcomingPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 border-b border-amber-500/10 py-2 last:border-0"
              >
                <div
                  className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                    p.type === 'incoming' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  )}
                >
                  {p.type === 'incoming' ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.type === 'incoming' && p.client
                      ? p.client.display_name || p.client.name
                      : p.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due {format(parseISO(p.payment_date), 'MMM d')}
                  </p>
                </div>
                <p
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    p.type === 'incoming' ? 'text-emerald-600' : 'text-red-500'
                  )}
                >
                  {p.type === 'incoming' ? '+' : '-'}
                  {formatCurrency(Number(p.amount))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: Client Breakdown */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {view === 'month' ? 'Client Revenue' : 'All-Time Client Balances'}
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {view === 'month'
                  ? `${clientMonthBreakdown.length} clients`
                  : `${clientBalances.filter((b) => b.total_owed > 0).length} active`}
              </span>
            </div>
            <div className="max-h-[400px] overflow-y-auto px-2">
              {view === 'month' ? (
                clientMonthBreakdown.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No client payments this month</p>
                  </div>
                ) : (
                  clientMonthBreakdown.map(([clientId, data]) => (
                    <ClientMonthRow
                      key={clientId}
                      clientName={data.name}
                      displayName={data.displayName}
                      paid={data.paid}
                      pending={data.pending}
                    />
                  ))
                )
              ) : clientBalances.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No clients yet</p>
                </div>
              ) : (
                [...clientBalances]
                  .sort((a, b) => b.total_owed - a.total_owed)
                  .filter((b) => b.total_owed > 0)
                  .map((balance) => (
                    <ClientMonthRow
                      key={balance.client_id}
                      clientName={balance.client_name}
                      displayName={balance.display_name}
                      paid={balance.total_paid}
                      pending={balance.total_pending}
                    />
                  ))
              )}
            </div>
            {/* Summary footer */}
            <div className="border-t border-border px-4 py-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {view === 'month' ? 'Month Total' : 'All-Time'}
                </span>
                <span className="font-semibold tabular-nums text-emerald-600">
                  {formatCurrency(
                    view === 'month'
                      ? clientMonthBreakdown.reduce((s, [, d]) => s + d.paid + d.pending, 0)
                      : clientBalances.reduce((s, b) => s + b.total_owed, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Transactions */}
        <div className="lg:col-span-3">
          {/* Add payment */}
          {showForm ? (
            <AddPaymentForm clients={clients} onComplete={() => setShowForm(false)} />
          ) : (
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-solid hover:border-qualia-500 hover:bg-qualia-500/5 hover:text-qualia-600"
              >
                <Plus className="h-4 w-4" />
                Add Payment
              </button>
              <button
                type="button"
                onClick={() => setShowRetainerModal(true)}
                title="Generate Retainer Fees"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card/50 px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-solid hover:border-qualia-500 hover:bg-qualia-500/5 hover:text-qualia-600"
              >
                <Repeat2 className="h-4 w-4" />
                <span className="hidden sm:inline">Retainer</span>
              </button>
              <button
                type="button"
                onClick={() => setShowInstallmentModal(true)}
                title="Generate Project Installments"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card/50 px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-solid hover:border-emerald-500 hover:bg-emerald-500/5 hover:text-emerald-600"
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Installments</span>
              </button>
            </div>
          )}

          {/* Generator Modals */}
          <RetainerGeneratorModal
            clients={clients}
            open={showRetainerModal}
            onClose={() => setShowRetainerModal(false)}
          />
          <InstallmentGeneratorModal
            clients={clients}
            projects={projects}
            open={showInstallmentModal}
            onClose={() => setShowInstallmentModal(false)}
          />

          {/* Payments list */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Transactions
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({displayPayments.length})
                </span>
              </h2>
            </div>

            <div className="max-h-[500px] overflow-y-auto px-2">
              {displayPayments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {view === 'month'
                      ? `No payments in ${format(selectedMonth, 'MMMM yyyy')}`
                      : 'No payments yet'}
                  </p>
                </div>
              ) : view === 'all' ? (
                (() => {
                  let lastMonth = '';
                  const sorted = [...displayPayments].sort(
                    (a, b) =>
                      parseISO(b.payment_date).getTime() - parseISO(a.payment_date).getTime()
                  );
                  return sorted.map((payment) => {
                    const monthKey = format(parseISO(payment.payment_date), 'MMMM yyyy');
                    const showHeader = monthKey !== lastMonth;
                    lastMonth = monthKey;
                    return (
                      <div key={payment.id}>
                        {showHeader && (
                          <div className="sticky top-0 z-10 border-b border-border/30 bg-card/95 px-1 py-2 backdrop-blur-sm">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {monthKey}
                            </span>
                          </div>
                        )}
                        <PaymentRow payment={payment} clients={clients} />
                      </div>
                    );
                  });
                })()
              ) : (
                displayPayments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} clients={clients} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
