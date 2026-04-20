import { redirect } from 'next/navigation';

export default function AdminAssignmentsPage() {
  redirect('/admin?tab=team');
}
