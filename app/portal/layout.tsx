import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole, isPortalAdminRole } from '@/lib/portal-utils';
import { PortalSidebar } from '@/components/portal/portal-sidebar';
import { PortalHeader } from '@/components/portal/portal-header';
import { PageTransition } from '@/components/page-transition';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Allow clients, admins, and managers (admins/managers get preview/oversight access)
  const userRole = await getUserRole(user.id);
  if (!userRole || (userRole !== 'client' && !isPortalAdminRole(userRole))) {
    redirect('/');
  }

  // Get user profile for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, role')
    .eq('id', user.id)
    .single();

  const isAdminViewing = isPortalAdminRole(userRole);
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PortalSidebar
        displayName={displayName}
        displayEmail={displayEmail}
        isAdminViewing={isAdminViewing}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader user={user} profile={profile} isAdminViewing={isAdminViewing} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
