import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { ArrowLeft, ClipboardList } from 'lucide-react';

import { getPortalAuthUser } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';
import { getEmployeeAudit } from '@/app/actions/employee-audit';
import { AuditDeepView } from '@/components/employee-audit/audit-deep-view';

export const metadata: Metadata = {
  title: 'Performance audit · deep view | Qualia',
  robots: { index: false, follow: false },
};

export default async function AuditDeepPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();

  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  if (!(await isUserAdmin(user.id))) redirect('/dashboard');

  const { id } = await params;
  const audit = await getEmployeeAudit(id);
  if (!audit) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/audit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Employees
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
                {audit.overview.fullName ?? 'Employee'}
              </h1>
              <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
              <p className="truncate text-sm text-muted-foreground">{audit.overview.email}</p>
            </div>
          </div>
          <Link
            href={`/audit/${id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ClipboardList className="size-3.5" />
            Form
          </Link>
        </div>
      </header>

      <AuditDeepView audit={audit} profileId={id} />
    </div>
  );
}
