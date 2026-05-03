import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { ArrowLeft } from 'lucide-react';

import { getPortalAuthUser } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';
import { getEmployeeAudit } from '@/app/actions/employee-audit';
import { AuditDetailView } from './audit-detail-client';

export const metadata: Metadata = {
  title: 'Performance audit | Qualia',
};

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  if (!(await isUserAdmin(user.id))) redirect('/');

  const { id } = await params;
  const audit = await getEmployeeAudit(id);
  if (!audit) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <Link
        href="/admin/audit"
        className="inline-flex items-center gap-2 self-start text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to audit index
      </Link>
      <AuditDetailView audit={audit} />
    </div>
  );
}
