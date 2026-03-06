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

  // Get user profile for welcome message
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'there';

  return <PortalDashboardContent clientId={user.id} displayName={displayName} />;
}
