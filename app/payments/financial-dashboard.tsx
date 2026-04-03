'use client';

import { useState, useMemo } from 'react';
import type { FinancialSummary, FinancialInvoice } from '@/app/actions/financials';
import { format, parseISO } from 'date-fns';
import {
  DollarSign,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileText,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

type ClientGroup = {
  name: string;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoices: FinancialInvoice[];
  mrr: number; // Monthly recurring revenue for this client
  isRetainer: boolean;
};

type Props = {
  summary: FinancialSummary | null;
};

// ─── MRR Config ──────────────────────────────────────────
// Clients with known retainer/recurring agreements
const RETAINER_CLIENTS: Record<string, { amount: number; label: string }> = {
  Underdog: { amount: 700, label: 'Monthly retainer' },
};

// ─── Helpers ─────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
  draft: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
  void: 'bg-slate-500/10 text-slate-400 dark:text-slate-500',
  partially_paid: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

// ─── Components ──────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ClientCard({ client }: { client: ClientGroup }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Client header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{client.name}</h3>
            <div className="mt-0.5 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {client.invoices.length} invoice{client.invoices.length !== 1 ? 's' : ''}
              </span>
              {client.isRetainer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-qualia-500/10 px-2 py-0.5 text-[10px] font-medium text-qualia-600 dark:text-qualia-400">
                  <RefreshCw className="h-2.5 w-2.5" />
                  {RETAINER_CLIENTS[client.name]?.label ?? 'Recurring'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right">
          {client.totalOutstanding > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Outstanding
              </p>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(client.totalOutstanding)}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(client.totalInvoiced)}
            </p>
          </div>
        </div>
      </button>

      {/* Invoice table */}
      {expanded && (
        <div className="border-t border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Invoice
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {client.invoices.map((inv) => (
                <tr
                  key={inv.zoho_id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/20"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-xs font-medium text-foreground">
                        {inv.invoice_number}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {formatDate(inv.date)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-medium text-foreground">
                    {formatCurrencyDetailed(inv.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────

export function FinancialDashboard({ summary }: Props) {
  // Hooks must be called unconditionally
  const clientGroups = useMemo(() => {
    if (!summary) return [];
    const map = new Map<string, FinancialInvoice[]>();
    for (const inv of summary.allInvoices) {
      const existing = map.get(inv.customer_name) ?? [];
      existing.push(inv);
      map.set(inv.customer_name, existing);
    }

    const groups: ClientGroup[] = Array.from(map.entries()).map(([name, invoices]) => {
      const sorted = [...invoices].sort((a, b) => a.date.localeCompare(b.date));
      const totalInvoiced = sorted.reduce((s, i) => s + i.total, 0);
      const totalOutstanding = sorted
        .filter((i) => i.status !== 'paid' && i.status !== 'void')
        .reduce((s, i) => s + i.balance, 0);
      const totalPaid = totalInvoiced - totalOutstanding;
      const retainer = RETAINER_CLIENTS[name];

      return {
        name,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        invoices: sorted,
        mrr: retainer?.amount ?? 0,
        isRetainer: !!retainer,
      };
    });

    return groups.sort((a, b) => b.totalInvoiced - a.totalInvoiced);
  }, [summary]);

  const totalMRR = useMemo(() => {
    return clientGroups.reduce((sum, c) => sum + c.mrr, 0);
  }, [clientGroups]);

  const totalARR = totalMRR * 12;

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">Unable to load financial data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Invoiced"
          value={formatCurrency(summary.totalInvoiced)}
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Total Collected"
          value={formatCurrency(summary.totalCollected)}
          icon={TrendingUp}
          color="bg-qualia-500/10 text-qualia-600 dark:text-qualia-400"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(summary.totalOutstanding)}
          icon={Clock}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="MRR"
          value={formatCurrency(totalMRR)}
          icon={RefreshCw}
          color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* MRR detail strip */}
      {totalMRR > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-3">
          <RefreshCw className="h-4 w-4 text-violet-500" />
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">
              Monthly Recurring Revenue:{' '}
              <span className="text-violet-600 dark:text-violet-400">
                {formatCurrency(totalMRR)}/mo
              </span>
              <span className="mx-2 text-muted-foreground">·</span>
              ARR:{' '}
              <span className="text-violet-600 dark:text-violet-400">
                {formatCurrency(totalARR)}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {clientGroups
                .filter((c) => c.mrr > 0)
                .map((c) => `${c.name}: ${formatCurrency(c.mrr)}/mo`)
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Client sections */}
      <div className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Clients ({clientGroups.length})
        </h2>
        {clientGroups.map((client) => (
          <ClientCard key={client.name} client={client} />
        ))}
      </div>

      {/* Sync info */}
      {summary.lastSyncedAt && (
        <p className="text-center text-[10px] text-muted-foreground/60">
          Last synced: {formatDate(summary.lastSyncedAt)}
        </p>
      )}
    </div>
  );
}
