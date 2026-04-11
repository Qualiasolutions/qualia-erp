import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole, isPortalAdminRole } from '@/lib/portal-utils';
import { PortalSidebarV2 } from '@/components/portal/portal-sidebar-v2';
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

  // For client users, resolve company name from portal mappings
  // For admin users, the company name will be passed per-page via workspace context
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
      <PortalSidebarV2
        displayName={displayName}
        displayEmail={displayEmail}
        isAdminViewing={isAdminViewing}
        companyName={companyName}
        userId={user.id}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
