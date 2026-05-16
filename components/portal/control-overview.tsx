'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, CheckCircle2, FileText, Link2, Receipt, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { OverviewPayload } from '@/app/actions/admin-control';
import type { CommandCenterPayload } from '@/app/actions/admin-control';
import type { BillableClient } from '@/app/actions/invoice-generation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FinanceTemplateInvoiceDialog } from './finance-template-invoice-dialog';
import { PlanningHealth } from './qualia-control';

/* ======================================================================
   Types
   ====================================================================== */

type ActionRowType = 'invoice' | 'blocker' | 'risk' | 'stale' | 'no-deadline' | 'clock-in';
type Severity = 'critical' | 'high' | 'medium';

type ActionRow = {
  id: string;
  type: ActionRowType;
  title: string;
  href: string;
  owner: string | null;
  severity: Severity;
  updatedAt: Date;
};

/* ======================================================================
   Helpers
   ====================================================================== */

const MAX_ACTION_ROWS = 25;

function severityWeight(s: Severity): number {
  switch (s) {
    case 'critical':
      return 3;
    case 'high':
      return 2;
    case 'medium':
      return 1;
  }
}

function buildActionRows(cmd: CommandCenterPayload): ActionRow[] {
  const rows: ActionRow[] = [];

  // Overdue invoices -> critical if >14d, high otherwise
  for (const inv of cmd.moneyRisk.overdueInvoices) {
    rows.push({
      id: `inv-${inv.id}`,
      type: 'invoice',
      title: `${inv.customerName} — #${inv.invoiceNumber} (${fmtMoney(inv.balance, inv.currency)})`,
      href: inv.pdfUrl ?? '/admin?tab=finance',
      owner: inv.customerName,
      severity: inv.daysOverdue > 14 ? 'critical' : 'high',
      updatedAt: new Date(Date.now() - inv.daysOverdue * 86400000),
    });
  }

  // Blockers -> high
  for (const b of cmd.today.blockers) {
    rows.push({
      id: `blk-${b.id}`,
      type: 'blocker',
      title: `${b.projectName} — ${b.gapCycles} gap cycle${b.gapCycles !== 1 ? 's' : ''}`,
      href: `/admin/reports?tab=framework&id=${b.id}`,
      owner: b.submittedBy,
      severity: 'high',
      updatedAt: new Date(b.submittedAt),
    });
  }

  // At-risk / overdue projects -> high for red, medium for amber
  for (const p of cmd.thisMonth.projects) {
    if (p.health === 'red' || p.health === 'amber') {
      rows.push({
        id: `risk-${p.id}`,
        type: 'risk',
        title: `${p.name}${p.clientName ? ` (${p.clientName})` : ''} — ${p.progress}%`,
        href: `/projects/${p.id}`,
        owner: p.clientName,
        severity: p.health === 'red' ? 'high' : 'medium',
        updatedAt: p.lastReportAt ? new Date(p.lastReportAt) : new Date(),
      });
    }
  }

  // Projects without deadline -> medium
  for (const p of cmd.moneyRisk.projectsNoDeadline) {
    rows.push({
      id: `ndl-${p.id}`,
      type: 'no-deadline',
      title: `${p.name}${p.clientName ? ` (${p.clientName})` : ''} — no target date`,
      href: `/projects/${p.id}`,
      owner: p.clientName,
      severity: 'medium',
      updatedAt: new Date(),
    });
  }

  // Stale client actions -> medium (high if >14d)
  for (const a of cmd.moneyRisk.staleClientActions) {
    rows.push({
      id: `stl-${a.id}`,
      type: 'stale',
      title: a.title,
      href: '/clients',
      owner: a.clientName,
      severity: a.daysStale > 14 ? 'high' : 'medium',
      updatedAt: new Date(Date.now() - a.daysStale * 86400000),
    });
  }

  // Sort by severity desc, then recency desc
  rows.sort((a, b) => {
    const sw = severityWeight(b.severity) - severityWeight(a.severity);
    if (sw !== 0) return sw;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  return rows;
}

function fmtMoney(amount: number, currency: string): string {
  const code = currency || 'EUR';
  try {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${Math.round(amount)}`;
  }
}

function initials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/* ======================================================================
   Type badge rendering
   ====================================================================== */

const TYPE_LABELS: Record<ActionRowType, string> = {
  invoice: 'Invoice',
  blocker: 'Blocker',
  risk: 'Risk',
  stale: 'Stale',
  'no-deadline': 'No deadline',
  'clock-in': 'Clock-in',
};

function TypeBadge({ type }: { type: ActionRowType }) {
  const variant =
    type === 'invoice'
      ? 'destructive'
      : type === 'blocker'
        ? 'destructive'
        : type === 'risk'
          ? 'default'
          : ('outline' as const);
  return (
    <Badge variant={variant} className="px-1.5 py-0.5 text-[10px]">
      {TYPE_LABELS[type]}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold',
        severity === 'critical' && 'bg-red-500/10 text-red-700 dark:text-red-400',
        severity === 'high' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        severity === 'medium' && 'bg-muted text-muted-foreground'
      )}
    >
      {severity}
    </span>
  );
}

/* ======================================================================
   Stat Cards
   ====================================================================== */

function StatCard({
  label,
  count,
  subtitle,
  footerLabel,
  footerHref,
  tone,
}: {
  label: string;
  count: number;
  subtitle: string;
  footerLabel: string;
  footerHref: string;
  tone: 'destructive' | 'amber' | 'neutral';
}) {
  const valueColor =
    tone === 'destructive' && count > 0
      ? 'text-destructive'
      : tone === 'amber' && count > 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-foreground';

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className={cn('font-mono text-2xl font-semibold tabular-nums', valueColor)}>
          {count}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
      <CardFooter className="pt-0">
        <Link
          href={footerHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {footerLabel}
          <ArrowRight className="size-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}

/* ======================================================================
   Action Queue
   ====================================================================== */

function ActionQueue({ rows }: { rows: ActionRow[] }) {
  const visible = rows.slice(0, MAX_ACTION_ROWS);
  const overflow = rows.length - visible.length;

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 text-center">
        <CheckCircle2 className="mx-auto size-8 text-emerald-600 dark:text-emerald-400" />
        <h3 className="mt-3 text-sm font-semibold text-foreground">
          All clear. Nothing needs your attention right now.
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          When invoices go overdue, projects slip, or blockers land, they show up here.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Action queue</h2>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {rows.length} item{rows.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="hidden sm:table-cell">Owner</TableHead>
              <TableHead className="w-[80px]">Severity</TableHead>
              <TableHead className="w-[100px] text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <TypeBadge type={row.type} />
                </TableCell>
                <TableCell>
                  <Link
                    href={row.href}
                    className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {row.title}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                  {row.owner ?? '—'}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={row.severity} />
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {formatDistanceToNow(row.updatedAt, { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {overflow > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          + {overflow} more item{overflow !== 1 ? 's' : ''}
        </p>
      )}
    </section>
  );
}

/* ======================================================================
   Live Status — avatar strip
   ====================================================================== */

function LiveStatus({ data }: { data: CommandCenterPayload['today'] }) {
  const total = data.clockedIn.length + data.doneToday.length + data.notIn.length;
  if (total === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Live status</h2>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {data.clockedIn.length}/{total} active
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.clockedIn.map((row) => (
          <StatusAvatar
            key={`ci-${row.id}`}
            name={row.name}
            profileId={row.profileId}
            status="working"
          />
        ))}
        {data.doneToday.map((row) => (
          <StatusAvatar key={`dt-${row.id}`} name={row.name} profileId={row.id} status="done" />
        ))}
        {data.notIn.map((row) => (
          <StatusAvatar key={`ni-${row.id}`} name={row.name} profileId={row.id} status="absent" />
        ))}
      </div>
    </section>
  );
}

function StatusAvatar({
  name,
  profileId,
  status,
}: {
  name: string | null;
  profileId: string | null;
  status: 'working' | 'done' | 'absent';
}) {
  const dotColor =
    status === 'working'
      ? 'bg-emerald-500'
      : status === 'done'
        ? 'bg-blue-500'
        : 'bg-muted-foreground/40';

  const content = (
    <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
      {initials(name)}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background',
          dotColor
        )}
        aria-hidden
      />
    </span>
  );

  const wrapped = profileId ? (
    <Link href={`/admin/employee/${profileId}`}>{content}</Link>
  ) : (
    content
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
      <TooltipContent>
        <span>{name ?? 'Unknown'}</span>
        <span className="ml-1.5 text-muted-foreground">
          ({status === 'working' ? 'active' : status === 'done' ? 'clocked out' : 'not in'})
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/* ======================================================================
   Quick Actions
   ====================================================================== */

function QuickActions({ billableClients }: { billableClients: BillableClient[] }) {
  const linkActions = [
    {
      icon: Users,
      label: 'Clients',
      description: 'Client relationships and portal access',
      href: '/clients',
    },
    {
      icon: FileText,
      label: 'Reports',
      description: 'Hours, framework reports, AI prompts',
      href: '/admin/reports',
    },
    {
      icon: Link2,
      label: 'Integrations',
      description: 'GitHub, Vercel, Zoho connections',
      href: '/settings/integrations',
    },
  ];

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Quick actions</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* New invoice — opens the template dialog */}
        <FinanceTemplateInvoiceDialog
          clients={billableClients}
          trigger={
            <Card className="h-full cursor-pointer transition-colors hover:border-primary/30 hover:bg-muted/30">
              <CardContent className="flex items-start gap-3 p-4">
                <Receipt className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">New invoice</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Create from template</p>
                </div>
              </CardContent>
            </Card>
          }
        />

        {linkActions.map((action) => (
          <Link key={action.label} href={action.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/30 group-hover:bg-muted/30">
              <CardContent className="flex items-start gap-3 p-4">
                <action.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ======================================================================
   AdminActionHub — exported as ControlOverviewTab
   ====================================================================== */

export function ControlOverviewTab({
  data,
  billableClients,
}: {
  data: OverviewPayload;
  billableClients: BillableClient[];
}) {
  const cmd = data.commandCenter;
  const overdueTotal = cmd.moneyRisk.overdueInvoices.reduce((s, i) => s + i.balance, 0);
  const atRiskCount = cmd.thisMonth.projects.filter(
    (p) => p.health === 'amber' || p.health === 'red'
  ).length;

  const actionRows = buildActionRows(cmd);

  return (
    <div className="flex flex-col gap-8">
      {/* 1. STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overdue invoices"
          count={cmd.moneyRisk.overdueInvoices.length}
          subtitle={
            overdueTotal > 0
              ? `${fmtMoney(overdueTotal, cmd.moneyRisk.overdueInvoices[0]?.currency ?? 'EUR')} total balance due`
              : 'No outstanding balance'
          }
          footerLabel="View all"
          footerHref="/admin?tab=finance"
          tone="destructive"
        />
        <StatCard
          label="Open blockers"
          count={cmd.today.blockers.length}
          subtitle="from today's session reports"
          footerLabel="View reports"
          footerHref="/admin/reports"
          tone="amber"
        />
        <StatCard
          label="At-risk projects"
          count={atRiskCount}
          subtitle="this month"
          footerLabel="View team"
          footerHref="/admin?tab=team"
          tone="amber"
        />
        <StatCard
          label="Stale actions"
          count={cmd.moneyRisk.staleClientActions.length}
          subtitle="untouched > 7 days"
          footerLabel="View clients"
          footerHref="/clients"
          tone="neutral"
        />
      </div>

      {/* 2. ACTION QUEUE */}
      <ActionQueue rows={actionRows} />

      {/* 3. LIVE STATUS */}
      <LiveStatus data={cmd.today} />

      {/* 4. QUICK ACTIONS */}
      <QuickActions billableClients={billableClients} />

      {/* Planning health (preserved from original overview) */}
      <PlanningHealth data={data.planningHealth} />
    </div>
  );
}

export { ControlOverviewTab as AdminActionHub };
