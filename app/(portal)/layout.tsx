import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole } from '@/lib/portal-utils';
import {
  getPortalAuthUser,
  getPortalProfile,
  getViewAsCookieId,
  getClientPrimaryLogo,
} from '@/lib/portal-cache';
import { QualiaSidebar } from '@/components/portal/qualia-sidebar';
import { PageTransition } from '@/components/page-transition';
import { ViewAsBanner } from '@/components/portal/view-as-banner';
import { ClockGateProvider } from '@/components/clock-gate-provider';
import { getEnabledAppsForClient, getPortalBranding } from '@/app/actions/portal-admin';

export const metadata: Metadata = {
  title: {
    default: 'Portal | Qualia Solutions',
    template: '%s | Portal',
  },
  description: 'Your project portal, powered by Qualia Solutions.',
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // H9 (OPTIMIZE.md): this layout previously fired 5–7 sequential DB queries
  // before any HTML streamed (auth → getUserRole → profile → viewAs → workspace
  // → apps+branding). Collapsed to 3 sequential waits by:
  //   1) reading `role` from a single profile select (drops the separate
  //      getUserRole round-trip)
  //   2) batching real profile + viewAs profile in parallel (cookie read is
  //      fast, so we speculatively fire the viewAs query)
  //   3) batching workspace lookup + companyName in parallel
  //   4) apps + branding already parallel
  //
  // H10 (OPTIMIZE.md): all user/profile fetches route through lib/portal-cache.ts
  // so app/(portal)/page.tsx can hit the same React.cache() entries and skip
  // its own auth + profile + viewAs chain.
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Parallel batch 1: view-as cookie read + real profile fetch.
  // Both are async in Next 16 but independent, so running them inside one
  // Promise.all overlaps the cookie header parse with the profile select.
  const [viewAsCookieId, profile] = await Promise.all([
    getViewAsCookieId(),
    getPortalProfile(user.id),
  ]);

  const actualRole = profile?.role || null;
  if (!actualRole) {
    redirect('/');
  }

  const isAdminViewing = isPortalAdminRole(actualRole);

  // Only honor the viewAs cookie when the actual user is an admin/manager.
  // Fetching the viewAs profile happens here (still cached via portal-cache)
  // so non-admin users with a stale cookie pay zero DB cost.
  const viewAsProfile =
    isAdminViewing && viewAsCookieId ? await getPortalProfile(viewAsCookieId) : null;

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';

  const viewAsUserId = viewAsProfile ? viewAsCookieId : null;
  const viewAsName = viewAsProfile?.full_name || null;
  const viewAsRole = viewAsProfile?.role || null;

  // When admin is actively impersonating, adopt the viewed user's role + id for
  // sidebar filtering, enabled-apps, workspace/client lookups, and SWR cache keys.
  const isImpersonating = !!(isAdminViewing && viewAsUserId && viewAsRole);
  const effectiveRole = isImpersonating ? (viewAsRole as string) : actualRole;
  const effectiveUserId = isImpersonating ? (viewAsUserId as string) : user.id;
  const effectiveIsInternal = effectiveRole === 'admin' || effectiveRole === 'employee';

  // Workspace lookup only. companyName now comes from profiles.full_name
  // (already resolved as `displayName` above) — the CRM's erp_company_name
  // was stale/mismatched for rebranded clients (e.g. "Alecci Media" for
  // Underdog Sales, "Mr. Morees Abawi" for Vero Models).
  const supabase = await createClient();
  const workspaceResult = effectiveIsInternal
    ? await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('profile_id', effectiveUserId)
        .limit(1)
        .maybeSingle()
    : await supabase
        .from('client_projects')
        .select('projects!inner(workspace_id)')
        .eq('client_id', effectiveUserId)
        .limit(1)
        .maybeSingle();

  let workspaceId: string | null = null;
  if (effectiveIsInternal) {
    workspaceId = (workspaceResult.data as { workspace_id?: string } | null)?.workspace_id || null;
  } else {
    // Normalize the `projects` FK — Supabase returns it as object or array
    // depending on the relationship metadata.
    const cpRow = workspaceResult.data as {
      projects: { workspace_id: string } | { workspace_id: string }[] | null;
    } | null;
    const proj = cpRow?.projects
      ? Array.isArray(cpRow.projects)
        ? cpRow.projects[0]
        : cpRow.projects
      : null;
    workspaceId = proj?.workspace_id || null;
  }

  const companyName = effectiveIsInternal ? null : displayName;

  // Fetch enabled apps and branding in parallel
  const allAppKeys = [
    'home',
    'projects',
    'tasks',
    'activity',
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
              effectiveRole === 'admin'
                ? allAppKeys
                : allAppKeys.filter((k) => k !== 'billing' && k !== 'clients'),
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

  // For client users, resolve their primary project's logo so the sidebar
  // avatar shows their brand mark instead of a letter. Cached via React
  // so the /portal page can reuse the same result without re-querying.
  const userLogoUrl = !effectiveIsInternal ? await getClientPrimaryLogo(effectiveUserId) : null;

  return (
    <ClockGateProvider userRole={effectiveRole}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>
        <QualiaSidebar
          displayName={displayName}
          displayEmail={displayEmail}
          isAdminViewing={isAdminViewing}
          isImpersonating={isImpersonating}
          companyName={companyName}
          userId={effectiveUserId}
          enabledApps={enabledApps}
          branding={branding}
          userRole={effectiveRole}
          userLogoUrl={userLogoUrl}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* View-as banner — only shows when admin is actively impersonating someone */}
          {isAdminViewing && viewAsName && (
            <ViewAsBanner viewAsName={viewAsName} viewAsRole={viewAsRole || 'client'} />
          )}

          <main
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </ClockGateProvider>
  );
}
