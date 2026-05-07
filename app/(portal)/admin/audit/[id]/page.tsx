import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Performance audit | Qualia',
};

// Admins land on the deep view by default; the form is at /audit/[id]
export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/audit/${id}/deep`);
}
