'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  Check,
  Clock,
  X,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPayment, updatePayment, deletePayment, type Payment } from '@/app/actions/payments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface PaymentsClientProps {
  payments: Payment[];
  summary: {
    totalIncoming: number;
    totalOutgoing: number;
    pendingIncoming: number;
    pendingOutgoing: number;
  };
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending' },
  completed: {
    icon: Check,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    label: 'Completed',
  },
  cancelled: { icon: X, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Cancelled' },
};

function formatCurrency(amount: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function SummaryCard({
  title,
  amount,
  pending,
  type,
  currency = 'EUR',
}: {
  title: string;
  amount: number;
  pending?: number;
  type: 'income' | 'expense' | 'balance';
  currency?: string;
}) {
  const colors = {
    income: 'text-emerald-500',
    expense: 'text-red-500',
    balance: amount >= 0 ? 'text-emerald-500' : 'text-red-500',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', colors[type])}>
        {formatCurrency(amount, currency)}
      </p>
      {pending !== undefined && pending > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {formatCurrency(pending, currency)} pending
        </p>
      )}
    </div>
  );
}

function NewPaymentForm({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPayment({
        type,
        amount: parseFloat(formData.get('amount') as string),
        description: formData.get('description') as string,
        category: (formData.get('category') as string) || undefined,
        payment_date: (formData.get('payment_date') as string) || undefined,
        status: (formData.get('status') as 'pending' | 'completed') || 'pending',
        notes: (formData.get('notes') as string) || undefined,
      });

      if (result.success) {
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType('incoming')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all',
            type === 'incoming'
              ? 'bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          )}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Income
        </button>
        <button
          type="button"
          onClick={() => setType('outgoing')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all',
            type === 'outgoing'
              ? 'bg-red-500/10 text-red-500 ring-2 ring-red-500/30'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
          Expense
        </button>
      </div>

      {/* Amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Amount (EUR)</label>
        <input
          type="number"
          name="amount"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg font-semibold tabular-nums focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
        <input
          type="text"
          name="description"
          required
          placeholder="What is this payment for?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
        />
      </div>

      {/* Category & Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
          <input
            type="text"
            name="category"
            placeholder="e.g., Software, Salary"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Date</label>
          <input
            type="date"
            name="payment_date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
        <select
          name="status"
          defaultValue="pending"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Additional notes..."
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className={cn(
            'flex-1',
            type === 'incoming'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-red-600 hover:bg-red-700'
          )}
        >
          {isPending ? 'Adding...' : 'Add Payment'}
        </Button>
      </div>
    </form>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const [isPending, startTransition] = useTransition();
  const statusConfig = STATUS_CONFIG[payment.status];
  const StatusIcon = statusConfig.icon;
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
        'group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md',
        isPending && 'opacity-50'
      )}
    >
      {/* Type indicator */}
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
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{payment.description}</p>
          {payment.category && (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {payment.category}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</span>
          {payment.client?.display_name || payment.client?.name ? (
            <span className="truncate">• {payment.client.display_name || payment.client.name}</span>
          ) : null}
        </div>
      </div>

      {/* Status badge */}
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1',
          statusConfig.bg,
          statusConfig.color
        )}
      >
        <StatusIcon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{statusConfig.label}</span>
      </div>

      {/* Amount */}
      <p
        className={cn(
          'min-w-[100px] text-right text-lg font-bold tabular-nums',
          isIncoming ? 'text-emerald-500' : 'text-red-500'
        )}
      >
        {isIncoming ? '+' : '-'}
        {formatCurrency(Number(payment.amount), payment.currency)}
      </p>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {payment.status !== 'completed' && (
            <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
              <Check className="mr-2 h-4 w-4 text-emerald-500" />
              Mark Completed
            </DropdownMenuItem>
          )}
          {payment.status !== 'pending' && (
            <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
              <Clock className="mr-2 h-4 w-4 text-amber-500" />
              Mark Pending
            </DropdownMenuItem>
          )}
          {payment.status !== 'cancelled' && (
            <DropdownMenuItem onClick={() => handleStatusChange('cancelled')}>
              <X className="mr-2 h-4 w-4 text-red-500" />
              Cancel
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

export function PaymentsClient({ payments, summary }: PaymentsClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const balance = summary.totalIncoming - summary.totalOutgoing;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total Income"
          amount={summary.totalIncoming}
          pending={summary.pendingIncoming}
          type="income"
        />
        <SummaryCard
          title="Total Expenses"
          amount={summary.totalOutgoing}
          pending={summary.pendingOutgoing}
          type="expense"
        />
        <SummaryCard title="Balance" amount={balance} type="balance" />
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-qualia-500/10 px-4 py-2 text-sm font-medium text-qualia-600 transition-all hover:bg-qualia-500/20 dark:text-qualia-400"
              >
                <Plus className="h-4 w-4" />
                Add Payment
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Payment</DialogTitle>
              </DialogHeader>
              <NewPaymentForm onClose={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Payments list */}
      <div className="space-y-3">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <ArrowDownLeft className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">No payments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first payment to start tracking
            </p>
          </div>
        ) : (
          payments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)
        )}
      </div>
    </div>
  );
}
