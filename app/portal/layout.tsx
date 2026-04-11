import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole, isPortalAdminRole } from '@/lib/portal-utils';
import { PortalSidebarV2 } from '@/components/portal/portal-sidebar-v2';
import { PageTransition } from '@/components/page-transition';
import { AdminPortalBanner } from '@/components/portal/admin-portal-banner';
import { getEnabledAppsForClient, getPortalBranding } from '@/app/actions/portal-admin';

export const metadata: Metadata = {
  title: {
    default: 'Portal | Qualia Solutions',
    template: '%s | Portal',
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

  // Allow all authenticated roles: admin, manager, employee, client
  const userRole = await getUserRole(user.id);
  if (!userRole) {
    redirect('/');
  }

  // Get user profile for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, role')
    .eq('id', user.id)
    .single();

  const isAdminViewing = isPortalAdminRole(userRole);
  const isInternalUser = userRole === 'admin' || userRole === 'manager' || userRole === 'employee';
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';

  let companyName: string | null = null;
  if (!isInternalUser) {
    const { data: mapping } = await supabase
      .from('portal_project_mappings')
      .select('erp_company_name')
      .eq('portal_client_id', user.id)
      .not('erp_company_name', 'is', null)
      .limit(1)
      .maybeSingle();
    companyName = mapping?.erp_company_name || null;
  }

  // Fetch workspace ID for app config + branding
  let workspaceId: string | null = null;
  if (isInternalUser) {
    // Internal team (admin/manager/employee): get from workspace_members
    const { data: wm } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();
    workspaceId = wm?.workspace_id || null;
  } else {
    // Client: get workspace via their first linked project
    const { data: cp } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', user.id)
      .limit(1)
      .maybeSingle();
    if (cp?.project_id) {
      const { data: proj } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', cp.project_id)
        .single();
      workspaceId = proj?.workspace_id || null;
    }
  }

  // Fetch enabled apps and branding in parallel
  const allAppKeys = [
    'home',
    'projects',
    'messages',
    'files',
    'billing',
    'requests',
    'settings',
    'inbox',
    'schedule',
    'knowledge',
    'research',
    'clients',
    'status',
  ];
  let enabledApps = allAppKeys;
  let branding: {
    company_name?: string | null;
    logo_url?: string | null;
    accent_color?: string | null;
  } | null = null;

  if (workspaceId) {
    const [appsResult, brandingResult] = await Promise.all([
      isInternalUser
        ? Promise.resolve({
            success: true,
            data: userRole === 'employee' ? allAppKeys.filter((k) => k !== 'billing') : allAppKeys,
          })
        : getEnabledAppsForClient(workspaceId, user.id),
      getPortalBranding(workspaceId),
    ]);

    if (appsResult.success && Array.isArray(appsResult.data)) {
      enabledApps = appsResult.data as string[];
    }
    if (brandingResult.success && brandingResult.data) {
      branding = brandingResult.data as {
        company_name?: string | null;
        logo_url?: string | null;
        accent_color?: string | null;
      };
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <PortalSidebarV2
        displayName={displayName}
        displayEmail={displayEmail}
        isAdminViewing={isAdminViewing}
        companyName={companyName}
        userId={user.id}
        enabledApps={enabledApps}
        branding={branding}
        userRole={userRole}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin banner with view-as trigger */}
        {isAdminViewing && <AdminPortalBanner userRole={userRole!} />}

        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
