'use client';

import { useState, useTransition, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
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
  Users,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createPayment,
  updatePayment,
  deletePayment,
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
              <span className="ml-1.5 text-muted-foreground/60">• {payment.category}</span>
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

// ============ CLIENT BALANCE ROW ============

function ClientBalanceRow({ balance }: { balance: ClientBalance }) {
  const hasActivity = balance.total_paid > 0 || balance.total_pending > 0;
  const totalOwed = balance.total_owed || balance.total_paid + balance.total_pending;
  const paidPct =
    totalOwed > 0 ? Math.min(100, Math.round((balance.total_paid / totalOwed) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 border-b border-border/50 px-2 py-3 last:border-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-qualia-500/10">
        <Building2 className="h-4 w-4 text-qualia-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {balance.display_name || balance.client_name}
        </p>
        {hasActivity && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
              {paidPct}%
            </span>
          </div>
        )}
        {balance.last_payment_date && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last: {format(parseISO(balance.last_payment_date), 'MMM d')}
          </p>
        )}
      </div>
      <div className="text-right">
        {hasActivity ? (
          <>
            <p className="text-sm font-semibold tabular-nums text-emerald-600">
              {formatCurrency(balance.total_paid)}
            </p>
            {balance.total_pending > 0 && (
              <p className="text-xs tabular-nums text-amber-600">
                +{formatCurrency(balance.total_pending)} pending
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No payments</p>
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
}: PaymentsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const balance = summary.totalIncoming - summary.totalOutgoing;

  const filteredPayments = useMemo(() => {
    const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);
    return filtered.sort(
      (a, b) => parseISO(b.payment_date).getTime() - parseISO(a.payment_date).getTime()
    );
  }, [payments, filter]);

  // Sort client balances by total owed descending
  const sortedBalances = useMemo(() => {
    return [...clientBalances].sort((a, b) => b.total_owed - a.total_owed);
  }, [clientBalances]);

  const totalClientPaid = clientBalances.reduce((sum, b) => sum + b.total_paid, 0);
  const totalClientPending = clientBalances.reduce((sum, b) => sum + b.total_pending, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-l-[3px] border-border border-l-emerald-500 bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Income</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600">
            {formatCurrency(summary.totalIncoming)}
          </p>
          {summary.pendingIncoming > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatCurrency(summary.pendingIncoming)} pending
            </p>
          )}
        </div>
        <div className="rounded-xl border border-l-[3px] border-border border-l-red-500 bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-red-500">
            {formatCurrency(summary.totalOutgoing)}
          </p>
          {summary.pendingOutgoing > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatCurrency(summary.pendingOutgoing)} pending
            </p>
          )}
        </div>
        <div
          className={cn(
            'rounded-xl border border-l-[3px] border-border bg-card p-4',
            balance >= 0 ? 'border-l-qualia-500' : 'border-l-red-500'
          )}
        >
          <p className="text-xs text-muted-foreground">Net Balance</p>
          <p
            className={cn(
              'mt-1 text-xl font-bold tabular-nums',
              balance >= 0 ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {formatCurrency(balance)}
          </p>
          {summary.totalIncoming > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {((balance / summary.totalIncoming) * 100).toFixed(0)}% margin
            </p>
          )}
        </div>
        <div className="rounded-xl border border-l-[3px] border-border border-l-qualia-500 bg-card p-4">
          <p className="text-xs text-muted-foreground">Client Revenue</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-qualia-600">
            {formatCurrency(totalClientPaid + totalClientPending)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {clientBalances.filter((b) => b.total_owed > 0).length} active clients
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Client Balances */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Client Balances</h2>
              </div>
              <span className="text-xs text-muted-foreground">{clientBalances.length} clients</span>
            </div>
            <div className="max-h-[500px] overflow-y-auto px-2">
              {sortedBalances.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No clients yet</p>
                </div>
              ) : (
                sortedBalances.map((balance) => (
                  <ClientBalanceRow key={balance.client_id} balance={balance} />
                ))
              )}
            </div>
            {/* Summary footer */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Collected</span>
                <span className="font-semibold tabular-nums text-emerald-600">
                  {formatCurrency(totalClientPaid)}
                </span>
              </div>
              {totalClientPending > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold tabular-nums text-amber-600">
                    {formatCurrency(totalClientPending)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Transactions */}
        <div className="lg:col-span-3">
          {/* Add payment */}
          {showForm ? (
            <AddPaymentForm clients={clients} onComplete={() => setShowForm(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-solid hover:border-qualia-500 hover:bg-qualia-500/5 hover:text-qualia-600"
            >
              <Plus className="h-4 w-4" />
              Add Payment
            </button>
          )}

          {/* Payments list */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold text-foreground">Transactions</h2>
              <div className="flex gap-1 rounded-lg bg-secondary/50 p-0.5">
                {(['all', 'pending', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilter(status)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                      filter === status
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto px-2">
              {filteredPayments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {payments.length === 0 ? 'No payments yet' : `No ${filter} payments`}
                  </p>
                </div>
              ) : (
                (() => {
                  let lastMonth = '';
                  return filteredPayments.map((payment) => {
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
