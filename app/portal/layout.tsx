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

  // Allow clients and admins
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
    <div className="flex h-full overflow-hidden bg-background transition-colors duration-200">
      <PortalSidebar
        displayName={displayName}
        displayEmail={displayEmail}
        isAdminViewing={isAdminViewing}
        companyName={companyName}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin banner — floating, not a full header */}
        {isAdminViewing && (
          <div className="shrink-0 border-b border-l-2 border-primary/[0.08] border-l-primary/30 bg-primary/[0.03] px-6 py-1.5 dark:border-primary/[0.12] dark:bg-primary/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-qualia-700 dark:text-primary">
                  {userRole === 'admin' ? 'Admin' : 'Manager'}
                </span>
                <span className="text-muted-foreground">Viewing as client</span>
              </div>
              <Link
                href="/"
                className="text-xs font-medium text-primary transition-colors hover:text-qualia-800 dark:hover:text-qualia-300"
              >
                Exit preview
              </Link>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="px-[clamp(1.5rem,4vw,3rem)] py-[clamp(1.5rem,3vw,2.5rem)]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
