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
  if (!(await isUserAdmin(user.id))) redirect('/');

  const { id } = await params;
  const audit = await getEmployeeAudit(id);
  if (!audit) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/audit"
          className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to all employees
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          Hidden surface · admin only
        </span>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[clamp(1.75rem,1.4rem+1.7vw,2.5rem)] font-semibold tracking-tight">
            {audit.overview.fullName ?? 'Employee'}
          </h1>
          <Link
            href={`/audit/${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ClipboardList className="size-3.5" />
            Open the form
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{audit.overview.email}</p>
      </header>

      <AuditDeepView audit={audit} profileId={id} />
    </div>
  );
}
