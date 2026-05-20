import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { ArrowRight, ClipboardCheck, FileText } from 'lucide-react';

import { getPortalAuthUser } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';
import { getAuditIndex } from '@/app/actions/employee-audit';

export const metadata: Metadata = {
  title: 'Performance audit | Qualia',
  description: 'Hidden audit surface for May scope planning.',
};

export default async function AuditIndexPage() {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  if (!(await isUserAdmin(user.id))) redirect('/dashboard');

  const rows = await getAuditIndex();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto min-w-[180px]">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                Performance audit
              </h1>
              <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
              <p className="truncate text-sm text-muted-foreground">
                Admin-only employee snapshots
              </p>
            </div>
          </div>
          <span className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {rows.length} employee{rows.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No employees found.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.profileId}>
              <Link
                href={`/audit/${row.profileId}`}
                className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline gap-3">
                      <h2 className="truncate text-base font-semibold tracking-tight">
                        {row.fullName ?? 'Unknown'}
                      </h2>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {row.email}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
                      <Stat label="Projects worked" value={row.projectsWorked.toString()} />
                      <Stat
                        label={`Attendance · ${row.expectedDaysPerWeek}d/wk`}
                        value={`${row.attendancePct}%`}
                      />
                      <Stat
                        label="Reports / sessions"
                        value={`${row.reportsTotal} · ${row.reportRatePct}%`}
                      />
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5">
                        {row.hasAssessment ? (
                          <>
                            <ClipboardCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                              Assessed
                            </span>
                          </>
                        ) : (
                          <>
                            <FileText className="size-3 text-amber-600 dark:text-amber-400" />
                            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                              Pending
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
        {label}
      </span>
      <span className="font-mono font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
}
