import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole, isPortalAdminRole } from '@/lib/portal-utils';
import { PortalSidebar } from '@/components/portal/portal-sidebar';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: {
    default: 'Client Portal | Qualia Solutions',
    template: '%s | Client Portal',
  },
  description: 'Your project portal, powered by Qualia Solutions.',
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Allow clients, admins, managers, and employees
  const userRole = await getUserRole(user.id);
  if (
    !userRole ||
    (userRole !== 'client' && userRole !== 'employee' && !isPortalAdminRole(userRole))
  ) {
    redirect('/');
  }

  // Get user profile for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, role')
    .eq('id', user.id)
    .single();

  const isAdminViewing = isPortalAdminRole(userRole) || userRole === 'employee';
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';

  let companyName: string | null = null;
  if (!isAdminViewing) {
    const { data: mapping } = await supabase
      .from('portal_project_mappings')
      .select('erp_company_name')
      .eq('portal_client_id', user.id)
      .not('erp_company_name', 'is', null)
      .limit(1)
      .maybeSingle();
    companyName = mapping?.erp_company_name || null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PortalSidebar
        displayName={displayName}
        displayEmail={displayEmail}
        isAdminViewing={isAdminViewing}
        companyName={companyName}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin banner — floating, not a full header */}
        {isAdminViewing && (
          <div className="shrink-0 border-b border-qualia-500/10 bg-qualia-950/5 px-6 py-1.5 dark:bg-qualia-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="inline-flex items-center rounded-full border border-qualia-500/20 bg-qualia-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-qualia-700 dark:text-qualia-400">
                  Admin
                </span>
                <span className="text-muted-foreground">Viewing as client</span>
              </div>
              <Link
                href="/"
                className="text-xs font-medium text-qualia-600 transition-colors hover:text-qualia-800 dark:hover:text-qualia-300"
              >
                Exit preview
              </Link>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:px-12">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
