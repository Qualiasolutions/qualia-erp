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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createPayment,
  updatePayment,
  deletePayment,
  type Payment,
  type RecurringPayment,
} from '@/app/actions/payments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function PaymentRow({ payment }: { payment: Payment }) {
  const [isPending, startTransition] = useTransition();
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
    <div
      className={cn(
        'group flex items-center gap-4 border-b border-border/50 px-1 py-4 last:border-0',
        isPending && 'opacity-50'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          isIncoming ? 'bg-emerald-500/10' : 'bg-red-500/10'
        )}
      >
        {isIncoming ? (
          <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
        ) : (
          <ArrowUpRight className="h-5 w-5 text-red-500" />
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {isIncoming && payment.client
            ? payment.client.display_name || payment.client.name
            : payment.description}
        </p>
        <p className="text-sm text-muted-foreground">
          {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
          {payment.category && (
            <span className="ml-2 text-muted-foreground/60">• {payment.category}</span>
          )}
        </p>
      </div>

      {/* Status */}
      <button
        type="button"
        onClick={() => handleStatusChange(payment.status === 'completed' ? 'pending' : 'completed')}
        className={cn(
          'hidden rounded-full px-2.5 py-1 text-xs font-medium transition-colors sm:block',
          payment.status === 'completed' &&
            'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
          payment.status === 'pending' && 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
          payment.status === 'cancelled' && 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
        )}
      >
        {payment.status === 'completed' && <Check className="mr-1 inline h-3 w-3" />}
        {payment.status === 'pending' && <Clock className="mr-1 inline h-3 w-3" />}
        {payment.status === 'cancelled' && <X className="mr-1 inline h-3 w-3" />}
        {payment.status}
      </button>

      {/* Amount */}
      <p
        className={cn(
          'min-w-[90px] text-right text-lg font-semibold tabular-nums',
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
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
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
  );
}

function AddPaymentForm({ clients, onComplete }: { clients: Client[]; onComplete: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPayment({
        type,
        amount: parseFloat(formData.get('amount') as string),
        description:
          type === 'incoming'
            ? clients.find((c) => c.id === formData.get('client_id'))?.display_name ||
              clients.find((c) => c.id === formData.get('client_id'))?.name ||
              'Payment'
            : (formData.get('description') as string),
        client_id: type === 'incoming' ? (formData.get('client_id') as string) : undefined,
        payment_date: (formData.get('payment_date') as string) || undefined,
        status: 'pending',
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
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
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
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
            type === 'outgoing'
              ? 'bg-red-500 text-white'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
          Expense
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {type === 'incoming' ? (
          <select
            name="client_id"
            required
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
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
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
        )}

        <input
          type="number"
          name="amount"
          step="0.01"
          min="0"
          required
          placeholder="Amount"
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold tabular-nums focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
        />

        <input
          type="date"
          name="payment_date"
          defaultValue={new Date().toISOString().split('T')[0]}
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
        />

        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50',
            type === 'incoming'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-red-600 hover:bg-red-700'
          )}
        >
          {isPending ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  );
}

export function PaymentsClient({ payments, summary, clients }: PaymentsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const balance = summary.totalIncoming - summary.totalOutgoing;

  const filteredPayments = useMemo(() => {
    const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);
    return filtered.sort(
      (a, b) => parseISO(b.payment_date).getTime() - parseISO(a.payment_date).getTime()
    );
  }, [payments, filter]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Income</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
            {formatCurrency(summary.totalIncoming)}
          </p>
          {summary.pendingIncoming > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(summary.pendingIncoming)} pending
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-red-500">
            {formatCurrency(summary.totalOutgoing)}
          </p>
          {summary.pendingOutgoing > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(summary.pendingOutgoing)} pending
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Balance</p>
          <p
            className={cn(
              'mt-1 text-2xl font-bold tabular-nums',
              balance >= 0 ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {formatCurrency(balance)}
          </p>
          {summary.totalIncoming > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {((balance / summary.totalIncoming) * 100).toFixed(0)}% margin
            </p>
          )}
        </div>
      </div>

      {/* Add payment */}
      {showForm ? (
        <AddPaymentForm clients={clients} onComplete={() => setShowForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-solid hover:border-qualia-500 hover:bg-qualia-500/5 hover:text-qualia-600"
        >
          <Plus className="h-4 w-4" />
          Add Payment
        </button>
      )}

      {/* Payments list */}
      <div className="rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold text-foreground">Transactions</h2>
          <div className="flex gap-1 rounded-lg bg-secondary/50 p-0.5">
            {(['all', 'pending', 'completed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
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

        {/* List */}
        <div className="px-3">
          {filteredPayments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {payments.length === 0 ? 'No payments yet' : `No ${filter} payments`}
              </p>
            </div>
          ) : (
            filteredPayments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)
          )}
        </div>
      </div>
    </div>
  );
}
