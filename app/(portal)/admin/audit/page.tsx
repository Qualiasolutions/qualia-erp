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
  if (!(await isUserAdmin(user.id))) redirect('/');

  const rows = await getAuditIndex();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Hidden surface · admin only
        </span>
        <h1 className="text-[clamp(1.75rem,1.4rem+1.7vw,2.5rem)] font-semibold tracking-tight">
          Performance audit
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Data-driven snapshot per employee, used to shape May scope. Each profile opens to
          attendance, framework hygiene, project history, and a self-assessment form for the
          interview.
        </p>
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
                href={`/admin/audit/${row.profileId}`}
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
                      <Stat label="Hours logged" value={`${row.totalHours.toFixed(1)}h`} />
                      <Stat label="Tasks done" value={row.tasksDone.toString()} />
                      <Stat label="Reports" value={row.reportsTotal.toString()} />
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
