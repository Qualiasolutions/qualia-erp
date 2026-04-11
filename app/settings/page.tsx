import { Suspense } from 'react';
import { SettingsLayout } from './settings-layout';
import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/logout-button';
import { NotificationSection } from '@/components/settings/notification-section';
import { ChevronRight, Plug } from 'lucide-react';
import Link from 'next/link';

async function AccountInfoLoader() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, job_title, location, role')
    .eq('id', user?.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-medium text-primary-foreground">
          {profile?.full_name
            ?.split(' ')
            .map((n: string) => n[0])
            .join('') || '?'}
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">{profile?.full_name || 'Unknown'}</p>
          <p className="text-sm text-muted-foreground">{profile?.job_title || 'No title'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <label className="text-sm text-muted-foreground">Email</label>
          <p className="mt-1 text-sm text-foreground">{user?.email || 'Not logged in'}</p>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Location</label>
          <p className="mt-1 text-sm text-foreground">{profile?.location || 'Not set'}</p>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Role</label>
          <p className="mt-1 text-sm capitalize text-foreground">{profile?.role || 'N/A'}</p>
        </div>
      </div>

      {/* Integrations Link (Admin Only) */}
      {isAdmin && (
        <Link
          href="/settings/integrations"
          className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Integrations</p>
              <p className="text-sm text-muted-foreground">Connect GitHub, Vercel, and Zoho</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}
    </div>
  );
}

async function getUserRoleForSettings(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return profile?.role || null;
}

function AccountInfoSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div>
        <div className="mb-1 h-4 w-12 rounded bg-muted" />
        <div className="mt-1 h-4 w-48 rounded bg-muted" />
      </div>
      <div>
        <div className="mb-1 h-4 w-16 rounded bg-muted" />
        <div className="mt-1 h-3 w-64 rounded bg-muted" />
      </div>
    </div>
  );
}

// Section content components for the sidebar layout
function AccountSection() {
  return (
    <Suspense fallback={<AccountInfoSkeleton />}>
      <AccountInfoLoader />
    </Suspense>
  );
}

function AppearanceSection() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Use the theme toggle in the header to switch between light and dark mode.
      </p>
    </div>
  );
}

function DangerZoneSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground">Sign Out</p>
          <p className="text-xs text-muted-foreground">Sign out of your account</p>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

function NotificationsSection() {
  return <NotificationSection />;
}

const allSections = [
  { id: 'account', label: 'Account', content: <AccountSection />, adminOnly: false },
  { id: 'appearance', label: 'Appearance', content: <AppearanceSection />, adminOnly: false },
  {
    id: 'notifications',
    label: 'Notifications',
    content: <NotificationsSection />,
    adminOnly: false,
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    content: <DangerZoneSection />,
    danger: true,
    adminOnly: false,
  },
];

export default async function SettingsPage() {
  const dbRole = await getUserRoleForSettings();
  // Check for view-as cookie (admin viewing as another role)
  const cookieStore = await cookies();
  const viewAsUserId = cookieStore.get('view-as-user-id')?.value;
  let effectiveRole = dbRole;
  if (dbRole === 'admin' && viewAsUserId) {
    const supabase = await createClient();
    const { data: viewAsProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', viewAsUserId)
      .single();
    if (viewAsProfile?.role) effectiveRole = viewAsProfile.role;
  }
  const isAdmin = effectiveRole === 'admin';
  const sections = allSections
    .filter((s) => isAdmin || !s.adminOnly)
    .map((s) => ({ id: s.id, label: s.label, content: s.content, danger: s.danger }));
  return <SettingsLayout sections={sections} />;
}
