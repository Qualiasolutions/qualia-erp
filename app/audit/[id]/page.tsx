import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';

import { getAuditExam } from '@/app/actions/employee-audit';
import { isUserAdmin } from '@/app/actions/shared';
import { AuditExamView } from '@/components/employee-audit/audit-detail-client';
import { getPortalAuthUser } from '@/lib/portal-cache';

export const metadata: Metadata = {
  title: 'Capability audit | Qualia',
  robots: { index: false, follow: false },
};

export default async function EmployeeAuditPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();

  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');

  const { id } = await params;
  const audit = await getAuditExam(id);
  if (!audit) notFound();

  const canWritePrivateNotes = await isUserAdmin(user.id);

  return <AuditExamView audit={audit} canWritePrivateNotes={canWritePrivateNotes} />;
}
