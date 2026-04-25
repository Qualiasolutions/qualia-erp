import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Settings2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { PageHeader } from '@/components/page-header';
import { IntegrationsClient } from './integrations-client';

async function IntegrationsLoader() {
  await connection();

  // Auth + profile via request-scoped cache (shared with layout)
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await getPortalProfile(user.id);

  if (profile?.role !== 'admin') {
    redirect('/settings');
  }

  // Get user's workspace
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .single();

  const workspaceId = membership?.workspace_id;

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-500">
        No workspace found. Please contact support.
      </div>
    );
  }

  // Get integrations
  const { data: integrations } = await supabase
    .from('workspace_integrations')
    .select('provider, is_connected, last_verified_at, config')
    .eq('workspace_id', workspaceId);

  return <IntegrationsClient workspaceId={workspaceId} initialIntegrations={integrations || []} />;
}

function IntegrationsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
            </div>
            <div className="h-8 w-20 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={<Settings2 className="h-4 w-4 text-primary" />}
        iconBg="bg-primary/10"
        title="Integrations"
      >
        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          Admin Only
        </span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <Suspense fallback={<IntegrationsSkeleton />}>
            <IntegrationsLoader />
          </Suspense>

          {/* Help Section */}
          <div className="rounded-2xl border border-border bg-muted/30 p-6">
            <h3 className="text-sm font-semibold text-foreground">How it works</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>GitHub:</strong> Creates a new repository from your template when a project
                is created
              </li>
              <li>
                <strong>Vercel:</strong> Creates a project linked to the GitHub repo with
                auto-deploy
              </li>
              <li>
                <strong>Zoho:</strong> Creates invoices and manages client contacts
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Provisioning happens automatically when you create a project. SEO and Ads projects
              don&apos;t require external resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
