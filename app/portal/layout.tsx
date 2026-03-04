import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/portal-utils';
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

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader user={user} profile={profile} isAdminViewing={isAdminViewing} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="border-t border-border bg-card py-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4">
          &copy; {new Date().getFullYear()} Qualia Solutions. Need help?{' '}
          <a
            href="mailto:support@qualiasolutions.io"
            className="text-qualia-600 underline hover:text-qualia-700"
          >
            Contact Support
          </a>
        </div>
      </footer>
    </div>
  );
}
