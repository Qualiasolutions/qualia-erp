import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole, isPortalAdminRole } from '@/lib/portal-utils';
import { PortalSidebarV2 } from '@/components/portal/portal-sidebar-v2';
import { PageTransition } from '@/components/page-transition';
import { cookies } from 'next/headers';
import { ViewAsBanner } from '@/components/portal/view-as-banner';
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
  const actualRole = await getUserRole(user.id);
  if (!actualRole) {
    redirect('/');
  }

  // Get user profile for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, role')
    .eq('id', user.id)
    .single();

  const isAdminViewing = isPortalAdminRole(actualRole);
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';

  // Check if admin is actively impersonating someone — do this BEFORE computing
  // effective role so everything downstream (nav, apps, workspace fetch) uses the
  // impersonated user's perspective.
  let viewAsUserId: string | null = null;
  let viewAsName: string | null = null;
  let viewAsRole: string | null = null;
  if (isAdminViewing) {
    const cookieStore = await cookies();
    viewAsUserId = cookieStore.get('view-as-user-id')?.value || null;
    if (viewAsUserId) {
      const { data: viewAsProfile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', viewAsUserId)
        .single();
      viewAsName = viewAsProfile?.full_name || 'Unknown';
      viewAsRole = viewAsProfile?.role || 'client';
    }
  }

  // When admin is actively impersonating, adopt the viewed user's role + id for
  // sidebar filtering, enabled-apps, workspace/client lookups, and SWR cache keys.
  const isImpersonating = !!(isAdminViewing && viewAsUserId && viewAsRole);
  const effectiveRole = isImpersonating ? (viewAsRole as string) : actualRole;
  const effectiveUserId = isImpersonating ? (viewAsUserId as string) : user.id;
  const effectiveIsInternal =
    effectiveRole === 'admin' || effectiveRole === 'manager' || effectiveRole === 'employee';

  let companyName: string | null = null;
  if (!effectiveIsInternal) {
    const { data: mapping } = await supabase
      .from('portal_project_mappings')
      .select('erp_company_name')
      .eq('portal_client_id', effectiveUserId)
      .not('erp_company_name', 'is', null)
      .limit(1)
      .maybeSingle();
    companyName = mapping?.erp_company_name || null;
  }

  // Fetch workspace ID for app config + branding (scoped to effective user)
  let workspaceId: string | null = null;
  if (effectiveIsInternal) {
    // Internal team (admin/manager/employee): get from workspace_members
    const { data: wm } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', effectiveUserId)
      .limit(1)
      .maybeSingle();
    workspaceId = wm?.workspace_id || null;
  } else {
    // Client: get workspace via their first linked project
    const { data: cp } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', effectiveUserId)
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
      effectiveIsInternal
        ? Promise.resolve({
            success: true,
            data:
              effectiveRole === 'employee'
                ? allAppKeys.filter((k) => k !== 'billing' && k !== 'clients')
                : allAppKeys,
          })
        : getEnabledAppsForClient(workspaceId, effectiveUserId),
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
        userId={effectiveUserId}
        enabledApps={enabledApps}
        branding={branding}
        userRole={effectiveRole}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* View-as banner — only shows when admin is actively impersonating someone */}
        {isAdminViewing && viewAsName && (
          <ViewAsBanner viewAsName={viewAsName} viewAsRole={viewAsRole || 'client'} />
        )}

        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
