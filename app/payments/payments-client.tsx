'use client';

import { useState, useTransition, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  Check,
  Clock,
  X,
  MoreVertical,
  Calendar,
  Users,
  ChevronDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createPayment,
  updatePayment,
  deletePayment,
  clearAllPayments,
  type Payment,
} from '@/app/actions/payments';
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
  clients: Client[];
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SummaryCard({
  title,
  amount,
  pending,
  type,
  icon: Icon,
  currency = 'EUR',
}: {
  title: string;
  amount: number;
  pending?: number;
  type: 'income' | 'expense' | 'balance';
  icon?: typeof TrendingUp;
  currency?: string;
}) {
  const config = {
    income: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
    expense: { color: 'text-red-500', bg: 'bg-red-500/10', iconColor: 'text-red-500' },
    balance: {
      color: amount >= 0 ? 'text-emerald-500' : 'text-red-500',
      bg: amount >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      iconColor: amount >= 0 ? 'text-emerald-500' : 'text-red-500',
    },
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-border/80 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              'mt-2 text-3xl font-bold tabular-nums tracking-tight',
              config[type].color
            )}
          >
            {formatCurrency(amount, currency)}
          </p>
          {pending !== undefined && pending > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-amber-500">
                {formatCurrency(pending, currency)}
              </span>{' '}
              pending
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-xl p-2.5', config[type].bg)}>
            <Icon className={cn('h-5 w-5', config[type].iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}

function NewPaymentForm({ onClose, clients }: { onClose: () => void; clients: Client[] }) {
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
              'Client payment'
            : (formData.get('description') as string),
        client_id: type === 'incoming' ? (formData.get('client_id') as string) : undefined,
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

      {/* Client selection for incoming OR Description for outgoing */}
      {type === 'incoming' ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Client</label>
          <select
            name="client_id"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.display_name || client.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
          <input
            type="text"
            name="description"
            required
            placeholder="What is this expense for?"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
          />
        </div>
      )}

      {/* Category & Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
          <input
            type="text"
            name="category"
            placeholder={type === 'incoming' ? 'e.g., Project, Retainer' : 'e.g., Software, Salary'}
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

function PaymentRow({ payment, compact = false }: { payment: Payment; compact?: boolean }) {
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
        'group flex items-center gap-3 rounded-xl border border-transparent bg-card/50 px-4 py-3 transition-all hover:border-border hover:bg-card hover:shadow-sm',
        isPending && 'opacity-50',
        compact && 'py-2.5'
      )}
    >
      {/* Date */}
      <div className="w-12 flex-shrink-0 text-center">
        <div className="text-lg font-bold tabular-nums text-foreground">
          {format(parseISO(payment.payment_date), 'd')}
        </div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {format(parseISO(payment.payment_date), 'EEE')}
        </div>
      </div>

      {/* Type indicator */}
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
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">
            {isIncoming && (payment.client?.display_name || payment.client?.name)
              ? payment.client.display_name || payment.client.name
              : payment.description}
          </p>
          {payment.category && (
            <span className="hidden rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              {payment.category}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div
        className={cn(
          'hidden items-center gap-1 rounded-full px-2 py-0.5 sm:flex',
          statusConfig.bg,
          statusConfig.color
        )}
      >
        <StatusIcon className="h-3 w-3" />
        <span className="text-[10px] font-medium">{statusConfig.label}</span>
      </div>

      {/* Amount */}
      <p
        className={cn(
          'min-w-[80px] text-right font-bold tabular-nums',
          isIncoming ? 'text-emerald-500' : 'text-red-500'
        )}
      >
        {isIncoming ? '+' : '-'}€{Number(payment.amount).toLocaleString()}
      </p>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
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

type MonthGroup = {
  key: string;
  label: string;
  year: number;
  month: number;
  payments: Payment[];
  income: number;
  expense: number;
  balance: number;
};

type ClientGroup = {
  clientId: string | null;
  clientName: string;
  payments: Payment[];
  total: number;
};

function MonthSection({ group, defaultOpen = true }: { group: MonthGroup; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Month header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-qualia-500/10">
            <Calendar className="h-5 w-5 text-qualia-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{group.label}</h3>
            <p className="text-xs text-muted-foreground">{group.payments.length} payments</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-emerald-500">
                +€{group.income.toLocaleString()}
              </span>
              <span className="font-medium text-red-500">-€{group.expense.toLocaleString()}</span>
            </div>
            <p
              className={cn(
                'text-xs font-semibold',
                group.balance >= 0 ? 'text-emerald-500' : 'text-red-500'
              )}
            >
              Net: {group.balance >= 0 ? '+' : ''}€{group.balance.toLocaleString()}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Payments list */}
      {isOpen && (
        <div className="border-t border-border bg-secondary/20 p-2">
          <div className="space-y-1">
            {group.payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientSection({ group }: { group: ClientGroup }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Client header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-qualia-500/10">
            <Users className="h-5 w-5 text-qualia-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{group.clientName}</h3>
            <p className="text-xs text-muted-foreground">{group.payments.length} payments</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-bold text-emerald-500">€{group.total.toLocaleString()}</p>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Payments list */}
      {isOpen && (
        <div className="border-t border-border bg-secondary/20 p-2">
          <div className="space-y-1">
            {group.payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PaymentsClient({ payments, summary, clients }: PaymentsClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'client'>('timeline');
  const [isClearing, startClearTransition] = useTransition();

  const balance = summary.totalIncoming - summary.totalOutgoing;

  const handleClearAll = () => {
    if (payments.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete all ${payments.length} payments? This cannot be undone.`
      )
    ) {
      return;
    }
    startClearTransition(async () => {
      const result = await clearAllPayments();
      if (result.success) {
        window.location.reload();
      } else {
        alert('Failed to clear payments: ' + result.error);
      }
    });
  };

  // Group payments by month
  const monthGroups = useMemo(() => {
    const groups: Record<string, MonthGroup> = {};

    payments.forEach((payment) => {
      const date = parseISO(payment.payment_date);
      const key = format(date, 'yyyy-MM');
      const isIncoming = payment.type === 'incoming';
      const amount = Number(payment.amount);

      if (!groups[key]) {
        groups[key] = {
          key,
          label: format(date, 'MMMM yyyy'),
          year: date.getFullYear(),
          month: date.getMonth(),
          payments: [],
          income: 0,
          expense: 0,
          balance: 0,
        };
      }

      groups[key].payments.push(payment);
      if (isIncoming) {
        groups[key].income += amount;
      } else {
        groups[key].expense += amount;
      }
      groups[key].balance = groups[key].income - groups[key].expense;
    });

    // Sort payments within each group by date
    Object.values(groups).forEach((group) => {
      group.payments.sort(
        (a, b) => parseISO(a.payment_date).getTime() - parseISO(b.payment_date).getTime()
      );
    });

    // Sort groups by date (oldest first / chronological)
    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [payments]);

  // Group payments by client
  const clientGroups = useMemo(() => {
    const groups: Record<string, ClientGroup> = {};

    // Only incoming payments for client view
    payments
      .filter((p) => p.type === 'incoming')
      .forEach((payment) => {
        const clientId = payment.client_id || 'no-client';
        const clientName =
          payment.client?.display_name || payment.client?.name || payment.description || 'Unknown';
        const amount = Number(payment.amount);

        if (!groups[clientId]) {
          groups[clientId] = {
            clientId: payment.client_id,
            clientName,
            payments: [],
            total: 0,
          };
        }

        groups[clientId].payments.push(payment);
        groups[clientId].total += amount;
      });

    // Sort payments within each group by date
    Object.values(groups).forEach((group) => {
      group.payments.sort(
        (a, b) => parseISO(a.payment_date).getTime() - parseISO(b.payment_date).getTime()
      );
    });

    // Sort groups by total (highest first)
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          title="Total Income"
          amount={summary.totalIncoming}
          pending={summary.pendingIncoming}
          type="income"
          icon={TrendingUp}
        />
        <SummaryCard
          title="Total Expenses"
          amount={summary.totalOutgoing}
          pending={summary.pendingOutgoing}
          type="expense"
          icon={TrendingDown}
        />
        <SummaryCard title="Net Balance" amount={balance} type="balance" />
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-5">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-qualia-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-qualia-500/25 transition-all hover:bg-qualia-600 hover:shadow-xl hover:shadow-qualia-500/30"
              >
                <Plus className="h-4 w-4" />
                Add Payment
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Payment</DialogTitle>
              </DialogHeader>
              <NewPaymentForm onClose={() => setDialogOpen(false)} clients={clients} />
            </DialogContent>
          </Dialog>

          {payments.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isClearing}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              {isClearing ? 'Clearing...' : 'Clear All'}
            </button>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
        <div className="flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              viewMode === 'timeline'
                ? 'bg-qualia-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Calendar className="h-4 w-4" />
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('client')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              viewMode === 'client'
                ? 'bg-qualia-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="h-4 w-4" />
            By Client
          </button>
        </div>
      </div>

      {/* Payments grouped view */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
          <div className="mb-4 rounded-2xl bg-muted p-5">
            <ArrowDownLeft className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">No payments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first payment to start tracking
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-4">
          {monthGroups.map((group, index) => (
            <MonthSection key={group.key} group={group} defaultOpen={index < 2} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {clientGroups.map((group) => (
            <ClientSection key={group.clientId || 'no-client'} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
