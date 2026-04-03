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
  mrr: number;
  isRetainer: boolean;
};

type Props = {
  summary: FinancialSummary | null;
};

// ─── MRR Config ──────────────────────────────────────────
const RETAINER_CLIENTS: Record<string, { amount: number; label: string }> = {
  Underdog: { amount: 700, label: 'Monthly retainer' },
  'Sophia - Zyprus': { amount: 375, label: '1st of month' },
  Armenius: { amount: 250, label: '1st of month' },
};

// ─── Helpers ─────────────────────────────────────────────

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDetail(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

function fmtShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM');
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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-base font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ClientCard({ client }: { client: ClientGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header — compact */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">{client.name}</h3>
              {client.isRetainer && <RefreshCw className="h-3 w-3 shrink-0 text-qualia-500" />}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {client.invoices.length} inv · {fmt(client.totalPaid)} paid
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-right">
          {client.totalOutstanding > 0 && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {fmt(client.totalOutstanding)} due
            </span>
          )}
          <span className="text-sm font-bold text-foreground">{fmt(client.totalInvoiced)}</span>
        </div>
      </button>

      {/* Invoice rows — compact */}
      {expanded && (
        <div className="border-t border-border">
          {client.invoices.map((inv) => (
            <div
              key={inv.zoho_id}
              className="flex items-center justify-between border-b border-border/40 px-4 py-2 last:border-0 hover:bg-muted/20"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                <span className="truncate text-xs font-medium text-foreground">
                  {inv.invoice_number}
                </span>
                <span className="text-[10px] text-muted-foreground">{fmtShortDate(inv.date)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft}`}
                >
                  {inv.status}
                </span>
                <span className="w-20 text-right text-xs font-medium text-foreground">
                  {fmtDetail(inv.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────

export function FinancialDashboard({ summary }: Props) {
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
    // Include all retainer clients, even if they have no invoices yet
    const fromInvoiced = clientGroups.reduce((sum, c) => sum + c.mrr, 0);
    const invoicedNames = new Set(clientGroups.map((c) => c.name));
    const fromMissing = Object.entries(RETAINER_CLIENTS)
      .filter(([name]) => !invoicedNames.has(name))
      .reduce((sum, [, config]) => sum + config.amount, 0);
    return fromInvoiced + fromMissing;
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Invoiced"
          value={fmt(summary.totalInvoiced)}
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Collected"
          value={fmt(summary.totalCollected)}
          icon={TrendingUp}
          color="bg-qualia-500/10 text-qualia-600 dark:text-qualia-400"
        />
        <StatCard
          label="Outstanding"
          value={fmt(summary.totalOutstanding)}
          icon={Clock}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="MRR"
          value={fmt(totalMRR)}
          icon={RefreshCw}
          color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* MRR strip */}
      {totalMRR > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-2.5">
          <RefreshCw className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <p className="text-xs text-foreground">
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              {fmt(totalMRR)}/mo
            </span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            ARR{' '}
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              {fmt(totalARR)}
            </span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {Object.entries(RETAINER_CLIENTS)
                .map(([name, c]) => `${name} ${fmt(c.amount)}`)
                .join(' · ')}
            </span>
          </p>
        </div>
      )}

      {/* Client grid — 2 columns on larger screens */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Clients ({clientGroups.length})
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {clientGroups.map((client) => (
            <ClientCard key={client.name} client={client} />
          ))}
        </div>
      </div>

      {/* Sync info */}
      {summary.lastSyncedAt && (
        <p className="text-center text-[10px] text-muted-foreground/60">
          Last synced: {fmtDate(summary.lastSyncedAt)}
        </p>
      )}
    </div>
  );
}
