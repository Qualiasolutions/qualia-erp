import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { canAccessProject } from '@/lib/portal-utils';
import { PortalProjectContent } from './portal-project-content';

interface PortalProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalProjectPage({ params }: PortalProjectPageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verify client has access to this project
  const hasAccess = await canAccessProject(user.id, projectId);
  if (!hasAccess) {
    redirect('/portal');
  }

  // Fetch user profile for role detection
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole =
    profile?.role === 'admin' || profile?.role === 'employee' ? profile.role : 'client';

  return <PortalProjectContent projectId={projectId} userRole={userRole} currentUserId={user.id} />;
}
