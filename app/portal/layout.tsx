import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/portal-utils';
import { PortalSidebar } from '@/components/portal/portal-sidebar';
import { PageTransition } from '@/components/page-transition';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Allow clients and admins (admins get preview/oversight access)
  const userRole = await getUserRole(user.id);
  if (!userRole || (userRole !== 'client' && userRole !== 'admin')) {
    redirect('/');
  }

  // Get user profile for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, role')
    .eq('id', user.id)
    .single();

  const isAdminViewing = userRole === 'admin';
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
        {/* Minimal top bar for mobile spacing + theme toggle */}
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border/40 px-4 md:px-6">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
