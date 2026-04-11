import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole, isPortalAdminRole } from '@/lib/portal-utils';
import { AdminContent } from './admin-content';

export const metadata = {
  title: 'Portal Administration',
};

export default async function PortalAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userRole = await getUserRole(user.id);

  if (!isPortalAdminRole(userRole)) {
    redirect('/portal');
  }

  // Get workspace ID for this user
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle();

  const workspaceId = membership?.workspace_id ?? '';

  return <AdminContent workspaceId={workspaceId} userRole={userRole} />;
}
