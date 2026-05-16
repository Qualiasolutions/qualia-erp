import { redirect } from 'next/navigation';

export default async function LegacyAuditDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/people/${id}?tab=audit`);
}
