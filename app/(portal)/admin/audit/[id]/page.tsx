import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Performance audit | Qualia',
};

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/audit/${id}`);
}
