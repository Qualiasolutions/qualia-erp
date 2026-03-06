import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmployeeAssignmentManager } from '@/components/admin/employee-assignment-manager';
import { AssignmentHistoryTable } from '@/components/admin/assignment-history-table';

export const metadata = {
  title: 'Employee Assignments - Qualia',
  description: 'Manage employee-project assignments',
};

export default async function AdminAssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="container mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Assignments</h1>
        <p className="mt-2 text-muted-foreground">
          Manage which employees are assigned to which projects
        </p>
      </div>

      <EmployeeAssignmentManager />

      <AssignmentHistoryTable />
    </div>
  );
}
