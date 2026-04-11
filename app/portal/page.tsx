import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortalDashboardContent } from './portal-dashboard-content';

export default async function PortalDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || null;
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'there';
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  // Fetch company name for personalization (clients only — admins won't have one)
  let companyName: string | null = null;
  if (!isAdmin) {
    const { data: companyMapping } = await supabase
      .from('portal_project_mappings')
      .select('erp_company_name')
      .eq('portal_client_id', user.id)
      .not('erp_company_name', 'is', null)
      .limit(1)
      .maybeSingle();
    companyName = companyMapping?.erp_company_name || null;
  }

  // All users see the same portal dashboard
  return (
    <PortalDashboardContent
      clientId={user.id}
      displayName={displayName}
      companyName={companyName}
      isAdmin={isAdmin}
    />
  );
}
