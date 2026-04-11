import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole, isPortalAdminRole } from '@/lib/portal-utils';
import { PortalSidebarV2 } from '@/components/portal/portal-sidebar-v2';
import { ViewAsBanner } from '@/components/portal/view-as-banner';
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

  // Allow all authenticated users (clients, employees, managers, admins)
  const userRole = await getUserRole(user.id);
  if (!userRole) {
    redirect('/auth/login');
  }

  // Get user profile for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, role')
    .eq('id', user.id)
    .single();

  // --- View-as impersonation logic ---
  const cookieStore = await cookies();
  const viewAsUserId = cookieStore.get('view-as-user-id')?.value;

  let effectiveUserId = user.id;
  let effectiveRole = userRole;
  let effectiveDisplayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  let effectiveDisplayEmail = profile?.email || user.email || '';
  let isViewingAs = false;
  let viewAsName = '';
  let viewAsRole = '';
  const realUserRole = userRole;

  if (viewAsUserId && userRole === 'admin') {
    const { data: viewAsProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', viewAsUserId)
      .single();

    if (viewAsProfile) {
      effectiveUserId = viewAsProfile.id;
      effectiveRole = viewAsProfile.role || 'client';
      effectiveDisplayName =
        viewAsProfile.full_name || viewAsProfile.email?.split('@')[0] || 'User';
      effectiveDisplayEmail = viewAsProfile.email || '';
      isViewingAs = true;
      viewAsName = viewAsProfile.full_name || viewAsProfile.email || 'Unknown';
      viewAsRole = viewAsProfile.role || 'unknown';
    }
  }

  const isAdminViewing = isViewingAs
    ? isPortalAdminRole(effectiveRole)
    : isPortalAdminRole(userRole);
  const displayName = effectiveDisplayName;
  const displayEmail = effectiveDisplayEmail;

  // For client users, resolve company name from portal mappings
  // For admin/staff users, the company name will be passed per-page via workspace context
  let companyName: string | null = null;
  if (effectiveRole === 'client') {
    const { data: mapping } = await supabase
      .from('portal_project_mappings')
      .select('erp_company_name')
      .eq('portal_client_id', effectiveUserId)
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
        userId={effectiveUserId}
        userRole={effectiveRole}
        realUserRole={realUserRole}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {isViewingAs && <ViewAsBanner viewAsName={viewAsName} viewAsRole={viewAsRole} />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
